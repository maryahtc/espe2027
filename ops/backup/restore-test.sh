#!/usr/bin/env bash
# Teste de restauração em ambiente ISOLADO (nunca toca em produção).
#
# Por que não restaurar o schema.sql do dump: o `supabase db dump` grava só os GRANTs, não a retirada das permissões
# padrão; num projeto novo do Supabase isso ALARGA as permissões (perde "visitante sem acesso", "ninguém exclui",
# restrições de funções) e não traz as políticas do Storage. Por isso a ESTRUTURA vem das migrações do repositório
# (exatas, com permissões e políticas do Storage) até a versão do backup, e só os DADOS vêm do dump.
# A impressão digital (dados + estrutura + permissões + contas + Storage + histórico) precisa ficar idêntica.
#
# Uso: ./ops/backup/restore-test.sh <pasta-do-backup>     Requisitos: Supabase CLI, Docker, psql, python3.
# Portas usadas: 55320–55329.
set -euo pipefail
B="$(cd "${1:?Informe a pasta do backup}" && pwd)"
SUPABASE="${SUPABASE_CLI:-npx --yes supabase@3.1.0}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_MIG="$(cd "$HERE/../../packages/db/supabase/migrations" && pwd)"
(cd "$B" && sha256sum -c --quiet SHA256SUMS) && echo "▸ Arquivos íntegros (SHA256SUMS)"
TMP="$(mktemp -d)"; trap '(cd "$TMP" && $SUPABASE stop --no-backup >/dev/null 2>&1 || true); rm -rf "$TMP"' EXIT
cd "$TMP" && $SUPABASE init --force >/dev/null
python3 - "$TMP/supabase/config.toml" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p).read()
s = re.sub(r'(?m)^project_id = .*$', 'project_id = "conexo-restore-test"', s)
for old, new in [("54321","55321"),("54322","55322"),("54320","55320"),("54323","55323"),("54324","55324"),("54327","55327"),("54329","55329"),("54325","55325"),("54326","55326")]:
    s = s.replace(f"port = {old}", f"port = {new}")
s = re.sub(r'(?ms)^\[db\.seed\].*?(?=^\[)', '[db.seed]\nenabled = false\n\n', s)
open(p, "w").write(s)
PY
# Migrações do repositório até a versão registrada no backup (histórico de migrações do próprio backup).
mkdir -p "$TMP/supabase/migrations"
VERSIONS="$(grep -oE '^[0-9]{14}' "$B/history_data.sql" | sort -u)"
for v in $VERSIONS; do
  f="$(ls "$REPO_MIG"/"$v"_*.sql 2>/dev/null | head -1)"
  [ -n "$f" ] || { echo "✗ Migração $v do backup não existe no repositório"; exit 1; }
  cp "$f" "$TMP/supabase/migrations/"
done
echo "▸ Estrutura: $(echo "$VERSIONS" | wc -l) migrações do repositório (até $(echo "$VERSIONS" | tail -1))"
$SUPABASE start -x studio,mailpit,imgproxy,edge-runtime,logflare,vector,supavisor,realtime >/dev/null
DB="postgresql://postgres:postgres@127.0.0.1:55322/postgres"
echo "▸ Restaurando os dados do backup"
# Esvazia exatamente as tabelas que o backup recarrega (lidas do próprio dump), para não duplicar o que as migrações
# já inserem (catálogo, temas, buckets, histórico).
TABLES="$(grep -ohE '^COPY "[a-z_]+"\."[a-z_]+"' "$B/data.sql" "$B/history_data.sql" | sed 's/^COPY //' | sort -u | paste -sd, -)"
psql "$DB" -q --single-transaction -v ON_ERROR_STOP=1 \
  -c "SET session_replication_role = replica" \
  -c "TRUNCATE $TABLES CASCADE" \
  -f "$B/data.sql" -f "$B/history_data.sql" >/dev/null
GOT="$(psql "$DB" -qAt -f "$HERE/fingerprint.sql")"
WANT="$(cat "$B/fingerprint.txt")"
echo "  backup:     $WANT"
echo "  restaurado: $GOT"
if [ "$GOT" = "$WANT" ]; then echo "✓ Restauração validada: impressão digital idêntica"; else echo "✗ Impressão digital diferente"; exit 1; fi
