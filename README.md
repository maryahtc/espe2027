# Portal da Especialização

Portal público de consulta da especialização em Odontologia (2027–2029).
Professores e coordenação encontram, pelo celular e em segundos, **quando é cada aula, quem participa e o que cada
módulo precisa** — sem login, sem PDF, sem grupo de WhatsApp.

```
Google Sheets (privada) → servidor (leitura por whitelist + validação) → dados públicos → cache → portal
```

A **planilha é a fonte oficial**. O portal apenas lê; nada é cadastrado duas vezes.

- Arquitetura e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- Guia da planilha para a coordenação: [`docs/PLANILHA.md`](docs/PLANILHA.md)

## Stack

- **Next.js 16** (App Router, Server Components) + **TypeScript** estrito
- **Tailwind CSS 4** com tokens do design system em `src/app/globals.css`
- **Zod** para validar linhas da planilha e os DTOs públicos
- **google-auth-library** + API REST do Google Sheets (Service Account, somente leitura)
- **Vitest** para os testes
- Sem banco de dados, sem autenticação.

## Rodando localmente

Requer Node 20+.

```bash
npm install
cp .env.example .env.local   # DATA_SOURCE=mock já vem configurado
npm run dev                  # http://localhost:3000
```

Com `DATA_SOURCE=mock`, o portal usa as fixtures de `fixtures/workbook.ts` (dados **fictícios**, com uma faixa
"Dados de demonstração" no topo). Os mocks têm o mesmo formato bruto da API do Google, então todo o pipeline
real é exercitado.

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
| `DATA_SOURCE` | sim | `mock` (desenvolvimento) ou `sheets` (planilha real). `mock` é **recusado em produção**. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | com `sheets` | ID da planilha (trecho da URL entre `/d/` e `/edit`). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | com `sheets` | E-mail da Service Account. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | com `sheets` | Chave privada (campo `private_key` do JSON). `\n` literais são aceitos. |
| `REVALIDATE_SECRET` | recomendada | Segredo (≥ 16 caracteres) para `/api/revalidar` e `/api/saude`. Gere com `openssl rand -hex 32`. |
| `PORTAL_INDEXING` | não | `noindex` (padrão) ou `index`. |
| `PORTAL_BASE_URL` | não | URL pública, usada em metadados e sitemap. |

Nenhuma dessas variáveis usa o prefixo `NEXT_PUBLIC_` — **nada disso chega ao navegador**.

## Configurando o Google Sheets

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (gratuito).
2. **APIs e serviços → Biblioteca → Google Sheets API → Ativar.**
3. **IAM e administrador → Contas de serviço → Criar conta de serviço.** Não precisa de papel no projeto.
4. Na conta criada: **Chaves → Adicionar chave → JSON.** Guarde o arquivo em local seguro (nunca no repositório).
5. Na planilha: **Compartilhar** com o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`) como **Leitor**.
   A planilha continua privada para o resto do mundo.
6. Preencha as variáveis `GOOGLE_*` e `DATA_SOURCE=sheets`.

O portal pede só a permissão `spreadsheets.readonly` e só as 6 abas que usa.

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
   A chave privada pode ser colada inteira, com as quebras de linha.
3. Deploy. Depois, em **Settings → Domains**, adicione o domínio desejado e configure o DNS indicado.
4. Teste: `curl -H "Authorization: Bearer $REVALIDATE_SECRET" https://SEU-DOMINIO/api/saude`.

Observação: o plano gratuito (Hobby) da Vercel é para uso não comercial; para a especialização, avalie o plano Pro.

## Atualização dos dados e cache

- Os dados da planilha ficam em cache por **5 minutos** (`src/config/cache.ts` → `revalidateSeconds`).
  Se mudar esse valor, altere também `export const revalidate = 300` nas páginas estáticas
  (`src/app/page.tsx`, `src/app/modulos/[slug]/page.tsx`, `src/app/professores/[slug]/page.tsx`, `src/app/sitemap.ts`) —
  o Next exige um número literal ali.
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
  lib/                 regras puras: texto, datas, filtros, busca, domínio (disponibilidade, seletores)
  schemas/             Zod: linhas da planilha e DTOs públicos
  server/data/         fonte (Google/mock), pipeline (ler → validar → montar), repositório com cache
  config/              site, cache, abas/colunas, vocabulários, navegação, SEO
fixtures/              planilha fictícia (somente dev/teste)
docs/                  arquitetura, guia da planilha, CSVs de migração
tests/                 testes
```

## Indexação

Por padrão o portal **não é indexado** (`robots.txt` bloqueia, meta `noindex` e cabeçalho `X-Robots-Tag`).
Para permitir, defina `PORTAL_INDEXING=index` — nenhuma mudança de código.
