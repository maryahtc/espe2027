<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regra do projeto — dados de produção (vigente desde 07/10/2026)

O Supabase de produção (`xzwdnanssqkrxkyntwes`) é a **fonte oficial** dos dados do portal. Esta regra vale
durante todo o desenvolvimento; a etapa "Proteção de produção e backups" (obrigatória antes do go-live, ver
seção M.3 de `docs/PORTAL-DO-ALUNO-ARQUITETURA.md`) vai automatizá-la, não substituí-la:

- **Não** rodar em produção: testes (`packages/db/tests/*.sql`, E2E), seeds/pré-cadastros
  (`packages/db/seeds/*`), `db reset`, nem qualquer operação destrutiva (`delete`, `truncate`, `drop`,
  `update` em massa) — mesmo dentro de transação desfeita.
- **Não** sobrescrever nem apagar dados já cadastrados lá.
- Migrações novas devem **preservar os dados existentes**: só aditivas/estruturais (novas tabelas, colunas
  com default, funções, políticas). Renomear/remover coluna ou tabela, mudar tipo com perda, ou reescrever
  dados exige autorização explícita da Maryah antes.
- Testes, seeds e E2E rodam só no ambiente local (`supabase start`) ou no Postgres do CI.
- Consultas de leitura em produção são permitidas apenas para conferir o resultado de uma migração.
