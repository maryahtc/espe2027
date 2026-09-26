# Portal da Especialização — Documento Técnico (v0, para aprovação)

> Status: **proposta**. Nenhum código de aplicação foi escrito. A implementação começa após aprovação.
> Base: briefing completo + leitura da planilha real **"Cronograma Módulo Espe"** (Google Drive, 26/09/2026).

---

## 0. Diagnóstico — o que a planilha real revelou

Li todas as abas. Três achados mudam o desenho do projeto:

| # | Achado | Impacto |
|---|---|---|
| 1 | **AULAS/PROFESSORES é uma matriz visual**, não uma tabela: 3 linhas por módulo (datas / conteúdo / professores), colunas DIA 1–3, células mescladas, texto livre ("MANHA: … TARDE: …"), professores como "Maryah e Victor e Elber", "CALAMITA", "Gi Borelli". **Não há horários, tipo de aula nem tema do módulo.** | Não é possível extrair de forma confiável "aula 19/08, 14:00–18:00, tema X, prof. Y". Parsear essa matriz seria frágil e quebraria a cada edição. **É o único bloqueio estrutural** (ver decisão no final). |
| 2 | **Não existe aba de módulos** (número, datas, tema principal, status). | Precisamos de uma aba `MÓDULOS`, pequena (1 linha por módulo). |
| 3 | **MATERIAIS POR MÓDULO tem "Qtd. em estoque" e "Qtd. faltante" digitadas à mão**, duplicando a aba ESTOQUE. | Viola o princípio "cadastrar uma vez". O portal calcula a partir do ESTOQUE; essas colunas passam a ser ignoradas (ou viram fórmula, para quem usa a planilha). |

Outros achados menores:
- Módulo 4 tem data **22/05/2026** (provável erro de digitação, deveria ser 2027) — exatamente o tipo de problema que a camada de validação vai sinalizar.
- Aba PROFESSORES só tem o cabeçalho e mistura dados públicos com **Cachê, Passagem, Hotel, Chegada, Saída, Contato, E-mail, Telefone** na mesma linha — confirma a necessidade da whitelist.
- Status de EQUIPAMENTOS ("Mapear") é status de **workflow interno**, não de disponibilidade → não publicar o valor bruto; o portal calcula a disponibilidade.

---

## 1. Arquitetura

```
┌────────────────────┐
│   GOOGLE SHEETS    │  fonte oficial, privada (compartilhada só com a Service Account, leitura)
└─────────┬──────────┘
          │ 1 chamada values:batchGet (todas as abas usadas), escopo spreadsheets.readonly
┌─────────▼──────────┐
│ SheetSource        │  GoogleSheetsSource | MockSheetSource  → devolvem o MESMO formato: linhas brutas
└─────────┬──────────┘
┌─────────▼──────────┐
│ Leitura por        │  localiza colunas pelo NOME do cabeçalho (com aliases);
│ whitelist          │  colunas fora da whitelist nunca entram na memória da aplicação
└─────────┬──────────┘
┌─────────▼──────────┐
│ Normalização +     │  Zod por linha: datas, horários, números, nomes, status, listas de professores
│ validação          │  linha inválida → descartada + log (aba, linha, campo — sem valores)
└─────────┬──────────┘
┌─────────▼──────────┐
│ Montagem de domínio│  joins (aula↔professor, material↔estoque), slugs, status calculados
└─────────┬──────────┘
┌─────────▼──────────┐
│ DTOs públicos      │  PublicModule, PublicClass, PublicProfessor… (mapeadores explícitos +
│ (PublicDataset)    │  parse final com schema Zod público — "portão de saída")
└─────────┬──────────┘
┌─────────▼──────────┐
│ Cache Next.js      │  tag "portal-data", revalidação 5 min, stale-if-error
└─────────┬──────────┘
┌─────────▼──────────┐
│ Server Components  │  páginas renderizadas no servidor; client components só para busca/filtros/menu
└────────────────────┘
```

**Stack**

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js (App Router, versão estável atual) + TypeScript strict | Server Components, cache nativo, deploy trivial |
| Estilo | Tailwind CSS com tokens em CSS variables | Design system centralizado, CSS mínimo no bundle |
| Validação | Zod | Schemas de linha bruta e de DTO público |
| Google | `google-auth-library` + `fetch` na API REST v4 | Evita o pacote `googleapis` (muito pesado); só precisamos de 1 endpoint |
| Testes | Vitest | Rápido, sem configuração pesada |
| Deploy | Vercel | Integração nativa com Next e com o cache |
| Banco de dados | **Nenhum** | Não há necessidade na V1 |

