# Portal da Especialização

> Este app fica em `apps/publico` dentro do repositório dos portais. A partir da raiz: `npm run dev:publico`,
> `npm test -w @portal/publico`. Os comandos abaixo valem rodando dentro de `apps/publico`.

Portal público de consulta da especialização em Odontologia (2027–2029).
Professores e coordenação encontram, pelo celular e em segundos, **quando é cada aula, quem participa e o que cada
módulo precisa** — sem login, sem PDF, sem grupo de WhatsApp.

```
Admin do Portal do Aluno → banco (visões públicas, só leitura) ─┐
                                                                ├→ servidor → dados públicos → cache (60 s) → portal
Google Sheets (privada, logística) → leitura por whitelist ─────┘
```

**Desde a Etapa 3:** cronograma, módulos e professores vêm **somente** do banco do Portal do Aluno (editados no
Admin). O portal lê três visões públicas (`public_modules`, `public_schedule`, `public_teachers`) com a chave
pública; alunos, observações internas, equipe interna e dados administrativos nunca chegam aqui. Materiais, estoque
e equipamentos continuam na planilha. A área `/coordenacao` edita só a logística. As abas MÓDULOS, AULAS e
PROFESSORES da planilha não são mais lidas (a coluna E-mail de PROFESSORES ainda libera o login da área de edição).

- Arquitetura e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- Guia da planilha para a coordenação: [`docs/PLANILHA.md`](docs/PLANILHA.md)

## Stack

- **Next.js 16** (App Router, Server Components) + **TypeScript** estrito
- **Tailwind CSS 4** com tokens do design system em `src/app/globals.css`
- **Zod** para validar linhas da planilha e os DTOs públicos
- **google-auth-library** + API REST do Google Sheets (Service Account, somente leitura)
- **Vitest** para os testes
- Leitura do banco do Portal do Aluno (Supabase) pela API REST, só nas visões públicas
- Login Google apenas na área de edição de logística (`/coordenacao`)

## Rodando localmente

Requer Node 20+.

```bash
npm install
cp .env.example .env.local   # DATA_SOURCE=preview já vem configurado
npm run dev                  # http://localhost:3000
```

Fontes de dados para desenvolvimento (mesmo formato bruto da API do Google, então todo o pipeline real é exercitado):

- `DATA_SOURCE=preview` — a **grade atual da planilha**, convertida sem deduções (`docs/migracao/*.csv` +
  `fixtures/preview/*.csv`). Faixa "Prévia" no topo.
- `DATA_SOURCE=mock` — dados **fictícios** de `fixtures/workbook.ts`, usados nos testes (faixa "Dados de demonstração").

Ambas são recusadas em produção.

### Prévia navegável em um único arquivo

Para avaliar o portal sem servidor (ex.: publicar como página privada):

```bash
DATA_SOURCE=preview npm run build
DATA_SOURCE=preview PORT=3100 npm start &     # em outro terminal
npm run preview:build                          # gera preview/portal-previa.html
```

