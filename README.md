# Portais da Especialização · Conexo

Repositório com os dois portais da especialização e o código compartilhado entre eles.

| Pasta | O que é |
|---|---|
| `apps/aluno` | **Portal do Aluno** — login, especialização, biblioteca, workflows, casos, produção, painel admin e da coordenação. Em construção por etapas. |
| `apps/publico` | **Portal público** (já existente) — cronograma para professores e logística. Detalhes em [`apps/publico/README.md`](apps/publico/README.md). |
| `packages/ui` | Design system Conexo: tokens (cores, fontes), componentes e ícones. |
| `packages/db` | Banco (Supabase/PostgreSQL): migrações versionadas, tipos, clientes de servidor e navegador. |
| `docs/` | Arquitetura do Portal do Aluno ([`PORTAL-DO-ALUNO-ARQUITETURA.md`](docs/PORTAL-DO-ALUNO-ARQUITETURA.md)). |

## Rodando localmente

Requer Node 20.9+.

```bash
npm install
npm run dev:aluno      # Portal do Aluno → http://localhost:3001
npm run dev:publico    # Portal público  → http://localhost:3000 (veja apps/publico/.env.example)
```

O Portal do Aluno roda sem nenhuma configuração na Etapa 1 (dados fictícios, sem login).
Para conectar o banco, copie `apps/aluno/.env.example` para `apps/aluno/.env.local` e preencha.

| Rota | O que mostra |
|---|---|
| `/` | Início do aluno (dados fictícios: mês 14 de 30, a 5 dias do Módulo 14) |
| `/cronograma`, `/modulos/14` | Especialização: cronograma completo e página do módulo |
| `/admin` | Painel administrativo (estrutura) |
| `/design` | Catálogo do design system |
| `/api/saude` | Saúde do app e do banco (`nao-configurado` enquanto não houver Supabase) |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint em todos os pacotes |
| `npm run typecheck` | TypeScript em todos os pacotes |
| `npm test` | Testes (Vitest) de todos os pacotes |
| `npm run build` | Build de produção dos dois portais |
| `DATABASE_URL=… npm run db:test` | Aplica as migrações num PostgreSQL vazio e confere RLS e `health()` |

A CI (`.github/workflows/ci.yml`) roda tudo isso a cada push, com um PostgreSQL 16 de serviço.

## Banco (Supabase)

- Migrações em `packages/db/supabase/migrations/` (SQL puro, em ordem). Nunca editar uma migração já aplicada:
  criar uma nova.
- Toda tabela nasce com **RLS ligada**. A chave secreta (service role) nunca usa o prefixo `NEXT_PUBLIC_`.
- Tipos: `SUPABASE_PROJECT_ID=… npm run types -w @portal/db` (Supabase CLI) quando o projeto existir.

## Deploy (Vercel)

Dois projetos na Vercel, apontando para o mesmo repositório:

| Projeto | Root Directory | Variáveis |
|---|---|---|
| Portal do Aluno | `apps/aluno` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `HEALTH_SECRET` |
| Portal público | `apps/publico` | as do `apps/publico/README.md` |