**Integração Google Sheets — opções avaliadas**

| Opção | Veredito |
|---|---|
| **Sheets API + Service Account (server-side)** | ✅ **Recomendada.** Planilha continua privada; credencial só no servidor; permissão só de leitura; gratuito; cota (300 leituras/min) muito acima do uso (~1 leitura a cada 5 min). |
| "Publicar na web" como CSV | ❌ Torna a planilha inteira pública (cachê, telefones…). Descartada. |
| Apps Script como API | ❌ Mais uma peça para manter, sem ganho. |
| Chave de API + planilha pública | ❌ Mesma falha de segurança. |

---

## 2. Modelo de dados

```ts
// Datas são "datas civis" (sem fuso): "2027-08-19". Horários: "14:00".
// "Hoje" é sempre calculado em America/Sao_Paulo no servidor.

Module {
  number: number            // 7
  slug: string              // "07"
  startDate, endDate: ISODate | null
  title: string | null      // tema principal
  description: string | null
  status: 'confirmado' | 'a-confirmar'
  classIds[], professorSlugs[] (derivado das aulas), materialIds[], equipmentIds[]
  content: ContentItem[]    // V1: vazio; arquitetura pronta
}

Class {                     // "Aula"
  id: string                // estável: módulo + data + início + ordem
  moduleNumber: number
  date: ISODate
  weekday: string           // derivado da data
  start, end: HH:mm | null
  period: 'manha' | 'tarde' | 'noite' | 'integral' | null   // fallback quando não há horário
  title: string
  description: string | null
  type: 'teorica'|'laboratorial'|'clinica'|'hands-on'|'demonstracao'|'discussao-de-caso'|'outro'
  professorSlugs: string[]
  publicNotes: string | null
  status: 'confirmada' | 'a-confirmar'      // "rascunho" nunca sai do servidor
}

Professor {
  slug: string              // "joao-silva"
  name: string
  specialty: string | null
  shortBio: string | null
  // módulos, aulas e temas são DERIVADOS das aulas — nunca digitados de novo
}

MaterialRequirement {       // uma linha de MATERIAIS POR MÓDULO
  id, moduleNumber, classTitle|null, professorSlug|null
  materialKey               // chave de junção com o estoque
  name, brandSpec, required: number|null
}

InventoryItem {             // uma linha de ESTOQUE
  materialKey, name, category, brandSpec, unit
  current: number|null, minimum: number|null, updatedAt: ISODate|null
}

Equipment {
  id, name, category, moduleNumbers: number[]
  required: number|null, available: number|null
}

ContentItem {               // futuro: artigos, livros, vídeos, PDFs, links
  id, moduleNumber|null, classId|null, kind, title, url, author|null
}
```

**Relacionamentos**

```
Module 1───N Class N───N Professor
Module 1───N MaterialRequirement N───1 InventoryItem
Module N───N Equipment
Module 1───N ContentItem (futuro)
```

**Regras de negócio centralizadas** (`lib/domain/`, uma função cada, testadas):

```
materialAvailability(required, current) →
  { required, available, missing: max(0, required − available),
    status: 'ok' | 'atencao' | 'sem-dados' }

inventoryStatus(current, minimum) →
  current ≤ 0              → 'insuficiente'
  minimum e current < min  → 'baixo'
  senão                    → 'ok'     (sem dados → 'sem-dados')

equipmentStatus(required, available) → mesma lógica de materialAvailability
```

Observação sobre estoque compartilhado: se o Módulo 05 precisa de 20 e o 06 de 15, e o estoque é 25, cada módulo isolado aparece "OK", mas a soma falta. **Padrão proposto:** por módulo mostra-se a comparação isolada (como no briefing) e, na página `/materiais`, uma linha extra "demanda futura total × estoque" por material. Decisão pequena e reversível — sigo com ela salvo objeção.

---

## 3. Mapeamento da planilha

Legenda: 🟢 público · 🔒 privado (nunca lido) · ⚙️ lido só para cálculo, não publicado · ⛔ ignorado (redundante)