O arquivo contém o HTML renderizado pelo próprio portal, o CSS, as fontes e o mesmo JavaScript de filtros e busca
(`src/client`), com navegação por `#`.

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes (privacidade, transformação, datas, busca, filtros, migração) |
| `npm run typecheck` | checagem de tipos |
| `npm run lint` | ESLint |
| `npm run build && npm start` | build e servidor de produção |

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATA_SOURCE` | sim | `preview` (grade atual, sem deduções), `mock` (fictícios) ou `sheets` (planilha real). `preview` e `mock` são **recusados em produção**. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | com `sheets` | ID da planilha (trecho da URL entre `/d/` e `/edit`). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | com `sheets` | E-mail da Service Account. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | com `sheets` | Chave privada (campo `private_key` do JSON). `\n` literais são aceitos. |
| `REVALIDATE_SECRET` | recomendada | Segredo (≥ 16 caracteres) para `/api/revalidar` e `/api/saude`. Gere com `openssl rand -hex 32`. |
| `PORTAL_INDEXING` | não | `noindex` (padrão) ou `index`. |
| `PORTAL_BASE_URL` | não | URL pública, usada em metadados e sitemap. |

Nenhuma dessas variáveis usa o prefixo `NEXT_PUBLIC_` — **nada disso chega ao navegador**.

## Área de edição (`/coordenacao`)

Professores e coordenação atualizam módulos, aulas, professores, materiais, estoque e equipamentos pelo portal;
cada alteração é **gravada direto na planilha** e aparece no portal público na hora.

- **Quem entra:** e-mails em `ADMIN_EMAILS` (coordenação) e os e-mails da coluna **E-mail** da aba PROFESSORES.
  Ninguém é cadastrado duas vezes. A coluna E-mail continua privada: é lida só no servidor para conferir o login.
- **Quem edita o quê:** hoje todos editam tudo (`canEdit` em `src/config/editing.ts`).
- **Garantias:**
  - só colunas declaradas em `src/config/editing.ts` são gravadas; colunas internas nunca são lidas nem alteradas;
  - só os campos que a pessoa alterou são gravados;
  - se a linha mudou na planilha depois que o formulário foi aberto, nada é gravado (aviso de conflito);
  - cada alteração vai para a aba **HISTÓRICO** (data, pessoa, ação, aba, ID, antes → depois);
  - linhas ganham uma coluna **ID** para serem encontradas mesmo se a planilha for reordenada;
  - aulas e módulos "removidos" viram Status **Rascunho** (somem do portal, continuam na planilha);
    materiais, estoque, equipamentos e professores são apagados, com os dados guardados no HISTÓRICO;
  - acesso conferido de novo a cada gravação: quem sai da aba PROFESSORES perde o acesso na hora.
- **Teste local sem Google:** `AUTH_DEV_EMAIL=teste@exemplo.com` + `DATA_SOURCE=preview`. As alterações ficam só na
  memória do servidor (somem ao reiniciar). Desligado em produção.

## Configurando o Google Sheets

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (gratuito).
2. **APIs e serviços → Biblioteca → Google Sheets API → Ativar.**
3. **IAM e administrador → Contas de serviço → Criar conta de serviço.** Não precisa de papel no projeto.
4. Na conta criada: **Chaves → Adicionar chave → JSON.** Guarde o arquivo em local seguro (nunca no repositório).
5. Na planilha: **Compartilhar** com o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`) como **Editor**
   (necessário para a área de edição). A planilha continua privada para o resto do mundo.
6. Preencha as variáveis `GOOGLE_*` e `DATA_SOURCE=sheets`.
7. Login da área de edição: **APIs e serviços → Tela de permissão OAuth** (tipo Externo, escopos `openid` e `email`) e
   **Credenciais → Criar ID do cliente OAuth → Aplicativo da Web**, com o URI de redirecionamento
   `https://SEU-DOMINIO/api/auth/retorno`. Preencha `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `SESSION_SECRET` e `ADMIN_EMAILS`.

A leitura do portal público usa só `spreadsheets.readonly`; a gravação (área de edição) usa `spreadsheets`.

## Estrutura esperada da planilha

Resumo (detalhes em [`docs/PLANILHA.md`](docs/PLANILHA.md)):

| Aba | Crítica? | Colunas lidas |
|---|---|---|
| `MÓDULOS` | sim | Módulo · Mês previsto · Data início · Data fim · Tema principal · Descrição · Status |
| `AULAS` | sim | Módulo · Dia do módulo · Data · Início · Fim · Período · Tema da aula · Descrição · Tipo · Professor(es) · Observações públicas · Status |
| `PROFESSORES` | não | Professor · Apelidos · Especialidade / tema · Bio curta |
| `MATERIAIS POR MÓDULO` | não | Módulo · Tema / Aula · Professor · Material · Marca / Especificação · Qtd. necessária |
| `ESTOQUE` | não | Material · Categoria · Marca / Especificação · Unidade · Estoque atual · Estoque mínimo · Última atualização |
| `EQUIPAMENTOS` | não | Equipamento · Categoria · Módulo · Qtd. necessária · Qtd. disponível |

Se uma aba **crítica** falhar, o portal continua exibindo a última versão válida. Se uma aba não crítica
falhar, só aquela seção fica vazia.

## Deploy (Vercel)

1. Importe o repositório na Vercel (framework detectado automaticamente).
2. Em **Settings → Environment Variables**, cadastre as variáveis acima para **Production**
   (e, se quiser, **Preview** com `DATA_SOURCE=mock` para revisar mudanças com dados fictícios).
   Em produção são obrigatórias `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (chave **pública** do projeto
   Supabase do Portal do Aluno).
   A chave privada pode ser colada inteira, com as quebras de linha.
3. Deploy. Depois, em **Settings → Domains**, adicione o domínio desejado e configure o DNS indicado.
4. Teste: `curl -H "Authorization: Bearer $REVALIDATE_SECRET" https://SEU-DOMINIO/api/saude`.

