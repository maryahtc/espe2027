# Regressões E2E do Portal do Aluno

Testes ponta a ponta das etapas já aprovadas, versionados no repositório para sobreviver à recriação do ambiente.

> ⚠ **Só ambiente local.** O runner aborta se o banco, a API ou o portal não forem `127.0.0.1`/`localhost`.
> Nunca rodar contra o Supabase de produção (regra de 07/10/2026, ver `AGENTS.md`).

## Comando único

```bash
npm run e2e                         # todas as suítes (faz o build do portal antes)
npm run e2e -- casos producao       # só as indicadas
npm run e2e -- --no-build           # reaproveita o build existente de apps/aluno
npm run e2e -- casos --verbose      # mostra todas as verificações, não só as falhas
```

Para cada suíte o runner recria o banco local (`supabase db reset --local` + `packages/db/seeds/turma-2027.sql`),
roda a suíte contra o portal em `http://localhost:3001` (`next start`) e no fim imprime o resumo. Sai com código 1 se
qualquer verificação falhar.

## Pré-requisitos (fora do repositório)

- Docker e o Supabase local iniciado: `cd packages/db && supabase start`.
- Supabase CLI: use `SUPABASE_CLI=/caminho/do/supabase`; sem ela o runner usa `npx supabase@3.1.0` (baixa sob demanda).
  A CLI não é dependência do projeto de propósito: o instalador dela baixa um binário e atrasaria o build da Vercel.
- `psql` no PATH (seeds e verificações no banco local).
- Chromium: `E2E_CHROMIUM=/caminho/do/chrome`, ou o instalado em `PLAYWRIGHT_BROWSERS_PATH` (padrão `/opt/pw-browsers`).
  O pacote `playwright-core` (sem download de navegadores) está fixado no `package.json` da raiz.
- `npm ci` na raiz.

## Credenciais e dados

- Nenhuma chave no código: o runner lê as chaves **locais** de `supabase status -o env` e as passa às suítes por variáveis
  de ambiente (`E2E_APP`, `E2E_DB`, `E2E_API`, `E2E_SECRET`).
- O runner gera `apps/aluno/.env.local` apontando para o Supabase local (arquivo ignorado pelo git). Se já existir um
  `.env.local` apontando para outro banco, o runner **aborta** em vez de sobrescrever.
- Todas as pessoas e casos são fictícios, criados pelas próprias suítes (domínios `*.local`, códigos como `J.R.N.`).

## Suítes

| Suíte | O que cobre |
|---|---|
| `home` | Início: boas-vindas, avisos (comum/importante/rascunho/outra turma/vencido), "Entendi", 390 px |
| `registro` | Registro rápido por procedimento e por dente, identificador do paciente, isolamento |
| `casos` | Meus Casos e Jornada: consultas, concluir/reabrir, excluir/restaurar, leitura da coordenação com auditoria |
| `odontograma` | Atalhos de dentes, posições → quantidade, etapa por arcada, regras de localização no banco |
| `planejamento` | Planejamento do caso: planejar, registrar a partir do plano, vínculo e comparação, desfazer, coordenação |
| `producao` | Minha Produção: indicadores pelas definições da Etapa 7, filtro por período, exclusões, acesso |
| `permissoes` | Matriz de acesso Admin/Coordenação/Aluno, isolamento entre turmas, auditoria, RLS pela API, auditoria da produção individual (Etapa 10) |
| `simulacao` | Modo de simulação: termo, registro, planejamento, produção e workflows no rascunho; nada gravado; saída |
| `workflows-editor` | Editor de Workflows (Admin e Coordenação) |
| `workflows-aluno` | Workflows do aluno, checklist, integração com o Planejamento, Simulação |
| `painel-admin` | Etapa 10 · Parte 3: painel do Admin (números = banco, regras de atenção, pendências × lembretes, tudo resolvido), "Quem vê o quê" do Perfil, 390 px |
| `visao-turma` | Etapa 10: Visão da turma/Produção da turma (agregados = soma dos alunos, filtros, turmas, ordenação), produção individual auditada, recusas, estados vazios, 390 px |

## Escrever uma suíte nova

Crie `e2e/suites/<nome>.mjs` usando `e2e/lib.mjs` (`people`, `login`, `go`, `sql`, `one`, `fingerprint`, `suite`…).
A suíte termina com `t.finish()`, que imprime `N/M passaram` (o runner lê essa linha). Ela entra sozinha no
`npm run e2e` (depois das suítes da lista `ORDER` em `e2e/run.mjs`).