A leitura é por **nome do cabeçalho**, não pela letra da coluna — a coordenação pode reordenar ou inserir colunas sem quebrar o portal.

### MÓDULOS *(aba nova — 1 linha por módulo)*
| Coluna | Uso |
|---|---|
| Módulo (número) | 🟢 |
| Data início / Data fim | 🟢 (se vazias, derivadas das aulas) |
| Tema principal | 🟢 |
| Descrição | 🟢 |
| Status (Confirmado / A confirmar / Rascunho) | ⚙️ Rascunho não é publicado; "A confirmar" vira selo discreto |
| Equipe (hoje "EQUIPE TOTAL") | 🔒 na V1 — não está claro se é público (inclui coordenação/apoio) |
| Observações internas | 🔒 |

### AULAS *(aba nova, formato "longo" — 1 linha por aula; substitui a matriz AULAS/PROFESSORES como fonte)*
| Coluna | Uso |
|---|---|
| Módulo | 🟢 |
| Data | 🟢 |
| Início / Fim (HH:mm) | 🟢 opcionais |
| Período (Manhã/Tarde/Integral) | 🟢 fallback quando não há horário |
| Tema da aula | 🟢 obrigatório |
| Descrição | 🟢 |
| Tipo (lista suspensa) | 🟢 |
| Professor(es) (lista suspensa de seleção múltipla, vinda de PROFESSORES) | 🟢 |
| Observações públicas | 🟢 |
| Status (Confirmada / A confirmar / Rascunho) | ⚙️ |
| Observações internas | 🔒 |

### PROFESSORES *(aba existente)*
| Coluna | Uso |
|---|---|
| Professor | 🟢 nome completo — é a chave |
| Especialidade / tema | 🟢 |
| Bio curta *(coluna nova, opcional)* | 🟢 |
| Módulo(s), Data(s) | ⛔ derivados das AULAS (evita cadastro duplo) |
| Cidade de origem, Contato, Cachê, Passagem, Hotel, Chegada, Saída, Status, Responsável, Observações, E-mail, Telefone | 🔒 |

### MATERIAIS POR MÓDULO
| Coluna | Uso |
|---|---|
| Módulo | 🟢 |
| Tema / Aula | 🟢 (liga o material à aula, quando preenchido) |
| Professor | 🟢 (filtro por professor) |
| Material (lista suspensa vinda de ESTOQUE → chave de junção) | 🟢 |
| Marca / Especificação | 🟢 |
| Qtd. necessária | 🟢 |
| Mês, Data | ⛔ derivados do módulo |
| Qtd. em estoque, Qtd. faltante | ⛔ **calculados pelo portal a partir do ESTOQUE** |
| Empresa / parceiro, Responsável solicitação, Prazo, Status, Observações | 🔒 |

### ESTOQUE
| Coluna | Uso |
|---|---|
| Material, Categoria, Marca / Especificação, Unidade | 🟢 |
| Estoque atual, Estoque mínimo | 🟢 |
| Última atualização | 🟢 ("atualizado em …") |
| Estoque inicial, Entradas, Saídas / Consumo | ⛔ (o atual já consolida) |
| Módulo, Mês | ⛔ o vínculo com o módulo vem de MATERIAIS POR MÓDULO |
| Responsável, Observações | 🔒 |

### EQUIPAMENTOS
| Coluna | Uso |
|---|---|
| Equipamento, Categoria, Módulo, Qtd. necessária, Qtd. disponível | 🟢 |
| Já temos? | ⛔ redundante com a quantidade disponível |
| Status ("Mapear"…) | 🔒 status interno — o portal calcula a disponibilidade |
| Parceiro possível, Responsável, Prazo, Local, Observações | 🔒 |

### Abas não lidas na V1
`empresas`, `MARKETING`, `FOTO E VÍDEO`, `PENDÊNCIAS`, `DASHBOARD` — **não entram no `batchGet`**. Nada delas chega ao servidor da aplicação.

### Abas futuras (previstas, não criadas agora)
`CONTEÚDOS` (Módulo, Aula, Tipo, Título, Autor, Link, Publicar S/N) → alimenta "Conteúdo relacionado".

---

## 4. Rotas