Observação: o plano gratuito (Hobby) da Vercel é para uso não comercial; para a especialização, avalie o plano Pro.

## Atualização dos dados e cache

- Os dados da planilha ficam em cache por **5 minutos** (`src/config/cache.ts` → `revalidateSeconds`).
  Se mudar esse valor, altere também `export const revalidate = 300` nas páginas (`src/app/**/page.tsx` e `src/app/sitemap.ts`) —
  o Next exige um número literal ali.
- Todas as páginas são estáticas (regeneradas a cada 5 minutos). Filtros e busca rodam no navegador sobre os dados
  públicos já presentes na página, com o estado na URL (`?ano=2027&professor=…`).
- **Forçar atualização agora:**
  ```bash
  curl -X POST https://SEU-DOMINIO/api/revalidar -H "Authorization: Bearer $REVALIDATE_SECRET"
  ```
- **Diagnóstico** (última sincronização, contagens e problemas por aba/linha — sem valores):
  ```bash
  curl https://SEU-DOMINIO/api/saude -H "Authorization: Bearer $REVALIDATE_SECRET"
  ```
- Opcional — botão na própria planilha (Extensões → Apps Script):
  ```js
  function onOpen() {
    SpreadsheetApp.getUi().createMenu('Portal').addItem('Atualizar agora', 'atualizarPortal').addToUi()
  }
  function atualizarPortal() {
    const secret = PropertiesService.getScriptProperties().getProperty('REVALIDATE_SECRET')
    UrlFetchApp.fetch('https://SEU-DOMINIO/api/revalidar', { method: 'post', headers: { Authorization: 'Bearer ' + secret } })
    SpreadsheetApp.getUi().alert('Portal atualizado.')
  }
  ```
  (guarde o segredo em Configurações do projeto → Propriedades do script, nunca no código).

## Como publicar um campo novo

Por padrão **nenhuma coluna é pública**. Para publicar, por exemplo, "Local" dos equipamentos:

1. `src/config/sheets.ts` → adicione `location: { headers: ['Local'] }` na aba `equipment`.
2. `src/schemas/rows.ts` → adicione `location: optionalText` ao `equipmentRowSchema`.
3. `src/schemas/public.ts` → adicione `location: z.string().nullable()` ao `PublicEquipmentSchema`.
4. `src/server/data/pipeline/assemble.ts` → preencha `location: row.location` no mapeamento.
5. Exiba o campo no componente (ex.: `src/features/inventory/columns.tsx`) e rode `npm test`.

Os quatro passos são intencionais: um campo só chega ao navegador se for declarado explicitamente.

## Como adicionar uma nova entidade (ex.: conteúdo acadêmico)

O tipo `PublicContentItem` e a seção "Conteúdo relacionado" do módulo já existem (hoje vazios).
Para alimentá-los por uma aba `CONTEÚDOS`:

1. Declare a aba em `src/config/sheets.ts` (colunas e se é crítica).
2. Crie o schema da linha em `src/schemas/rows.ts` e registre em `ROW_SCHEMAS`/`REQUIRED_FIELDS`.
3. Monte os objetos públicos em `assemble.ts` e inclua no `PublicDataset` em `build.ts`.
4. Acrescente linhas fictícias em `fixtures/workbook.ts` (com uma coluna privada "SENTINELA") e testes.

## Estrutura do código

```
src/
  app/                 rotas (páginas finas: buscam dados e compõem)
  components/          design system (ui/), layout, busca, filtros, lista de dados
  features/            componentes por domínio (módulos, professores, operação)
  client/              JavaScript do navegador: filtros, busca, menu (sem framework; também usado pela prévia)
  lib/                 regras puras: texto, datas, filtros, busca, domínio (disponibilidade, seletores)
  schemas/             Zod: linhas da planilha e DTOs públicos
  server/data/         fonte (Google/mock), pipeline (ler → validar → montar), repositório com cache
  config/              site, cache, abas/colunas, vocabulários, navegação, SEO
fixtures/              planilha fictícia (testes) e estado atual das abas existentes (prévia)
scripts/               gerador da prévia navegável em arquivo único
docs/                  arquitetura, guia da planilha, CSVs de migração
tests/                 testes
```

## Indexação

Por padrão o portal **não é indexado** (`robots.txt` bloqueia, meta `noindex` e cabeçalho `X-Robots-Tag`).
Para permitir, defina `PORTAL_INDEXING=index` — nenhuma mudança de código.
