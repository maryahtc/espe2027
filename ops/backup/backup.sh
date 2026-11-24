#!/usr/bin/env bash
# Backup lógico completo do banco do Portal Conexo (plano Free do Supabase: sem backup automático).
# Gera, numa pasta nova: roles.sql, schema.sql, data.sql (oficiais do `supabase db dump`), history_schema.sql e
# history_data.sql (histórico de migrações), fingerprint.txt e SHA256SUMS. Opcional: cifra tudo com `age`.
#
# Uso:  SUPABASE_DB_URL='postgresql://…'  ./ops/backup/backup.sh [pasta-destino]
#       BACKUP_AGE_RECIPIENT='age1…'  (opcional) cifra o pacote para essa chave pública
# Requisitos: Supabase CLI, Docker (a CLI roda o pg_dump num contêiner), psql, sha256sum.
# Nunca grave a senha do banco em arquivo do repositório; use variável de ambiente ou segredo do GitHub.
set -euo pipefail
: "${SUPABASE_DB_URL:?Defina SUPABASE_DB_URL (string de conexão do banco, com senha)}"
SUPABASE="${SUPABASE_CLI:-npx --yes supabase@3.1.0}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-backup-conexo-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT" && chmod 700 "$OUT"
echo "▸ Funções e papéis";  $SUPABASE db dump --remote="$SUPABASE_DB_URL" -f "$OUT/roles.sql" --role-only
echo "▸ Estrutura";         $SUPABASE db dump --remote="$SUPABASE_DB_URL" -f "$OUT/schema.sql"
echo "▸ Dados";             $SUPABASE db dump --remote="$SUPABASE_DB_URL" -f "$OUT/data.sql" --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
echo "▸ Histórico de migrações"
$SUPABASE db dump --remote="$SUPABASE_DB_URL" -f "$OUT/history_schema.sql" --schema supabase_migrations
$SUPABASE db dump --remote="$SUPABASE_DB_URL" -f "$OUT/history_data.sql" --use-copy --data-only --schema supabase_migrations
echo "▸ Impressão digital"
psql "$SUPABASE_DB_URL" -qAt -f "$HERE/fingerprint.sql" > "$OUT/fingerprint.txt"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/created_at.txt"
(cd "$OUT" && sha256sum ./*.sql fingerprint.txt created_at.txt > SHA256SUMS)
echo "  $(cat "$OUT/fingerprint.txt")"
if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  tar -C "$(dirname "$OUT")" -czf - "$(basename "$OUT")" | age -r "$BACKUP_AGE_RECIPIENT" > "$OUT.tar.gz.age"
  rm -rf "$OUT"
  echo "✓ Backup cifrado: $OUT.tar.gz.age"
else
  echo "✓ Backup em $OUT (NÃO cifrado: contém dados pessoais; guarde em local protegido)"
fi