| Rota | Conteúdo | Renderização |
|---|---|---|
| `/` | Próximo módulo + próximos módulos + busca | estática, revalidada |
| `/cronograma` | Linha do tempo + filtros (`?ano=&modulo=&professor=&tema=&tipo=`) | dinâmica sobre dados em cache |
| `/modulos/[slug]` | `/modulos/07` — programação por dia, professores, materiais, equipamentos, conteúdo | estática por módulo |
| `/modulos/[slug]?professor=joao-silva` | idem, destacando as aulas do professor | — |
| `/professores` | Lista A–Z + busca | estática |
| `/professores/[slug]` | Participações do professor | estática por professor |
| `/materiais` | Lista + filtros (`?modulo=&categoria=&professor=&status=`) | dinâmica |
| `/estoque` | Lista + filtros | dinâmica |
| `/equipamentos` | Lista + filtros | dinâmica |
| `/busca?q=` | Resultados agrupados | dinâmica |
| `POST /api/revalidar` | Força atualização (protegido por segredo) | — |
| `GET /api/saude` | Status da última sincronização + problemas por aba/linha (sem valores), protegido | — |

`robots.txt`, `sitemap.xml` e meta `robots` gerados a partir de uma única configuração (`PORTAL_INDEXING=index|noindex`).

---

## 5. Wireframes textuais (mobile, 390px)

**Cabeçalho (todas as páginas)**
```
[ESPECIALIZAÇÃO ····· 🔍  Menu]      ← fixo, compacto
Menu abre painel: Início · Cronograma · Professores
                  ── Operação ── Materiais · Estoque · Equipamentos
```
Desktop: navegação inline; "Operação" agrupada à direita. Sem bottom navigation — 3 itens principais + busca sempre visível resolvem com menos ruído.

**Home `/`**
```
┌─────────────────────────────────┐
│ O que você procura?             │
│ [Professor, módulo, tema, mat…] │
├─────────────────────────────────┤
│ PRÓXIMO MÓDULO                  │
│ MÓDULO 04                       │  ← número grande
│ 20–22 MAI 2027                  │  ← data em destaque
│ Planejamento restaurador        │  ← título editorial (serif)
│ Thiago · Victor · Maryah        │
│ [ Ver módulo → ]                │
├─────────────────────────────────┤
│ PRÓXIMOS MÓDULOS                │
│ 05  JUN 2027  Tema  · Profs  →  │
│ 06  JUL 2027  Tema  · Profs  →  │
│ 07  AGO 2027  Tema  · Profs  →  │
│ [ Ver cronograma completo ]     │
└─────────────────────────────────┘
Estados: antes do curso → Módulo 01 · após o fim → "Todos os módulos foram concluídos" · sem dados → vazio elegante
```

**Cronograma `/cronograma`** — linha do tempo vertical agrupada por ano → mês (melhor que tabela no celular; escala até ~30 módulos sem cansar):
```
[Filtros (2)]  [2027 ×] [João Silva ×]  Limpar filtros
2027 ─────────────────────────
  FEV │ 11–13 · MÓDULO 01
      │ Primeira consulta e documentação
      │ Maryah · Victor · Elber · Thiago
  MAR │ 18–20 · MÓDULO 02 …
```
Com filtro de professor/tipo/tema ativo, cada cartão se expande mostrando só as aulas que casam ("19 AGO · 14:00–18:00 · Preparos…").
Filtros no mobile: botão abre painel inferior (sheet) com selects; chips ativos ficam visíveis com ×.

**Módulo `/modulos/07`**
```
← Cronograma
MÓDULO 07
18–20 AGO 2027                           [A confirmar]? 
Reabilitação estética
Professores: João Silva · Maria Souza
[Programação] [Professores] [Materiais] [Equipamentos]   ← âncoras, não abas escondidas
─ QUINTA · 18 AGO ─────────────
08:00–10:00   Fundamentos do planejamento
              João Silva            TEÓRICA
10:30–12:00   Fotografia e análise
              Maria Souza           DEMONSTRAÇÃO
─ SEXTA · 19 AGO ──────────────
14:00–18:00   Preparos para restaurações indiretas   ← destacado se ?professor=joao-silva
              João Silva            HANDS-ON
PROFESSORES DO MÓDULO  [cartões: nome · especialidade · "19 AGO, tarde" → perfil]
MATERIAIS   [lista: material · marca · nec. 20 · disp. 8 · faltam 12 · ● Atenção]
EQUIPAMENTOS [lista idem]
CONTEÚDO RELACIONADO  "Nenhum conteúdo publicado ainda."
← Módulo 06                         Módulo 08 →
```

