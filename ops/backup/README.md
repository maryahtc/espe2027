# Backup e recuperação do banco (Portal Conexo)

O projeto está no plano **Free** do Supabase, que **não tem backup automático** (docs: "free tier plan projects
[should] regularly export their data using `supabase db dump`"). Estes scripts fazem um backup lógico completo e
provam que ele restaura.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `backup.sh` | Gera `roles.sql`, `schema.sql`, `data.sql` (oficiais do `supabase db dump`), o histórico de migrações, a impressão digital e `SHA256SUMS`. Opcional: cifra com `age`. Só **lê** o banco. |
| `restore-test.sh` | Sobe um Supabase **isolado e vazio** (portas 55320–55329), aplica as migrações do repositório até a versão do backup, carrega os dados e exige **impressão digital idêntica**. Nunca toca em produção. |
| `fingerprint.sql` | Impressão digital: dados de todas as tabelas de `public`, colunas, políticas (inclusive Storage), funções com permissões, gatilhos, índices, permissões das tabelas, RLS, visões, tipos, buckets e objetos do Storage, contas (`auth.users`) e histórico de migrações. |
| `github-actions-backup.example.yml` | Modelo **inativo** de rotina diária no GitHub Actions (backup + teste de restauração + pacote cifrado). |

## Por que a estrutura vem das migrações, e não do `schema.sql`

Teste de 24/11/2026: restaurar o `schema.sql` do dump num projeto novo **alarga as permissões** (o dump grava só os
GRANTs, e um projeto novo do Supabase dá tudo a `anon`/`authenticated` por padrão) e **não traz as políticas do
Storage**. Resultado: 740 → 728 itens e permissões diferentes. Com a estrutura vinda das migrações do repositório e só
os dados do dump, a impressão digital volta **idêntica** (740 itens). O `schema.sql` continua no pacote como
referência (útil se o repositório não estiver disponível), mas não é o caminho de restauração.

## O que o backup NÃO contém (anotar à parte)

- Arquivos do Storage (só os metadados estão no banco; hoje não há arquivos em produção).
- Configurações do Auth (URLs de retorno, e-mails, SMTP), chaves de API e segredo JWT do projeto.
- Variáveis de ambiente da Vercel e do site público.
- Senhas de papéis customizados (não usamos).

## Rodar à mão (antes de uma publicação)

```bash
# No computador da Maryah (precisa de Docker e da Supabase CLI) — a senha nunca vai para arquivo:
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
./ops/backup/backup.sh ~/Backups/conexo-$(date +%Y%m%d)
./ops/backup/restore-test.sh ~/Backups/conexo-$(date +%Y%m%d)
```

Guardar o pacote cifrado (ou a pasta, num disco cifrado) fora do Supabase. Contém dados pessoais.