**Professores `/professores`**: busca "Pesquisar professor" (filtra instantaneamente) + lista A–Z com letra-índice; cada linha: nome · especialidade · "Módulos 04, 11".

**Professor `/professores/joao-silva`** — a página mais importante para o JTBD principal:
```
PROF. JOÃO SILVA
Dentística restauradora
PRÓXIMA PARTICIPAÇÃO                    ← bloco destacado
  MÓDULO 07 · 18–20 AGO 2027
  Reabilitação estética
  SUA AULA  19 AGO · 14:00–18:00
            Preparos para restaurações indiretas · Hands-on
  [ Ver módulo completo ]  → /modulos/07?professor=joao-silva
OUTRAS PARTICIPAÇÕES (cronológico)
  MÓDULO 11 · NOV 2027 · Cerâmicas →
PARTICIPAÇÕES ANTERIORES (recolhido)
Vazio: "Nenhuma participação futura cadastrada."
```

**Materiais / Estoque / Equipamentos**: desktop = tabela; mobile = lista de cartões de 3 linhas (nome+status / marca / números). Status = ponto colorido + palavra (nunca só cor).

**Busca `/busca?q=mock-up`**
```
[mock-up                    ×]
AULAS (2)       Mock-up e planejamento · Módulo 03 · 22 ABR
MÓDULOS (1)     Módulo 03 · Planejamento estético
MATERIAIS (1)   Silicone para mock-up · Módulo 03
Vazio: Nenhum resultado encontrado para "mock-up".
```

---

## 6. Busca global

- **Onde roda:** no servidor, sobre o `PublicDataset` em cache. A caixa de busca é um client component leve que atualiza `?q=` com debounce (≈200 ms); funciona também sem JavaScript (form GET). Nenhum índice de dados vai no bundle.
- **Normalização única** (`lib/text/normalize.ts`): NFD → remove diacríticos → minúsculas → remove pontuação (hífen vira espaço: "mock-up" = "mockup" = "mock up") → colapsa espaços. "João", "joao", "JOÃO" → `joao`.
- **Correspondência:** a consulta é dividida em termos; um item casa se **todos** os termos aparecem em algum de seus campos pesquisáveis (parcial: "cera" acha "cerâmica"). "silva joao" acha "João Silva".
- **Ranking:** nome exato > começa com > início de palavra > contém; empate → cronológico.
- **Campos por entidade:** Módulo (número "04"/"4"/"modulo 4", tema, descrição) · Aula (tema, descrição, tipo, professores) · Professor (nome, especialidade) · Material (nome, marca, categoria) · Equipamento (nome, categoria).
- **Resultado agrupado** por tipo, até 5 por grupo com "ver todos". Busca por professor mostra também as participações dele.
- Sem biblioteca de fuzzy search: o volume (~30 módulos, ~300 aulas, ~60 professores, ~200 materiais) não justifica.

## 7. Filtros

- Um único mecanismo (`lib/filters/`): cada página declara uma lista de `FilterSpec` (nome do parâmetro, rótulo, opções derivadas dos dados, predicado). O mesmo código faz parse da URL (Zod, valores inválidos ignorados), aplica (**E** entre filtros), gera chips e o link "Limpar filtros".
- **Estado na URL** sempre: `/cronograma?ano=2027&professor=joao-silva&tipo=hands-on` — compartilhável, funciona com voltar/avançar.
- Valores são slugs (`hands-on`, `joao-silva`), nunca texto livre, exceto `tema` (contém, normalizado).
- Opções dos selects vêm dos dados (nunca listas fixas no código), exceto Tipo e Status, que são vocabulário controlado em `config/`.

## 8. Segurança — como garantimos que campos privados nunca chegam ao browser

Defesa em camadas; qualquer uma sozinha já bloquearia o vazamento:

1. **Abas fora do escopo não são pedidas** à API (o `batchGet` lista só as 6 abas necessárias).
2. **Whitelist na leitura**: `config/sheets.ts` declara, por aba, as colunas públicas (com aliases). O leitor devolve objetos contendo **só** essas chaves; "Cachê" nunca vira propriedade de nada.
3. **DTOs explícitos**: mapeadores `toPublicProfessor()` etc. constroem objetos campo a campo (nunca `...spread` de linha).
4. **Portão de saída**: o `PublicDataset` passa por `PublicDatasetSchema.parse()` (Zod remove qualquer chave desconhecida) antes de ir para o cache.
5. **Isolamento de módulo**: todo código de dados importa `server-only` → o build falha se um client component importar o repositório ou as credenciais.
6. **Credenciais** só em variáveis de ambiente do servidor (sem prefixo `NEXT_PUBLIC_`); Service Account com papel **Leitor** na planilha e escopo `spreadsheets.readonly`.
7. **Client components recebem props mínimas** (ex.: lista de opções de filtro), nunca o dataset.
8. **Teste de regressão de privacidade**: fixture com valores-sentinela nas colunas privadas (`"CACHE_SENTINELA_123"`, telefone, e-mail…) → o teste serializa o `PublicDataset` e todas as páginas renderizadas e falha se qualquer sentinela aparecer.
9. **Logs** registram aba, número da linha e nome do campo — nunca o valor.
10. Cabeçalhos: CSP restritiva, `X-Robots-Tag` conforme configuração, sem `Access-Control-Allow-Origin` nas rotas de API.

Regra de evolução: **nova coluna na planilha é invisível por padrão.** Publicar exige adicioná-la à whitelist (1 linha em `config/sheets.ts`) + ao DTO.

## 9. Cache, atualização e resiliência

- **Uma função** `getPortalData()` faz 1 `batchGet`, normaliza e devolve o `PublicDataset`; é cacheada com tag `portal-data` e **revalidação a cada 5 min** (`config/cache.ts`).
- Todas as páginas leem dessa função → 1 leitura da planilha a cada 5 min, não importa o número de acessos.
- **Forçar atualização:** `POST /api/revalidar` com `Authorization: Bearer <REVALIDATE_SECRET>` → invalida a tag; próxima visita busca dados novos. Opcional (Fase 5): menu na própria planilha "Portal → Atualizar agora" via Apps Script de 10 linhas que chama esse endpoint.
- **Resiliência:**
  - Falha da API do Google (rede, cota, 5xx) → a função **lança erro** em vez de devolver vazio → o Next continua servindo a **última versão válida** do cache (stale-if-error) e tenta de novo no próximo ciclo.
  - Aba crítica (`MÓDULOS`, `AULAS`) ausente ou sem coluna obrigatória → também lança (melhor mostrar dados de 10 min atrás do que um cronograma vazio).
  - Aba não crítica com problema → só aquela seção fica vazia, com log.
  - Linha inválida → descartada individualmente, com log; o resto segue.
  - Falha no build de um deploy → o deploy anterior continua no ar.
  - Timeout de 8 s por chamada, 1 nova tentativa com backoff.
- `/api/saude` mostra: horário da última sincronização, contagens por entidade, e a lista de problemas ("AULAS linha 14: data fora do período do curso") — útil para a coordenação corrigir a planilha.

## 10. Datas

- Leitura com `valueRenderOption=UNFORMATTED_VALUE` e `dateTimeRenderOption=SERIAL_NUMBER`: datas chegam como número serial, sem ambiguidade de formato/idioma. Texto "19/08/2027" também é aceito (sempre DD/MM/AAAA).
- Datas guardadas como strings civis `YYYY-MM-DD`; nada de `new Date()` no navegador para interpretar datas.
- "Hoje" = data atual em `America/Sao_Paulo`, calculada no servidor.
- Formatação editorial centralizada: `15 MAI 2027`, `15–17 MAI 2027`, `30 MAI – 1 JUN 2027`, `QUINTA · 15 MAI`, `08:00`.
- Validação de sanidade: data fora do período do curso (fev/2027 – ago/2029, configurável) ou fora do intervalo do módulo → aviso (pegaria o "22/05/2026" atual).

## 11. Design system (resumo)

- **Tipografia:** títulos em serif editorial (**Newsreader**), interface e corpo em **Inter**, números tabulares para datas/horários. Auto-hospedadas via `next/font` (sem requisição externa).
- **Hierarquia:** Data (sans, peso 600, caixa alta, tracking) → Módulo (número grande) → Tema (serif) → Professor → Horário (tabular).
- **Cor:** off-white `#FAFAF7`, tinta `#111`, 5 cinzas, bordas hairline. Destaque = tinta (placeholder `--accent`) até aprovação de uma cor. Status: verde, âmbar e vermelho **dessaturados**, sempre ponto + palavra.
- **Espaço:** escala de 4 px; conteúdo max 720 px (leitura) / 1120 px (listas); gutter 16 px no mobile.
- **Forma:** raio 6/10 px, sem sombras (bordas no lugar), toque mínimo 44 px, foco visível em tinta com offset.
- **Movimento:** 150–200 ms, só em abrir/fechar painel, expandir cartão e feedback de busca; respeita `prefers-reduced-motion`.
- Componentes criados sob demanda: `PageHeader`, `SectionHeader`, `SearchBar`, `FilterBar`/`FilterSheet`, `ModuleCard`, `ScheduleDay`/`ScheduleItem`, `ProfessorCard`, `StatusBadge`, `DataList` (tabela no desktop, cartões no mobile), `EmptyState`.

## 12. Estrutura de código

```
src/
  app/                    rotas (finas: buscam dados e compõem features)
  components/ui/          primitivas do design system
  components/layout/      header, menu, footer
  features/
    schedule/ modules/ professors/ inventory/ search/   (componentes + queries de cada domínio)
  lib/
    domain/               regras: disponibilidade, status, próximo módulo
    text/                 normalize, slugify
    dates/                parse/format em America/Sao_Paulo
    filters/              FilterSpec, parse/apply
    log.ts
  server/
    data/
      source/             SheetSource: google-sheets.ts | mock.ts
      pipeline/           read → normalize → assemble → toPublic
      repository.ts       getPortalData() (cacheado)
  schemas/                Zod: linhas brutas + DTOs públicos
  types/
  config/                 site.ts, sheets.ts (abas/colunas/whitelist), cache.ts, nav.ts, vocab.ts
fixtures/                 planilha fictícia (mesmo formato bruto da API) — só dev/teste
tests/
```

O mock devolve **linhas brutas no formato da API do Google**, então o pipeline inteiro é exercitado desde o primeiro dia. Trocar de mock para planilha real = `DATA_SOURCE=sheets`. Em produção, `DATA_SOURCE=mock` é recusado na inicialização (impossível publicar dados fictícios).

## 13. Plano de implementação

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **1 — Fundação** | Projeto, config, design system, layout/navegação, schemas, pipeline completo com `MockSheetSource`, fixtures no **formato novo** da planilha, testes das regras críticas | `pnpm test` verde; página de tokens revisada |
| **2 — Core acadêmico** | Home, Cronograma (sem filtros ainda), Módulo, Professores, Professor | Teste dos 15 s no celular (390 px) |
| **3 — Operação** | Materiais, Estoque, Equipamentos, lógica material × estoque | Cálculos cobertos por teste |
| **4 — Consulta** | Busca global, filtros combinados, URLs compartilháveis, refinamento mobile | Filtros e busca testados |
| **5 — Google Sheets** | Service Account, `GoogleSheetsSource`, cache, revalidação, fallback, `/api/saude`, teste de sentinelas | Portal lendo a planilha real |
| **6 — Polimento** | Acessibilidade (teclado, contraste), estados de erro/vazio/loading, performance, microinterações | Lighthouse ≥ 95 mobile; revisão visual |
| **7 — Deploy** | Vercel, variáveis, domínio, README completo | Produção no ar |

Mudança em relação à sua sequência: o **pipeline de dados** (normalização, validação, DTOs) entra na Fase 1 junto com os mocks, porque o mock usa o formato bruto da planilha. Assim a Fase 5 vira só "trocar a fonte + credenciais", com risco baixo.

A reestruturação da planilha (seção 3) pode acontecer em paralelo às fases 1–4; eu forneço o conteúdo inicial das abas `MÓDULOS` e `AULAS` convertido da matriz atual, para colar.

## 14. Configuração e deploy (resumo)

Variáveis de ambiente (nenhuma com valor real no repositório; `.env.example` só com nomes):
```
DATA_SOURCE=mock|sheets
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
REVALIDATE_SECRET=
PORTAL_INDEXING=noindex|index
PORTAL_BASE_URL=
```
Passos de Google (detalhados no README na Fase 5): criar projeto no Google Cloud → ativar Sheets API → criar Service Account → gerar chave JSON → compartilhar a planilha com o e-mail da Service Account como **Leitor** → colar as variáveis no painel da Vercel.
