# Portal do Aluno — Arquitetura (v1, decisões incorporadas)

> Status: **arquitetura v1 aprovada · Etapa 1 APROVADA (06/10/2026) · direção visual oficial: Conexo / Dark Glass.** Etapa 2 autorizada; ambiente em configuração (ver seção S).
> v0: 06/10/2026 · v1: 06/10/2026 — decisões da coordenação incorporadas (ver seção P, "Alterações v0 → v1").
> Data de referência: primeira turma em **fevereiro de 2027**. Base: especificação "Portal do Aluno da Especialização" + leitura do repositório atual
> (portal público de cronograma, `docs/ARQUITETURA.md`).

---

## 0. Leitura crítica — inconsistências e riscos encontrados

Antes da proposta, os pontos da especificação que **conflitam entre si, com o sistema que já existe, ou que
escondem complexidade**. Cada um tem uma recomendação; as decisões tomadas e as ainda abertas estão na seção N.

### 0.1 Já existe um portal — e ele tem outra "fonte da verdade"

O repositório já contém um portal **público** (sem login) de cronograma, professores, materiais, estoque e
equipamentos. Nele, **a planilha Google é soberana**: módulos, aulas e professores são cadastrados na planilha, e
a área `/coordenacao` grava direto nela.

A nova especificação pede que o **admin edite módulos e cronograma no painel**, com banco PostgreSQL. Se as duas
coisas coexistirem sem decisão, teremos **cronograma cadastrado em dois lugares** — exatamente o que o projeto
anterior foi desenhado para evitar.

| Opção | Como fica | Prós | Contras |
|---|---|---|---|
| **A. Banco vira a fonte acadêmica** *(recomendada)* | Módulos, aulas e professores migram (uma vez) da planilha para o banco. O portal público passa a ler do banco. A planilha continua só para **logística** (materiais, estoque, equipamentos, cachês). | Uma fonte só; vínculos reais (conteúdo↔módulo, caso↔módulo) com integridade; multi‑turma nativo. | A coordenação deixa de editar cronograma na planilha e passa a usar o painel. |
| B. Planilha continua soberana, banco espelha | Job sincroniza planilha → banco a cada X min (só leitura). | Nenhuma mudança de hábito. | Duas cópias; vínculos quebram quando alguém renomeia/reordena na planilha; multi‑turma na planilha fica frágil. |
| C. Dois sistemas separados | Portal do aluno com cronograma próprio. | Isolamento total. | Cadastro duplo. **Não recomendo.** |

**✅ Decidido: opção A.** O banco é a fonte acadêmica oficial (módulos, aulas, docentes, cronograma). A planilha
permanece para logística, materiais, estoque, equipamentos, cachês e controles operacionais. Executada na Etapa 3,
com a planilha atual servindo de carga inicial (migração única). A área `/coordenacao` do portal público deixa de
editar módulos/aulas/professores na planilha; continua editando só as abas de logística.

### 0.1b Portal público mantido, separado, lendo a mesma fonte

**✅ Decidido:** o portal público continua existindo, atendendo professores e logística, **separado** do Portal do
Aluno, mas lendo as informações acadêmicas **do mesmo banco**. Arquitetura:

```
                    ┌──────────────────────── mesmo repositório (npm workspaces) ───────────────────────┐
                    │                                                                                  │
 Supabase (SP) ◄────┤  apps/aluno    Portal do Aluno — login obrigatório, RLS, painel admin/coordenação │
  fonte acadêmica   │  apps/publico  Portal público atual — sem login; lê do banco só uma VIEW pública  │
                    │                (módulos/aulas/docentes publicados) + planilha (logística)        │
 Google Sheets ◄────┤  packages/ui   design system Conexo (tokens, fontes, componentes)                │
  logística         │  packages/db   migrações, tipos gerados, clientes Supabase, consultas            │
                    └──────────────────────────────────────────────────────────────────────────────────┘
```
- Dois projetos na Vercel (domínios/subdomínios próprios), um código de design compartilhado.
- O portal público acessa o banco com uma credencial **somente leitura** restrita a views públicas
  (`public_modules`, `public_schedule`, `public_teachers`) — nunca a tabelas de alunos. O mesmo princípio de
  "whitelist" que hoje protege as colunas privadas da planilha.

### 0.2 Dois logins diferentes

O portal atual usa **login Google** (sessão própria). A especificação pede **e-mail e senha** com Supabase Auth.
Recomendação: **unificar em Supabase Auth**, que oferece e-mail+senha **e** "Entrar com Google" no mesmo cadastro.
Professores que já entram com Google continuam entrando com Google. (A área de edição de logística do portal
público pode migrar para o mesmo login numa etapa posterior; não bloqueia nada.)

### 0.3 "Professor" é duas coisas diferentes

A especificação usa "professor" para:
1. **Docente convidado** que dá aula num módulo (aparece no cronograma e nas videoaulas; ~60 pessoas; muitos
   nunca vão logar);
2. **Coordenação**, que acompanha alunos e vê casos.

Se o papel `PROFESSOR` puder "visualizar alunos e acompanhar casos", **todo docente convidado veria casos de
pacientes e dificuldades dos alunos** — o que contradiz a minimização de dados.

**Recomendação:**
- `teachers` (docentes) é uma **entidade de conteúdo**, não um usuário. Pode, opcionalmente, estar ligada a um login.
- Papéis de acesso: `admin`, `coordenacao`, `professor`, `aluno`.
  - `coordenacao`: vê produção e casos da(s) turma(s) que coordena.
  - `professor` (MVP): vê conteúdos e cronograma; **não vê casos**. Futuramente: vê só casos em que foi marcado
    como supervisor.

**✅ Decidido:** docente (`teachers`) é entidade de conteúdo, separada de usuário com permissões. Professor
convidado **não vê casos** no MVP. **Admin e coordenação** acompanham casos e produção. Acesso adicional a casos
só por autorização explícita (concedida pelo admin, registrada e revogável — estrutura prevista, interface no MVP 2).

### 0.4 "Privada" não significa "invisível para a coordenação"

A seção 16 diz "produção privada por padrão", e a 18 diz que a coordenação vê alunos com pouca produção. As duas
coisas são compatíveis, **mas o aluno precisa saber disso**. A opção de privacidade controla **a visibilidade para
os colegas**, não para a coordenação. Isso deve estar escrito na tela de privacidade e no termo de uso.

### 0.5 Ranking em turma pequena reidentifica

Com turmas de ~10–20 alunos, mesmo números agregados são identificáveis ("quem tem só 3 procedimentos?"). E um
ranking com poucos participantes expõe quem não aparece. Recomendações:
- ranking só é exibido quando **≥ 5 alunos** optaram por participar (configurável);
- ordenar por **diversidade** (categorias distintas) e não por volume; nenhum "1º lugar";
- **fica para o MVP 2** — não é necessário para colocar alunos usando.

### 0.6 IA no registro: camada opcional, nunca dependência

A meta é registrar um caso em **< 1 minuto**. Digitar "Preparo e cimentação de dois onlays nos dentes 36 e 37",
esperar a IA e conferir a classificação leva mais tempo do que tocar em **[Onlay] [×2] [36] [37]** numa lista de
procedimentos frequentes. E o princípio 12 diz: "não implementar IA onde regras simples bastam".

~~Recomendação v0: IA só no MVP 2.~~ **✅ Decidido (v1): IA já no MVP 1, como camada opcional.**
- **Caminho principal:** seleção estruturada rápida (procedimentos recentes/frequentes no topo, busca com
  sinônimos, dentes opcionais).
- **Caminho alternativo:** botão **"Descrever o que fiz"** → texto livre → a IA **sugere** procedimento,
  quantidade, dentes e temas → o formulário estruturado aparece **pré‑preenchido** → o aluno **confirma ou
  corrige** antes de salvar. Nada é consolidado sem confirmação. O texto original é sempre preservado.
- **Dificuldade clínica:** a IA também sugere temas (`topics`) a partir do texto; o aluno confirma.
- **IA indisponível** (falha, lentidão, desligada por configuração): o botão some ou avisa "sugestão
  indisponível", e todo o resto funciona igual — registro, produção, recomendações (que usam só os temas
  confirmados). Detalhes em H.

### 0.7 "Dificuldade" precisa de um vocabulário para virar dado

O dashboard da coordenação mostra "dificuldades mais relatadas: 1. Isolamento 2. Preparo…". Isso exige que o
texto livre seja **mapeado para temas** — e a recomendação de conteúdo e o "abrir no workflow" dependem do mesmo
mapeamento.

**Essa é a peça central da arquitetura:** uma **taxonomia única de temas** (`topics`), mantida pelo admin, que
etiqueta **conteúdos da biblioteca, nós de workflow e dificuldades relatadas**. Com ela, a "conexão entre as áreas"
(seção 19) vira consultas simples no banco:

```
dificuldade relatada ──(aluno escolhe / IA sugere)──► tema "substrato-escurecido"
                                                        │
                    ┌───────────────────────────────────┼─────────────────────────────┐
                    ▼                                   ▼                             ▼
     conteúdos com esse tema               nó de workflow com esse tema     contagem no dashboard
     ("Conteúdos que podem ajudar")        ("Explorar no Workflow")         ("Dificuldades mais relatadas")
```

No MVP 1, o aluno **marca 1–3 temas** na dificuldade; as sugestões vêm da IA (quando disponível) e, sempre, da
correspondência por palavra‑chave/sinônimo. Em ambos os casos a recomendação **é uma consulta ao banco** — a IA nunca
gera títulos, logo **é impossível recomendar algo inexistente**.

### 0.8 O que conta como "1 procedimento"?

"Resina anterior 8": 8 dentes? 8 sessões? 8 pacientes? "Clareamento 3": 3 pacientes ou 3 arcadas? Sem essa
regra, os números de produção não são comparáveis entre alunos. **Recomendação:** cada procedimento cadastrado
tem uma **unidade de contagem** definida pelo admin (`por dente` | `por elemento/peça` | `por arcada` |
`por paciente/caso`), e a tela de registro pede a quantidade nessa unidade.

**✅ Decidido:** unidade configurável por procedimento. **A taxonomia de procedimentos (lista, categorias,
unidades) será definida separadamente com a coordenação clínica antes da etapa de produção** — o sistema nasce
com o cadastro vazio e o admin preenche. Os testes usam uma lista fictícia.

### 0.9 Caso × consulta × data

A especificação tem **"Data da clínica"** (uma data) no caso e, dentro do caso, um **mapa com várias consultas**.
Um caso de laminados tem 4–6 consultas em meses diferentes. Quando a produção é contada — no registro do caso ou
quando a consulta é marcada REALIZADA?

**Recomendação:**
**✅ Decidido.**
- **Caso** = paciente + plano de tratamento (agrupador). Uma mesma pessoa/caso tem várias consultas e vários
  procedimentos realizados.
- **Procedimento realizado** = linha com data, procedimento, quantidade, dentes — é **isso** que alimenta a produção.
- Registro rápido: criar caso + 1º procedimento realizado numa só tela (< 1 min).
- Mapa de tratamento: consultas planejadas; ao marcar uma como REALIZADA, o app oferece "registrar o que foi
  feito nesta consulta" (pré‑preenchido). Assim o mapa e a produção **não divergem**.

### 0.10 Construtor visual de workflows é o item mais caro do projeto

Um editor de nós arrastáveis, com validação, versionamento e pré‑visualização, é sozinho do tamanho de metade do
MVP. Não é motivo para não fazer — é motivo para **fazer em duas camadas** (seção G): primeiro o motor e um
editor estruturado com visualização do grafo; depois o canvas de arrastar e soltar.

### 0.11 Outros pontos menores

- **"O aluno pertence a uma ou mais turmas"**: modelamos `enrollments` N:N desde o início (custo zero), mas a
  interface do MVP assume **uma turma ativa** por aluno.
- **Link do Smile Cloud pode conter dados do paciente** na URL ou ser um link público de compartilhamento.
  Orientar o aluno a colar o link interno (que exige login no Smile Cloud) e validar o domínio.
- **Exclusão de caso** precisa de regra: some da produção? Recomendação: exclusão real (com confirmação); a
  produção é recalculada.
- **Fim da especialização**: o que acontece com os casos do aluno após 30 meses? Precisa de política de retenção
  (seção J).
- **Progresso de vídeo** é útil ("continuar de onde parou", "pré‑módulo concluído"), mas o rastreamento fino por
  segundo é desnecessário: basta "iniciado / concluído" + último ponto.
- **"Conteúdo obrigatório pendente"** só funciona se o aluno marcar como lido (artigos/PDFs) — o sistema não tem
  como saber que um PDF externo foi lido. Botão "Marcar como concluído".

---

## A. Visão do produto

**O que é:** o ambiente de formação do aluno durante os 30 meses — não uma área de membros. Ele organiza o que o
aluno **precisa saber** (cronograma e preparação), **aprende** (biblioteca), **pensa** (workflows de raciocínio),
**faz** (casos e mapa de tratamento) e **percebe sobre si** (produção e lacunas), e fecha o ciclo indicando o
que estudar a seguir.

**Proposta de valor, em uma frase:** *"Cada caso que o aluno atende vira, em menos de um minuto, um registro da
sua exposição clínica e um caminho de estudo personalizado — usando só o acervo real da especialização."*

**Para quem gera valor:**
- **Aluno:** sabe o que fazer agora; enxerga a própria evolução; recebe estudo dirigido às suas dificuldades.
- **Coordenação:** enxerga lacunas da turma com dados (procedimentos pouco realizados, dificuldades recorrentes) e
  ajusta clínicas e aulas.
- **Instituição:** acervo de aulas organizado e protegido; workflows como ativo pedagógico próprio.

**O que não é:** prontuário, repositório de fotos (Smile Cloud continua), rede social, sistema de notas.

**Ciclo do produto:**
```
APRENDER (biblioteca, pré-módulo) → RACIOCINAR (workflow) → PLANEJAR (mapa de tratamento)
   ↑                                                                    ↓
APRENDER DE NOVO ← ENTENDER A EVOLUÇÃO (produção, lacunas) ← REGISTRAR ← EXECUTAR (clínica)
   (recomendações por tema)
```

---

## B. Arquitetura de informação (sitemap)

Ajustes em relação à navegação proposta: **"Turma" entra em "Clínica"** (produção da turma é um contexto da sua
produção, e é opcional) e **"Biblioteca" e "Conteúdos" viram uma coisa só** (eram dois nomes para o mesmo lugar).
Ficam 5 itens principais — cabem na barra inferior do celular.

```
ALUNO (barra inferior no celular · barra lateral no desktop)
│
├── Início                                   /
│     próximo módulo · o que fazer agora · pré-módulo pendente · avisos
│     timeline de módulos · atalhos (Novo caso · Workflow) · recomendados para você
│
├── Especialização
│     ├── Cronograma                         /cronograma           timeline de todos os módulos
│     └── Módulo                             /modulos/[n]          programação · antes · durante/depois
│
├── Aprender
│     ├── Biblioteca                         /biblioteca           busca · filtros · continuar assistindo
│     ├── Conteúdo                           /biblioteca/[slug]    player · materiais · relacionados
│     └── Temas                              /biblioteca/temas/[tema]   (tudo sobre um tema: aulas + workflows)
│
├── Pensar
│     ├── Workflows                          /workflows            cenários publicados
│     └── Workflow (player)                  /workflows/[slug]?no=[chave]
│
├── Clínica
│     ├── Meus casos                         /casos                lista + [+ Novo caso]
│     ├── Novo caso (registro rápido)        /casos/novo
│     ├── Caso                               /casos/[id]           resumo · procedimentos · reflexão · recomendações
│     │     └── Mapa de tratamento           /casos/[id]/mapa      kanban horizontal de consultas
│     ├── Minha produção                     /producao             totais · distribuição · evolução · lacunas
│     └── Produção da turma (opcional)       /producao/turma       só se o aluno participa (MVP 2)
│
└── Perfil                                   /perfil
      ├── Minha conta                        senha · e-mail
      └── Privacidade                        participação na turma · o que a coordenação vê · termo

COORDENAÇÃO / PROFESSOR                       /coordenacao
├── Visão da turma        totais · distribuição · evolução mensal · diversidade
├── Lacunas               procedimentos pouco realizados · alunos com pouca produção
├── Dificuldades          temas mais relatados (contagem; texto só para coordenação)
└── Aluno                 /coordenacao/alunos/[id]   produção + casos (sem dados de paciente além do identificador)

ADMIN                                         /admin
├── Turmas                (criar, datas, ativa/encerrada)
├── Pessoas               alunos · docentes · coordenação · convites · papéis
├── Módulos e cronograma  módulo · atividades por dia · conteúdos pré/pós
├── Biblioteca            conteúdos (vídeo, artigo, livro, PDF, link) · categorias · temas · tags
├── Procedimentos         lista · categoria · unidade de contagem · sinônimos · referência de exposição
├── Workflows             lista · editor · pré-visualizar · publicar/arquivar · versões
├── Avisos                por turma, com período de exibição
└── Produção              mesmo painel da coordenação, todas as turmas

PÚBLICO (existente, sem login)                 /publico/... (ou subdomínio)  cronograma para professores
```

---

## C. Jornada do aluno

**1. Primeiro acesso.** Recebe convite por e-mail (o admin cadastra; não há autocadastro) → define senha → aceita
o termo de uso (inclui o que a coordenação vê e a orientação sobre dados de pacientes) → Início.

**2. Início, numa terça qualquer.** Vê em 5 segundos:
```
PRÓXIMO MÓDULO · em 9 dias
MÓDULO 07 · 18–20 AGO
Reabilitação estética · João Silva, Maria Souza
PREPARE-SE  2 de 3 obrigatórios concluídos   [Ver preparação →]
─────────────────────────────
01 ✓ ─ 02 ✓ ─ … ─ 06 ✓ ─ 07 ● ─ 08 ─ 09
─────────────────────────────
[+ Registrar caso]   [Workflow clínico]
PARA VOCÊ  ▶ Controle de profundidade de preparo · 18 min   (porque você relatou "preparo cervical")
AVISO  Clínica de sábado começa às 8h
```

**3. Preparação para o módulo.** Abre o módulo → aba "Antes" → itens marcados **Obrigatório / Recomendado /
Complementar** → assiste a aula gravada (progresso salvo automaticamente) → lê o artigo e toca "Marcar como
concluído". O contador da Início atualiza.

**4. Consumo de conteúdo.** Biblioteca → busca "cimentação" → filtra por categoria → assiste → "Relacionados"
mostra conteúdos com os mesmos temas e "Explorar no workflow: Cimentação adesiva".

**5. Uso do workflow.** Pensar → "Alteração estética anterior" → responde "Qual a principal alteração?" → COR →
"O substrato apresenta escurecimento significativo?" → SIM → nó de orientação ("Antes de decidir, observe…") com
"Conteúdos para aprofundar" → chega a um resultado com **caminhos possíveis e critérios de cada um**. Pode voltar
qualquer passo; o trajeto fica visível como trilha.

**6. Atendimento clínico.** Antes: no caso, monta o mapa (Consulta 01 Planejamento → 02 Mock‑up → 03 Preparo →
04 Cimentação). Abre o Smile Cloud pelo botão do caso quando precisa das fotos.

**7. Registro do caso (< 1 min).** No celular, ao sair da clínica:
```
NOVO CASO
Paciente*        [ M.A.S. ]            ← iniciais/código, nunca nome completo
Data*            [ hoje ]
O que você fez?* [Onlay ×][+]          ← chips: seus mais usados aparecem primeiro
Quantidade       [ 2 ]   Dentes [36][37]  (opcional)
Módulo           [ 07 ]  (pré-selecionado pela data)
Smile Cloud      [ colar link ]  (opcional)
Maior dificuldade  [ texto livre ]  → sugere temas: (Preparo) (Cimentação)
Maior facilidade   [ texto livre ]
Faria diferente?   [ opcional ]
                                   [ Salvar ]
```
Obrigatórios: paciente, data, procedimento. O resto pode ser completado depois.
Alternativa: **[Descrever o que fiz]** → "Preparo e cimentação de dois onlays nos dentes 36 e 37" → o formulário
acima aparece preenchido (Onlay · 2 · 36, 37 · temas: preparo, cimentação) → o aluno confere e salva. Sem IA
disponível, o botão avisa e o formulário estruturado segue normal.

**8. Atualização da produção.** Ao salvar, "Minha produção" já reflete (cálculo direto no banco, sem fila).

**9. Recomendação.** A tela de confirmação mostra:
```
CASO REGISTRADO ✓
CONTEÚDOS QUE PODEM AJUDAR NESTE PONTO  (tema: preparo cervical)
▶ Controle de profundidade de preparo · Prof. X · 18 min
▶ Acabamento cervical · Prof. X · 12 min
EXPLORAR NO WORKFLOW → Laminados: definição de término cervical
```

**10. Entender a evolução.** "Minha produção" → barras por procedimento, evolução mensal e, em tom neutro:
"Procedimentos com pouca exposição até agora: Coroas · Laminados — vale conversar com a coordenação sobre
oportunidades nas próximas clínicas."

---

## D. Jornada do admin

| Tarefa | Como |
|---|---|
| **Criar turma** | Admin → Turmas → Nova: nome ("Turma 2027"), início, fim, status. Copiar módulos de outra turma (opcional). |
| **Cadastrar alunos** | Pessoas → Convidar (um a um ou colando lista de e-mails) → escolhe turma e papel → e-mails de convite enviados. |
| **Criar módulo** | Módulos → Novo: número, tema, descrição, datas, docentes. Aba "Programação": adicionar atividades (dia, início, fim, docente, assunto, tipo). Aba "Antes"/"Durante": **vincular itens da biblioteca** (busca) e marcar Obrigatório/Recomendado/Complementar. |
| **Cadastrar aula** | Biblioteca → Novo conteúdo → tipo Vídeo → faz upload no serviço de vídeo (direto do painel, sem passar pelo servidor) ou cola o ID → título, docente, descrição, categoria, **temas**, procedimentos relacionados, materiais anexos (PDF). Duração vem do serviço de vídeo. Status: rascunho/publicado. |
| **Cadastrar procedimento** | Procedimentos → Novo: nome, categoria, **unidade de contagem**, sinônimos ("faceta cerâmica", "lente de contato" → Laminado cerâmico), referência de exposição (opcional), ordem. |
| **Criar workflow** | Workflows → Novo → editor: cria nós (pergunta, orientação, alerta, conteúdo, resultado, referência), liga respostas a nós, associa temas e conteúdos da biblioteca. "Pré‑visualizar como aluno". "Publicar" valida a árvore (sem nós órfãos, sem becos sem saída, sem conteúdo arquivado) e gera uma versão imutável. |
| **Vincular conteúdo** | Em três lugares, sempre por busca no catálogo (nunca texto livre): módulo (antes/durante), nó de workflow, e via **temas** (automático: conteúdos com o tema aparecem nas recomendações). |
| **Acompanhar produção** | Produção → escolhe turma: totais, distribuição, evolução, lacunas, dificuldades por tema, alunos abaixo da referência. Clica num aluno para ver detalhes. |
| **Avisos** | Avisos → Novo: texto curto, turma, de/até. |

### D.1 Painel admin para uma pessoa não técnica (requisito do MVP 1)

A principal operadora no início é a coordenadora, sozinha. Regras de interface do painel:
- **Linguagem do dia a dia**, nunca termos técnicos ("Publicar para os alunos", não "status = publicado"); nenhum
  ID, slug ou JSON visível.
- **Vínculos sempre por busca** ("comece a digitar o nome da aula…"), nunca por códigos.
- **Rascunho salvo automaticamente**; nada se perde ao fechar a aba.
- **"Ver como aluno"** em módulo, conteúdo e workflow, antes de publicar.
- **Nada some de verdade por engano:** conteúdos e workflows são arquivados (com "restaurar"), e exclusões pedem
  confirmação dizendo o que será afetado ("esta aula está em 2 módulos e 1 workflow").
- **Avisos claros antes de publicar** (workflow incompleto, módulo sem data, aula sem vídeo) apontando onde corrigir.
- Ajuda curta em cada campo e estados vazios que explicam o próximo passo.
- Desktop/notebook como alvo principal do painel; leitura e pequenas edições funcionam no celular.

---

## E. Banco de dados

PostgreSQL (Supabase). Convenções: `id uuid`, `created_at`, `updated_at`; textos de enumeração como `enum` do
Postgres; exclusão de conteúdos institucionais é **arquivamento** (`archived_at`), nunca `DELETE`, para não quebrar
vínculos.

### E.1 Pessoas e acesso
```
auth.users                (Supabase) e-mail, senha (hash), provedor
profiles                  id = auth.users.id · full_name · display_name · role (admin|coordenacao|professor|aluno)
                          · teacher_id? · accepted_terms_at
cohorts                   id · name ("Turma 2027") · slug · starts_on · ends_on · status (ativa|encerrada)
enrollments               user_id · cohort_id · role_in_cohort (aluno|coordenacao) · status
                          PK (user_id, cohort_id)
privacy_settings          user_id · share_with_cohort bool default false · updated_at
```
Um único `role` global em `profiles` + o vínculo por turma em `enrollments` resolve "coordenação da Turma 2027".
Uma tabela `roles` separada é desnecessária com 4 papéis fixos.

### E.2 Cronograma (específico da turma)
```
teachers                  id · name · slug · specialty · short_bio · photo_url · user_id?
modules                   id · cohort_id · number · title · description · starts_on · ends_on · status
module_teachers           module_id · teacher_id
schedule_items            id · module_id · day_date · starts_at · ends_at · period · title
                          · activity_type (teorica|laboratorial|clinica|hands-on|…) · notes
schedule_item_teachers    schedule_item_id · teacher_id
module_contents           module_id · content_id · phase (antes|durante|depois)
                          · requirement (obrigatorio|recomendado|complementar) · position · note
announcements             id · cohort_id · body · visible_from · visible_until
```

### E.3 Biblioteca (compartilhada entre turmas)
```
categories                id · name · slug · position                 (Dentística, Prótese, …)
topics                    id · name · slug · description · synonyms text[]   ← TAXONOMIA CENTRAL
contents                  id · kind (video|artigo|livro|capitulo|pdf|slides|link)
                          · title · slug · description · category_id · duration_seconds
                          · video_provider · video_id · url · file_path · citation
                          · status (rascunho|publicado|arquivado) · search_vector (tsvector)
content_teachers          content_id · teacher_id
content_topics            content_id · topic_id · weight
content_procedures        content_id · procedure_id
content_attachments       content_id · title · file_path | url
content_cohorts           content_id · cohort_id         (vazio = disponível para todas as turmas)
content_progress          user_id · content_id · status (iniciado|concluido) · position_seconds · updated_at
```
`tags` livres foram absorvidas por `topics`: duas taxonomias paralelas (tags e temas) divergem com o tempo.
`categories` organiza a navegação; `topics` liga as áreas.

### E.4 Procedimentos e produção
```
procedure_categories      id · name                      (Restauração direta, Restauração indireta, …)
procedures                id · category_id · name · slug · count_unit (dente|peca|arcada|caso)
                          · synonyms text[] · active
procedure_topics          procedure_id · topic_id        (ex.: Laminado → preparo minimamente invasivo, cimentação)
exposure_references       cohort_id · procedure_id · reference_count · note     (MVP 2)
```

### E.5 Casos (dados do aluno — isolados por RLS)
```
clinical_cases            id · owner_id · cohort_id · patient_label (iniciais/código)
                          · module_id? · supervisor_teacher_id? · smile_cloud_url
                          · summary · difficulty_text · ease_text · do_differently_text
                          · cover_path? · cover_updated_at?      (foto de capa opcional — ver E.5.1)
                          · created_at · updated_at
case_difficulty_topics    case_id · topic_id · source (aluno|ia|palavra-chave) · confirmed bool
performed_procedures      id · case_id · owner_id · procedure_id · performed_on · quantity · teeth smallint[]
                          · session_id? · original_text? · classified_by (manual|ia) · ai_confidence?
treatment_sessions        id · case_id · owner_id · position · title · planned_on · plan_text
                          · notes · status (planejada|realizada)
```

#### E.5.1 Foto de capa do caso (aprovada em 06/10/2026)
Uma foto **opcional** por caso, só para identidade visual e reconhecimento rápido (card em Meus casos, topo da página do
caso, miniaturas no Início). **Não é galeria nem documentação clínica** — isso continua no Smile Cloud.
- **Armazenamento:** Supabase Storage, bucket **privado** `case-covers` (nunca público), caminho
  `{owner_id}/{case_id}/cover.jpg`. A coluna `cover_path` guarda só o caminho.
- **Acesso:** políticas RLS em `storage.objects` espelham as do caso: lê quem pode ler o caso (o próprio aluno, a
  coordenação da turma, admin, e quem tiver `case_access_grants`); grava/substitui/remove só o dono do caso.
- **Entrega:** URL assinada de curta duração (ex.: 10 min) gerada no servidor a cada exibição; nada de URL
  permanente ou indexável.
- **Upload:** aceito só JPEG/PNG/HEIC/WebP até ~10 MB; o servidor converte para JPEG/WebP, **remove metadados
  (EXIF, GPS)**, redimensiona (ex.: 1600 px) e gera miniatura. Substituir apaga o arquivo anterior.
- **Remover / excluir caso:** apaga o arquivo; entra na mesma política de retenção dos casos (J.4).
- **Consentimento:** a instituição já colhe termo para uso de imagem; mesmo assim a imagem é tratada como dado do
  caso, com as mesmas proteções. O registro de auditoria cobre a abertura do caso pela coordenação.

```
ai_suggestions            id · owner_id · kind (procedimento|temas) · input_text · output jsonb · model
                          · latency_ms · status (aceita|corrigida|descartada|falhou) · created_at
case_access_grants        case_id|cohort_id · grantee_id · granted_by · reason · expires_at   (estrutura no MVP 1; tela no MVP 2)
audit_log                 actor_id · action · entity · entity_id · at          (ações admin + leituras de caso pela coordenação)
```
`owner_id` repetido em `performed_procedures` e `treatment_sessions` é proposital: torna as políticas RLS
triviais e rápidas (sem joins).

### E.6 Workflows (institucionais)
```
workflows                 id · title · slug · description · category_id · status (rascunho|publicado|arquivado)
                          · published_version_id? · created_by
workflow_versions         id · workflow_id · version_number · graph jsonb · published_at · published_by
                          (versão publicada = imutável; o rascunho é a versão sem published_at)
workflow_entry_points     workflow_id · node_key · topic_id      (derivada ao publicar; serve ao "abrir no workflow")
workflow_node_contents    version_id · node_key · content_id     (derivada ao publicar; integridade com a biblioteca)
workflow_runs             (MVP 2, opcional) user_id · version_id · path jsonb · finished_at
```
Por que **grafo em `jsonb` por versão** em vez de tabelas `workflow_nodes`/`workflow_edges`: o editor salva o grafo
inteiro de uma vez (atômico), versionar é copiar uma linha, e o aluno que está no meio de um workflow não é
afetado por edições. As tabelas derivadas (`entry_points`, `node_contents`) dão as consultas e a integridade
referencial que as tabelas normalizadas dariam.

### E.7 Recomendações e estatísticas
```
case_recommendations      case_id · content_id · topic_id · reason · rank · created_at
                          (registro do que foi mostrado; útil para avaliar e para não repetir)
```
`production_statistics` **não vira tabela** no MVP: com dezenas de alunos e milhares de linhas, `GROUP BY` direto
responde em milissegundos. Criamos **views** (`v_student_production`, `v_cohort_production`,
`v_cohort_difficulty_topics`) e, se um dia ficar lento, viram `materialized view` sem mudar a interface.

### E.8 Relacionamentos principais
```
cohorts 1─N modules 1─N schedule_items N─N teachers
cohorts N─N profiles (enrollments)
modules N─N contents (module_contents: fase + obrigatoriedade)
contents N─N topics N─N workflow nodes (entry points)
contents N─N procedures
profiles 1─N clinical_cases 1─N performed_procedures N─1 procedures N─1 procedure_categories
clinical_cases 1─N treatment_sessions 1─0..N performed_procedures
clinical_cases N─N topics (dificuldades)
workflows 1─N workflow_versions
```

---

## F. Autenticação e permissões

**Autenticação (Supabase Auth)**
- E-mail + senha; "Entrar com Google" opcional (útil para professores que já usam).
- **Sem autocadastro.** Contas nascem por convite do admin (`inviteUserByEmail`); o link leva a "definir senha".
- **Recuperação de senha:** fluxo padrão do Supabase (link por e-mail, válido por tempo curto) → página
  `/redefinir-senha`. E-mails enviados por SMTP próprio (Resend ou similar) com domínio da especialização — o SMTP
  embutido do Supabase tem limite baixo de envio e não serve para produção.
- **Sessão:** cookies `httpOnly`, `Secure`, `SameSite=Lax` via `@supabase/ssr`; token de acesso curto renovado
  automaticamente. Senha mínima de 10 caracteres + verificação contra senhas vazadas (recurso do Supabase).
- ~~MFA (TOTP) obrigatório para admin e coordenação~~ — **removido em 07/10/2026** (decisão N.3): todos os perfis entram só com e-mail e senha.

**Autorização em três camadas** — qualquer uma sozinha bloqueia o acesso indevido:

1. **Banco (RLS) — a garantia real.** Toda tabela com RLS ligada; sem política = sem acesso.
   ```sql
   -- funções auxiliares (security definer, estáveis)
   is_admin()                 → profiles.role = 'admin'
   coordinates(cohort_id)     → admin, ou enrollments com role_in_cohort = 'coordenacao'
   is_enrolled(cohort_id)     → enrollments ativo

   -- exemplos de política
   clinical_cases  SELECT/UPDATE/DELETE: owner_id = auth.uid() OR coordinates(cohort_id)
                   INSERT: owner_id = auth.uid() AND is_enrolled(cohort_id)
                   (coordenação: só SELECT)
   performed_procedures, treatment_sessions: mesma regra via owner_id
   contents        SELECT: status = 'publicado' AND (sem restrição de turma OR aluno matriculado) ; escrita: is_admin()
   modules, schedule_items  SELECT: is_enrolled(cohort_id) OR coordinates(cohort_id) ; escrita: is_admin()
   workflows/versions  SELECT aluno: só a versão publicada ; escrita: is_admin()
   profiles        SELECT: próprio perfil, ou coordinates(turma do perfil) ; role só alterável por admin
   ```
2. **Servidor (Next.js).** Server Components e Server Actions usam o cliente Supabase **com a sessão do
   usuário** (a RLS vale). A chave `service_role` (que ignora RLS) fica restrita a um módulo `server-only` usado
   apenas para convites e tarefas administrativas, e nunca para leituras de páginas.
3. **Rotas.** O `proxy`/middleware do Next renova a sessão e redireciona quem não está logado; os layouts de
   `/admin` e `/coordenacao` verificam o papel no servidor e devolvem 404 para quem não pode. Isso é conveniência
   de UX; **mesmo que alguém chame a API diretamente, a RLS não devolve os dados.**

**Ranking/produção da turma:** colegas **nunca** leem `clinical_cases`. A tela usa uma função
`cohort_ranking(cohort_id)` (security definer) que devolve **apenas** nome de exibição + contagens, **somente** de
quem tem `share_with_cohort = true`, e só se houver ≥ N participantes.

**Testes de segurança automatizados** (rodam a cada mudança): aluno A tentando ler/editar caso de B; aluno
lendo rascunho de workflow; aluno escrevendo em `contents`; professor lendo casos; colega lendo produção privada
— todos devem falhar **no banco**.

---

## G. Workflow engine

### G.1 Modelo do grafo (`workflow_versions.graph`)
```ts
type Graph = {
  start: NodeKey
  nodes: Record<NodeKey, Node>          // NodeKey: slug estável ("substrato-escurecido")
}
type Node =
  | { type: 'pergunta';   title; body?; options: { label; next: NodeKey; hint? }[] }
  | { type: 'orientacao'; title; body; next?: NodeKey }               // "Antes de decidir, observe…"
  | { type: 'decisao';    title; body?; criteria: { label; next }[] } // comparação de fatores
  | { type: 'alerta';     title; body; severity: 'atencao'|'critico'; next?: NodeKey }
  | { type: 'conteudo';   title?; contentIds: uuid[]; next?: NodeKey }
  | { type: 'resultado';  title; paths: { name; criteria: string[]; considerations? }[] } // caminhos clínicos, nunca "faça X"
  | { type: 'referencia'; citation; url?; next?: NodeKey }
// comum a todos: topics?: slug[], image?: path, references?: …, contentIds?: uuid[], position {x,y} (só para o editor)
```
"Pergunta" e "Decisão" se diferenciam pela apresentação (decisão mostra critérios lado a lado); o motor trata
ambas igual: escolha → próximo nó.

### G.2 Motor (player do aluno)
- Função pura `step(graph, nodeKey, choice) → nextKey` + histórico (pilha de nós visitados) **na URL**
  (`/workflows/alteracao-anterior?no=substrato-escurecido&trilha=…`). Voltar = navegador; compartilhar = link;
  "abrir no workflow a partir de um tema" = link direto para o nó.
- Renderização no servidor; só o botão de escolha é interativo. Sem estado no banco no MVP 1.
- Conteúdos do nó são **resolvidos no banco** a cada exibição (título, docente, duração atuais; arquivados somem).
- Linguagem educacional garantida por **estrutura**, não só por texto: o tipo `resultado` não tem campo "resposta";
  tem **caminhos com critérios**. Rodapé fixo: "Ferramenta educacional de apoio ao raciocínio. Não substitui
  avaliação clínica e supervisão."

### G.3 Validação ao publicar (impede árvore quebrada)
Nó inicial existe · todo `next` aponta para nó existente · todo nó é alcançável · todo caminho termina em
`resultado` · sem ciclos (ou ciclos explicitamente permitidos — decisão: **proibir** no MVP) · perguntas com ≥ 2
opções · conteúdos vinculados estão publicados · textos obrigatórios preenchidos. Erros aparecem no editor
apontando o nó.

### G.4 Editor visual do admin — em duas camadas
**Camada 1 (MVP 1): editor estruturado + mapa.**
- Lista de nós à esquerda; formulário do nó à direita; respostas com seletor "→ ir para [nó]" (ou "+ criar nó");
  busca de conteúdos da biblioteca; temas por chips.
- Abaixo, **visualização automática do grafo** (somente leitura, com layout automático), clicável para abrir o nó.
- Pré‑visualizar como aluno. Publicar com validação.
- Vantagem: funciona bem no notebook e é ~1/3 do esforço do canvas.
- **✅ Requisito confirmado:** já no MVP 1 o admin **cria, edita, publica, despublica e arquiva** workflows
  completos (todos os 7 tipos de nó, ramificações, textos, imagens, referências, alertas, conteúdos, temas) **sem
  alterar código**. A camada 2 muda só a forma de editar, não o que é possível editar.

**Camada 2 (MVP 2, ✅ aprovado): canvas de arrastar e soltar** com **React Flow (`@xyflow/react`)**, biblioteca madura, MIT,
usada exatamente para editores de nós:
- paleta com os 7 tipos de nó; arrastar para o canvas; ligar saídas de respostas a entradas de nós;
- painel lateral com o mesmo formulário da camada 1 (reaproveitado);
- layout automático (`elkjs`/`dagre`) para organizar árvores grandes; minimapa; zoom;
- autosave do rascunho (debounce) + desfazer/refazer;
- o formato salvo é **o mesmo `Graph`** — a camada 2 não exige migração.

Alternativa avaliada e descartada: ferramentas no‑code externas (Typeform, Landbot) — não ligam com a biblioteca
nem com temas, e o conteúdo institucional ficaria fora da plataforma.

### G.5 Versionamento
Rascunho editável ↔ versão publicada imutável. "Publicar" copia o rascunho para uma nova versão numerada e aponta
`workflows.published_version_id` para ela. Despublicar = status `rascunho` (some para alunos). Arquivar = some
de tudo, mantém histórico. Restaurar versão antiga = copiar para o rascunho.

---

## H. IA

### H.1 Princípio
A IA **escolhe entre opções que já existem no banco** — procedimentos cadastrados, temas cadastrados. Ela nunca
produz um título de conteúdo. A recomendação final é **sempre uma consulta SQL**. Por construção, é impossível
recomendar uma aula inexistente.

### H.2 O que precisa de LLM e o que não precisa

| Função | Sempre disponível (regras) | Camada de IA — **MVP 1, opcional** | Precisa de RAG/embeddings? |
|---|---|---|---|
| **Classificar procedimento** | Seleção estruturada com busca por nome + sinônimos (`synonyms[]`), recentes primeiro. | "Descrever o que fiz": texto livre → LLM com **saída estruturada** (`procedure_id` restrito ao enum de IDs cadastrados, `quantity`, `teeth[]`, `confidence`). Extração de dentes por regex (notação FDI 11–48) antes do LLM. Aluno confere e corrige; texto original salvo. | Não. Catálogo de ~50–150 procedimentos cabe inteiro no prompt. |
| **Interpretar dificuldade** | Correspondência de palavras‑chave/sinônimos do texto com `topics.synonyms` → sugere chips; aluno confirma. | LLM recebe texto + lista de temas (id, nome, descrição) → devolve até 3 `topic_id` do enum + justificativa curta. Aluno confirma. | Não. Lista de temas (~50–200) cabe no prompt. |
| **Recomendar conteúdo** | SQL: conteúdos publicados com os temas confirmados ∪ ligados ao procedimento, ordenados por peso do tema, obrigatórios do módulo atual, não concluídos pelo aluno. | **Mesmo SQL — a IA não participa no MVP 1.** (MVP 2, opcional: LLM reordena os ~10 candidatos e escreve a frase "por que isto ajuda" — só com IDs da lista recebida (validado no servidor; ID fora da lista é descartado).) | Só no futuro, se o acervo passar de centenas de itens e os temas ficarem insuficientes: `pgvector` no próprio Supabase sobre título+descrição+transcrição. |
| **Busca da biblioteca** | Busca textual do Postgres (`tsvector` com dicionário português + `unaccent`). | — | Futuro: busca semântica nas transcrições. |
| **Dificuldades da turma** | Contagem de `case_difficulty_topics` confirmados. | — | Não. |

**Conclusão sobre RAG:** **não é necessário no MVP** nem provavelmente no MVP 2. A taxonomia de temas faz o papel
do "retrieval" com mais controle pedagógico (o admin decide o que é relevante para "substrato escurecido").
Embeddings entram só se o acervo crescer muito ou se quisermos buscar dentro das transcrições das aulas.

### H.3 Implementação técnica (MVP 1)
- Interfaces `ProcedureSuggester` / `TopicSuggester` com duas implementações: `RuleBased` (sempre ligada) e `LLM`
  (opcional). A de IA é ligada por variável de ambiente (`AI_SUGGESTIONS=on|off`), por turma (admin) e tem
  disjuntor: após falhas seguidas, desliga sozinha por alguns minutos. **O registro nunca depende da IA.**
- Fluxo "Descrever o que fiz": Server Action com timeout curto (~6 s) → resposta validada no servidor (Zod):
  todo `procedure_id`/`topic_id` precisa existir e estar ativo; dente fora da notação FDI é descartado; quantidade
  limitada a um intervalo plausível. Sugestão inválida = sem sugestão (nunca erro para o aluno).
- O resultado só **pré‑preenche** o formulário estruturado; salvar continua sendo um ato do aluno.
- Tabela `ai_suggestions` (texto enviado, sugestão, modelo, latência, se o aluno aceitou/corrigiu) → mede a
  qualidade e alimenta um conjunto de avaliação antes de trocar modelo ou prompt.
- Provedor: API da Anthropic (Claude), com saída estruturada (schema JSON com enums dos IDs) — o modelo fica
  configurável por variável de ambiente. Escolheremos o modelo medindo acerto em ~50 descrições de exemplo
  (escritas com a coordenação clínica, junto com a taxonomia); o custo é baixo em qualquer modelo (seção K).
- **LGPD:** como a base legal ainda será revisada (J.4), a IA pode ir para produção **desligada** e ser ligada
  depois da revisão, sem nenhuma mudança de código.
- **Minimização:** o texto enviado ao provedor **não** inclui identificador do paciente, link do Smile Cloud,
  nome do aluno nem data — só o texto do procedimento/dificuldade. Orientação na tela: "não escreva o nome do
  paciente nos campos de texto"; filtro simples remove padrões de nome/CPF/telefone antes do envio.
- Registro de cada sugestão (`classified_by`, `ai_confidence`, se o aluno corrigiu) → mede a qualidade ao longo do
  tempo.

---

## I. Vídeos

**✅ Decidido: Bunny Stream**, atrás da abstração `<VideoPlayer>` / `VideoProvider` (troca futura de provedor =
nova implementação, sem mexer nas páginas). Análise original abaixo.

**Recomendação v0: hospedagem externa com player incorporado. Primeira opção: Bunny Stream. Alternativa mais
familiar: Vimeo.** Nenhum vídeo passa pelo servidor da aplicação (upload direto do navegador do admin para o
serviço).

| Serviço | Privacidade / proteção | Custo para o nosso volume* | Mobile / performance | Observações |
|---|---|---|---|---|
| **Bunny Stream** ✅ | Restrição de domínio + **URLs assinadas com expiração** (token por aluno/sessão); DRM básico opcional. | Cobrança por uso: armazenamento + entrega por GB, ~**US$ 10–30/mês** para 1 turma. | HLS adaptativo, CDN com ponto em São Paulo; player embutido leve. | Mais barato e com proteção por token; painel menos conhecido. API simples para upload direto. |
| **Vimeo (plano pago)** | Privacidade "só incorporar em domínios específicos"; sem token por usuário (link de embed pode ser reaproveitado no domínio permitido). | Plano por faixa de armazenamento, ~**US$ 20–75/mês** (anual). | Muito bom; player conhecido. | Mais fácil para quem já usa; limites de armazenamento por plano; marca Vimeo removível só em planos pagos. |
| Cloudflare Stream | URLs assinadas; restrição de domínio. | Por minuto armazenado + minuto assistido; ~US$ 40–90/mês para ~200 h de acervo. | Excelente. | Bom, mas fica caro conforme o acervo cresce. |
| Mux | URLs assinadas, DRM. | Por minuto codificado/armazenado/entregue; tende a ser o mais caro. | Excelente; ótima API e analytics. | Pensado para produtos de vídeo grandes. Exagero aqui. |
| YouTube não listado | Nenhuma: qualquer um com o link assiste. | Grátis. | Excelente. | ❌ Não recomendado para aulas pagas. |
| Supabase Storage / Vercel | Arquivo MP4 cru, sem streaming adaptativo. | Banda cara. | Ruim em rede móvel. | ❌ Não adequado. |

\* Estimativa com ~200 h de acervo e 15–25 alunos assistindo ~15–20 h/mês cada. **Valores aproximados — conferir
na tabela atual de cada serviço antes de contratar.**

**Proteção realista:** nenhum serviço impede gravação de tela. O que reduz compartilhamento: vídeo só toca dentro
do portal logado (domínio restrito + token que expira em poucas horas), **marca d'água discreta com o e-mail do
aluno sobreposta ao player** (dissuasão), e termo de uso. DRM completo (Widevine/FairPlay) é caro e piora a
compatibilidade — não recomendo no início.

**Integração:** `contents.video_provider` + `video_id`; um componente `<VideoPlayer>` gera a URL assinada no
servidor; progresso salvo a cada ~15 s e ao pausar (`content_progress`). Trocar de provedor depois = trocar a
implementação do componente.

---

## J. Privacidade e dados (LGPD) — riscos e cuidados

> Não são orientações jurídicas. São os pontos que **precisam ser tratados** por quem responde juridicamente pela
> especialização, idealmente com apoio de um profissional de proteção de dados.

### J.1 Que dados teremos
| Dado | Titular | Sensibilidade |
|---|---|---|
| Nome, e-mail, turma, produção, dificuldades | Aluno | Pessoal; dificuldades e desempenho são dados de avaliação — exposição gera dano reputacional. |
| Identificador do paciente + procedimento + dentes + data | Paciente | Dado relacionado à **saúde** → potencialmente **dado pessoal sensível** (LGPD art. 5º II e art. 11), **mesmo com iniciais**, se for possível reidentificar (iniciais + data + clínica + dentes). |
| Link do Smile Cloud | Paciente | Pode dar acesso a fotos se for link público. |

### J.2 Recomendações de minimização (desde a arquitetura)
1. **✅ Decidido: não armazenar nome completo do paciente.** Campo "Identificação do paciente" com **iniciais ou
   código** (ex.: o código que o aluno já usa no Smile Cloud), limite de tamanho e validação que bloqueia
   formato de nome completo.
2. Nenhum campo de CPF, telefone, data de nascimento, fotos, anamnese ou diagnóstico.
3. Link do Smile Cloud: aceitar só o domínio do Smile Cloud; orientar a usar link que exige login.
4. Textos livres: aviso "não inclua dados que identifiquem o paciente".
5. IA: enviar só o texto clínico, sem identificadores (seção H.3); usar provedor com contrato de tratamento de
   dados e retenção mínima.
6. Ranking e dashboards da turma: **só agregados**, nunca caso individual; limiar mínimo de participantes.
7. **✅ Decidido:** a coordenação **vê o identificador** (iniciais/código) para localizar e discutir um caso, dentro
   das regras de acesso (RLS por turma). Cada abertura de caso individual pela coordenação fica no `audit_log`.
   Dashboards agregados continuam sem identificador.

### J.3 Segurança
- RLS em todas as tabelas + testes automatizados de isolamento (seção F).
- Banco na **região São Paulo** do Supabase (reduz transferência internacional; ainda assim Vercel/IA/vídeo podem
  processar fora do país — mapear).
- Criptografia em trânsito (TLS) e em repouso (padrão do Supabase). Backups diários (plano Pro) com retenção
  definida.
- Poucos admins; `service_role` só no servidor. (Sem 2FA desde 07/10/2026 — decisão N.3.)
- **Registro de auditoria** de ações administrativas e de acessos da coordenação a casos individuais.
- Logs da aplicação sem conteúdo de casos (só IDs).
- Cabeçalhos de segurança (CSP, HSTS), `noindex` em todo o portal do aluno.

### J.4 Pontos que precisam de tratamento jurídico/institucional
- **Quem é o controlador** (a instituição de ensino? a clínica‑escola?) e qual a **base legal** para tratar dados
  de pacientes atendidos pelos alunos (o paciente foi informado de que dados do atendimento serão usados em
  ambiente educacional?).
- **Termo de uso / aviso de privacidade para alunos**: o que é coletado, quem vê (coordenação), uso de IA, ranking
  opcional, retenção.
- **Contratos com operadores** (Supabase, Vercel, serviço de vídeo, provedor de IA, e-mail) e **transferência
  internacional** (LGPD art. 33).
- **Retenção**: por quanto tempo os casos ficam após o fim da turma? Sugestão técnica: exportação para o aluno
  (PDF/CSV da própria produção) + anonimização ou exclusão X meses após o término.
- **Direitos do titular**: aluno pode exportar e excluir seus dados; procedimento para pedidos de pacientes.
- **Plano de resposta a incidentes** (quem é avisado, em quanto tempo).
- Direitos autorais das aulas gravadas e artigos (PDFs de artigos de terceiros: preferir link/DOI ao arquivo).

---

## K. Custos recorrentes (1 turma, ~15–25 alunos)

Valores aproximados em US$ (convertidos ~R$ 5,5/US$); **conferir preços vigentes antes de contratar.**

| Item | Início (desenvolvimento/piloto) | Produção com alunos | Quando migrar |
|---|---|---|---|
| **Hospedagem — Vercel** | Hobby: grátis | **Pro: ~US$ 20/mês** (1 assento) | O Hobby é **para uso não comercial**; com a especialização em produção, Pro desde o lançamento. |
| **Banco + Auth + Storage — Supabase** | Free: grátis (pausa após 7 dias sem uso, sem backup) | **Pro: ~US$ 25/mês** (backups diários, sem pausa, 8 GB de banco, 100k usuários de Auth incluídos) | No primeiro aluno real. Nosso volume cabe com folga no Pro por anos. |
| **Autenticação** | incluída no Supabase | incluída | — |
| **E-mail transacional** (convites, senha) — Resend ou similar | grátis (~3 mil e-mails/mês) | grátis | Só se passar do limite (improvável). |
| **Vídeo** | Bunny: ~US$ 1–5 durante testes | **~US$ 10–30/mês** (Bunny) ou ~US$ 20–75/mês (Vimeo) | Cresce com o acervo e o número de turmas. |
| **IA** (MVP 1, opcional) | ~US$ 0 (desligada ou poucos testes) | **< US$ 5/mês.** Ex.: ~400 registros/mês × ~2 mil tokens de entrada + 300 de saída: com Claude Haiku 4.5 (US$ 1/US$ 5 por milhão) ≈ US$ 1,4; com Claude Sonnet 5.5 (US$ 2/US$ 10) ≈ US$ 2,8 | Só muda de ordem de grandeza se usarmos IA em leitura de transcrições. |
| **Domínio** | `.com.br` no Registro.br: ~R$ 40/ano | idem | Se já houver domínio da especialização, usar subdomínio (`portal.…`) — custo zero. |
| **Monitoramento de erros** (Sentry) | grátis | grátis (plano Developer) | Volume alto de erros/equipe maior. |
| **Outros** | — | Eventual assessoria LGPD (não recorrente) | — |
| **Total aproximado** | **~US$ 0–5/mês** | **~US$ 60–90/mês (≈ R$ 330–500)** | Cada nova turma acrescenta basicamente custo de vídeo (entrega). |

Alternativa mais barata avaliada: hospedar tudo num VPS (~US$ 10/mês) com Postgres próprio. Economiza ~US$ 40/mês,
mas transfere para vocês backup, atualização de segurança e disponibilidade de um sistema com dados de saúde.
**Não recomendo.**

---

## L. MVP

### MVP 1 — alunos usando (meta: turma de fevereiro de 2027)
- Login (convite, senha, recuperação), papéis, RLS, termo de aceite, privacidade.
- Turmas, matrículas, docentes (admin). Estrutura multi‑turma desde o início.
- Módulos + cronograma + conteúdos antes/durante, com obrigatoriedade (admin + aluno). Migração da planilha.
  Portal público passa a ler a parte acadêmica do banco.
- **Taxonomia de temas (`topics`)** administrável — peça central que liga conteúdo, workflow, procedimento,
  dificuldade, recomendação e dashboard da coordenação.
- Biblioteca: conteúdos (vídeo no Bunny Stream, artigo, PDF, link), categorias, temas, busca textual, filtros,
  relacionados, progresso "iniciado/concluído".
- Início do aluno com próximo módulo, pendências, timeline, avisos, atalhos.
- **Meus casos**: registro rápido estruturado (caminho principal), procedimentos realizados, reflexões, temas de
  dificuldade, botão Smile Cloud.
- **IA opcional no registro**: "Descrever o que fiz" (sugere procedimento, quantidade, dentes, temas) e sugestão
  de temas para a dificuldade — sempre confirmada pelo aluno, com o sistema 100% funcional sem ela.
- **Mapa de tratamento** (kanban horizontal; reordenar; "realizada" oferece registrar procedimento).
- **Minha produção**: totais, distribuição por procedimento/categoria, evolução mensal, filtros, "pouca exposição"
  (comparação com a mediana da turma ou com referência do admin, se houver).
- **Recomendações** por consulta ao banco (temas confirmados + procedimento → biblioteca) após o registro e na Início.
- **Workflows**: motor + player + editor estruturado com mapa automático do grafo + publicação/versões;
  "explorar no workflow" a partir de temas. Admin cria e edita workflows completos sem código.
- Painel da coordenação: totais da turma, distribuição, evolução, dificuldades por tema, alunos com pouca
  produção, acesso a casos individuais (com identificador do paciente e registro de auditoria).
- Avisos. Painel admin simples para pessoa não técnica (D.1).

### MVP 2 — refinamento
- **Canvas visual drag‑and‑drop (React Flow)** para workflows.
- Produção da turma / ranking opcional com foco em diversidade (com limiar de participantes).
- Referências de exposição por procedimento configuradas pelo admin e visualização de lacunas mais rica.
- Tela de autorização explícita de acesso a casos (ex.: professor supervisor).
- IA reordenando recomendações e explicando "por que isto ajuda" (só com IDs vindos do banco).
- Histórico de trajetos no workflow (`workflow_runs`) e analytics de uso dos workflows.
- Exportação da própria produção (PDF/CSV) pelo aluno.
- Notificações por e‑mail (lembrete de pré‑módulo, avisos).
- Área de edição de logística do portal público usando o mesmo login (Supabase Auth).

### Versão futura
- Busca semântica / RAG sobre transcrições das aulas (`pgvector`).
- Transcrição automática das videoaulas e "ir para o trecho" nas recomendações.
- Índice de diversidade de experiência / pontuação composta.
- App instalável (PWA com registro offline do caso).
- Integração com o Smile Cloud por API (se existir e fizer sentido).
- Feedback do supervisor sobre o caso; portfólio do aluno ao final da especialização.
- Multi‑instituição (white‑label).

**Fora do MVP 1 de propósito:** canvas de arrastar, ranking, gamificação, notificações push, comentários/fórum,
app nativo, DRM, RAG.

---

## M. Plano de desenvolvimento (etapas pequenas e testáveis)

Cada etapa termina com algo que você **vê e testa** e aprova antes da próxima.

| # | Etapa | Você testa | Depende de |
|---|---|---|---|
| 1 | **Fundação** (detalhada em M.1) | Navegar no esqueleto do Portal do Aluno com a identidade Conexo, no celular e no desktop | — |
| 2 | **Login e papéis**: convite, senha, recuperação, MFA admin/coordenação, `profiles`, `cohorts`, `enrollments`, RLS base + **testes de isolamento**, telas admin de pessoas/turmas | Convidar um aluno de teste, entrar, trocar senha; tentar abrir `/admin` como aluno | Conta Supabase (institucional) |
| 3 | **Cronograma e módulos**: tabelas, migração da planilha, admin de módulos/programação, telas do aluno; **portal público passa a ler o banco** (views públicas) | Ver a grade real nos dois portais; editar um módulo no painel e ver a mudança nos dois | — |
| 4 | **Temas + Biblioteca**: `topics`, categorias, conteúdos, Bunny Stream (upload direto + player assinado), busca, filtros, progresso, vínculo com módulos | Subir uma aula, vinculá‑la a um módulo e a temas, assisti‑la como aluno no celular | Conta Bunny; **lista inicial de temas** |
| 5 | **Início do aluno** | "Teste dos 5 segundos" | — |
| 6 | **Meus casos** (estruturado): procedimentos (admin), registro rápido, lista, detalhe, reflexões, temas de dificuldade | **Cronometrar o registro no celular (< 1 min)** | **Taxonomia de procedimentos** (reunião com a coordenação clínica) |
| 7 | **IA opcional no registro**: "Descrever o que fiz" + sugestão de temas, disjuntor, `ai_suggestions`, conjunto de avaliação | Descrever casos reais em texto e conferir sugestões; desligar a IA e ver que tudo continua funcionando | Conta Anthropic (institucional); ~50 descrições de exemplo |
| 8 | **Mapa de tratamento** | Montar um plano de 5 consultas, reordenar, marcar realizada | — |
| 9 | **Produção + recomendações** | Ver a produção mudar após registrar; ver recomendações coerentes | — |
| 10 | **Workflows**: motor, player, editor estruturado + mapa, validação, versões, "explorar no workflow" | Montar sozinha o workflow "Alteração estética anterior" e usá‑lo como aluno | — |
| 11 | **Painel da coordenação** | Ver a turma de teste; conferir o que aparece em agregados × casos individuais; ver o registro de auditoria | — |
| 12 | **Piloto**: revisão de segurança, desempenho, acessibilidade, domínio, termo, 2–3 alunos reais por 2 semanas | Uso real | Domínio; termo revisado (LGPD) |
| 13 | **Lançamento MVP 1** → MVP 2 em etapas do mesmo tamanho | — | — |

**Prazo:** hoje é outubro de 2026 e a turma começa em fevereiro de 2027 (~4 meses). A estimativa de 3–4 meses
para o MVP 1 cabe, mas **sem folga**. Se apertar, a ordem acima já prioriza o que o aluno usa na primeira semana
(login, cronograma, biblioteca, Início, casos); workflows e painel da coordenação podem entrar nas primeiras
semanas de aula sem prejuízo, porque a produção ainda será pequena. Ver decisão aberta 9.

### M.1 Escopo da ETAPA 1 — Fundação

**Objetivo:** deixar pronta a base sobre a qual todas as outras etapas são construídas — estrutura do código, banco
versionado, identidade visual e navegação — **sem login e sem dados reais ainda**.

**Inclui:**
1. **Reorganização do repositório** em workspaces (npm):
   - `apps/publico` — o portal público atual, **movido sem mudança de comportamento** (todos os testes atuais
     continuam passando; nenhuma mudança visual nesta etapa);
   - `apps/aluno` — novo app Next.js do Portal do Aluno (TypeScript estrito);
   - `packages/ui` — design system Conexo;
   - `packages/db` — estrutura do Supabase: pasta de migrações versionadas, primeira migração (extensões
     `unaccent`/`pg_trgm`, configurações base), geração de tipos, clientes de servidor/navegador;
   - configuração compartilhada de TypeScript/ESLint.
2. **Design system Conexo** (`packages/ui`): tokens de cor (#CA2C2C, #141414, neutros), modo claro (modo escuro
   preparado, ajustado depois), Raleway via `next/font`, fonte de números (substituta gratuita até a licença da
   Gilroy), espaçamentos, raios, filete vermelho e numeração de seção do manual. Componentes base: botão, cartão,
   cabeçalho de página, etiqueta (Obrigatório/Recomendado/Complementar), número/indicador, timeline de módulos,
   estado vazio, campo de formulário, navegação.
3. **Esqueleto do Portal do Aluno**: navegação definitiva (barra inferior no celular, lateral no desktop) e
   **todas as rotas do sitemap (B)** criadas como páginas com estado vazio desenhado ("Em breve: …"); layout do
   painel `/admin` e `/coordenacao` com seus menus.
4. **Protótipo visual da Início** com dados fictícios (próximo módulo, timeline 01 ✓ → 02 ✓ → 03 PRÓXIMO, pendências,
   atalhos) — para validar a direção visual antes de construir as telas reais.
5. **Página `/design`**: catálogo vivo do design system (cores, tipografia, componentes).
6. **Qualidade e segurança base**: CI no GitHub (lint, tipos, testes e build dos dois apps a cada push),
   `noindex` em todo o Portal do Aluno, cabeçalhos de segurança, `.env.example`, README atualizado, rota
   `/api/saude` que confirma a conexão com o banco.

**Não inclui:** login, tabelas de domínio (turmas, casos, conteúdos…), dados reais, IA, vídeo.

**Infraestrutura na Etapa 1:** o banco roda localmente (Supabase CLI) e no CI; **não é preciso nenhuma conta
paga**. Para você ver no celular:
- se as contas institucionais da Vercel/Supabase já existirem → link de prévia na Vercel, protegido;
- se ainda não → publico uma **prévia navegável privada** (como foi feito com o portal público) e as contas
  entram na Etapa 2.

### M.2 O que você conseguirá ver e testar ao final da Etapa 1
1. **Portal do Aluno (esqueleto)** no celular e no desktop, com a identidade Conexo: navegar por Início,
   Especialização, Aprender, Pensar, Clínica e Perfil; todas as telas existem, vazias e bem acabadas.
2. **A Início com dados fictícios**: próximo módulo, timeline, pendências e atalhos — para aprovar o visual
   (espaçamento, tipografia, uso do vermelho) antes das telas reais.
3. **O painel `/admin`** com o menu definitivo (Turmas, Pessoas, Módulos, Biblioteca, Temas, Procedimentos,
   Workflows, Avisos, Produção) — para validar a organização do painel que você vai operar.
4. **A página `/design`** com cores, fontes e componentes lado a lado.
5. **O portal público funcionando exatamente como hoje**, agora dentro da nova estrutura.
6. **(Técnico)** CI verde no GitHub; banco local subindo com a primeira migração; `/api/saude` respondendo.

Critério de aprovação da Etapa 1: você aprova navegação, organização dos menus e direção visual. Mudanças nessas
três coisas são baratas agora e caras depois.

---

## O. Identidade visual — marca Conexo (Clavijo & Ottoboni)

Fonte: manual "ID Conexo" — páginas de logo, cores (03) e tipografia (04) enviadas em imagem. **Preliminar:** o guia
completo será enviado separadamente; esta seção será revisada quando chegar.

### O.1 Cores
| Token | Valor | Uso no portal |
|---|---|---|
| `--brand` | **#CA2C2C** (RGB 202 44 44 · CMYK 14 93 85 4) | Destaques pontuais: item ativo da navegação, botão principal, marcador "próximo módulo" na timeline, filetes como os do manual. **Nunca em grandes áreas.** |
| `--ink` | **#141414** (RGB 20 19 20 · CMYK 78 69 61 87) | Texto, títulos, ícones, fundo do modo escuro. |
| neutros | branco, off-white e 4–5 cinzas derivados de `#141414` | Fundos, cartões, bordas finas — é o que dá o "espaço visual" pedido na seção 24. |

O manual já aponta para o visual que a especificação pede: fundo branco, preto, vermelho em filetes finos e
números de seção, muito respiro. O portal segue a mesma gramática.

**Cuidados técnicos:**
- **Contraste:** #CA2C2C sobre branco tem contraste ≈ 5,3:1 → passa em AA para texto normal. Sobre #141414 fica
  ≈ 3,5:1 → no modo escuro o vermelho só em elementos grandes, ou um tom ajustado (mais claro) só para essa
  versão. Validaremos cada combinação no design system.
- **Vermelho não pode significar "erro"** aqui. Como é a cor da marca e a especificação pede linguagem **não
  punitiva** nas lacunas de experiência, a produção e as lacunas **não usam vermelho** (barras em preto/cinza,
  destaque em vermelho só para "você está aqui"). Erros de formulário usam ícone + texto, e o tom do vermelho de
  erro é separado do vermelho de marca.
- Os status (planejada/realizada, obrigatório/recomendado) usam **forma e texto** (ponto cheio/vazado, rótulo), não
  novas cores — sem excesso de cores, como pede a especificação.

### O.2 Tipografia
| Papel | Fonte (manual) | Observação |
|---|---|---|
| Títulos e texto | **Raleway** | Gratuita (Google Fonts), auto‑hospedada via `next/font`. Usar pesos 300–700; títulos em peso médio/leve, como no manual ("tipografia", "cores"). |
| Números | **Gilroy** | **Fonte comercial** — precisa de licença web. Ótima para o portal: datas, horários, contadores de produção, número do módulo. |

Detalhe importante: a Raleway desenha os números com **algarismos de estilo antigo** (alturas desiguais,
"123456789" que descem da linha). O manual resolve isso usando Gilroy para números — e nós faremos o mesmo em
todo número do portal (datas, totais, gráficos). Se não houver licença da Gilroy, alternativas gratuitas com
desenho geométrico parecido: **Plus Jakarta Sans** ou **Outfit** só para números, ou Raleway com a opção
tipográfica `lnum` (algarismos alinhados), que resolve a altura mas mantém o desenho da Raleway.

### O.3 Logo
- Cabeçalho: versão horizontal **"conexo. CLAVIJO & OTTOBONI"** no desktop; no celular, a versão reduzida
  ("conexo." ou só o bloco vermelho "co"), respeitando a redução máxima indicada no manual (página 10).
- Ícone do navegador/aplicativo: o bloco vermelho com "co" branco.
- Preciso do logo em **SVG** — PNG/JPG perdem qualidade em telas de alta resolução.

### O.4 Linguagem visual aplicada — "Conexo / Dark Glass" (aprovada em 06/10/2026; substitui a versão clara)
- **Interface escura**: fundo #090909, superfícies #121212/#181818, texto quase branco, cinzas para hierarquia.
  Vermelho Conexo como assinatura: estado ativo, seleção, progresso, ponto de luz, ação primária (uma por área),
  caminho percorrido no workflow. Texto vermelho usa `--signal` (#F0625E), que passa AA sobre o fundo escuro.
- **Vidro com função**: `.glass` (cards principais, casos, nós do workflow, painéis, player), `.glass-strong`
  (navegação, barras fixas, diálogos), `.is-selected` (selecionado/atual). Leitura longa, formulários e tabelas
  ficam opacos. Com "reduzir transparência" no sistema ou sem suporte a blur, tudo vira superfície opaca.
- **Escala**: números e títulos grandes e leves; informação secundária pequena; muito espaço negativo.
- **Microinterações** silenciosas (140–220 ms): hover, seleção, expansão; respeita "reduzir movimento".
- Tokens em `packages/ui/src/styles.css`; catálogo vivo em `/design`. O portal público adota os mesmos tokens numa
  etapa posterior.

---

## Q. Ciclo de vida do conteúdo institucional (aprovado em 06/10/2026)

Regra geral do painel: **a coordenação altera livremente antes de o aluno ver**, e nada é apagado por padrão.

| Estado | Para o aluno | Para o admin |
|---|---|---|
| **Rascunho** | invisível | editável; pode pré-visualizar como aluno |
| **Publicado** | visível | continua editável; mudanças com impacto pedem confirmação |
| **Arquivado** | invisível (sai de listas, recomendações e vínculos) | histórico preservado; pode restaurar como rascunho |

**Onde se aplica:** workflows, módulos (e sua programação), aulas/videoaulas, conteúdos da biblioteca (artigos, livros,
PDFs, links), materiais necessários do módulo e avisos.

**Modelo de dados.** Cada tabela institucional ganha `status (rascunho|publicado|arquivado)`, `published_at`,
`archived_at`, `updated_by`. Toda política RLS de leitura do aluno exige `status = 'publicado'` (e, para avisos,
estar dentro do período). Exclusão definitiva não existe na interface; só o admin, por rotina específica, e
registrada em `audit_log`.
- **Workflows:** versão publicada imutável + rascunho de edição (`workflow_versions`, G.5). "Publicar alterações"
  cria nova versão; quem está no meio continua na anterior.
- **Módulos, aulas, conteúdos, materiais, avisos:** edição direta do registro publicado, com
  **rascunho de alterações** quando a mudança tem impacto: a edição fica em `pending_changes jsonb` até ser publicada,
  para o aluno não ver uma alteração pela metade.

**Pré-visualizar como aluno.** Renderiza **o mesmo componente** da tela do aluno (ex.: `ModuleView`, `LessonView`,
player do workflow) com os dados do rascunho, dentro de uma moldura de pré-visualização no admin. Não existe uma
"versão parecida" para pré-visualização.

**Confirmação de impacto.** Antes de aplicar, o sistema lista o que muda para quem, por exemplo:
- datas de módulo publicado → "o cronograma de N alunos muda"; oferece publicar um aviso para a turma;
- conteúdo que passa a obrigatório → "entra nas pendências de preparação";
- arquivar conteúdo vinculado a módulos/workflows → lista onde ele aparece;
- nova versão de workflow → alunos em andamento terminam na versão anterior.

**Na prévia da Etapa 1** isso já aparece em: Admin › Módulos (lista por estado, editor, pré-visualização de rascunho,
confirmação), Admin › Aulas e conteúdos (lista por estado, pré-visualização de rascunho), Admin › Avisos (lista por
estado com "como o aluno vê") e Admin › Workflows (barra de publicação e confirmação de nova versão).

---

## R. Marco — ETAPA 1 APROVADA · CONEXO DARK GLASS (06/10/2026)

A Etapa 1 (fundação + protótipo navegável) está aprovada. **CONEXO / DARK GLASS é a referência visual oficial** do
Portal do Aluno. Novas telas e componentes nascem do design system atual (`packages/ui`, catálogo em `/design`);
mudanças estruturais de linguagem visual só com necessidade justificada.

**Princípios congelados**
- canvas predominantemente preto; branco e cinza para hierarquia;
- vermelho Conexo com parcimônia (ativo, seleção, progresso, ação primária, caminho do workflow);
- vidro apenas onde cria profundidade/hierarquia; leitura e formulários opacos;
- evitar excesso de cards e qualquer aparência de plataforma EAD;
- fotografia clínica como elemento importante em Meus casos;
- interface silenciosa, tecnológica e clínica;
- Admin mais funcional, dentro do mesmo sistema visual.

**Requisitos aprovados para as próximas etapas** (já desenhados no protótipo)
foto de capa do caso (armazenamento privado, E.5.1) · atalho para o Smile Cloud · Rascunho → Pré-visualizar como
aluno → Publicar → Arquivar (Q) · calendário mensal · materiais necessários no módulo · biblioteca de aulas ·
workflow clínico · mapa horizontal de tratamento · produção clínica do aluno.

Checkpoint no repositório: commit "ETAPA 1 APROVADA — CONEXO DARK GLASS" (0a722a2).

---

## S. Ambiente da Etapa 2 — estado da configuração (06/10/2026)

Registro para retomar o trabalho em qualquer sessão. **Nenhum segredo aqui.**

| Item | Estado |
|---|---|
| Supabase | Organização Conexo, projeto `portal-aluno`, região São Paulo. Project ref `xzwdnanssqkrxkyntwes` (público). Novos cadastros desativados. |
| Token de acesso | Granular, escopo só da organização Conexo, ~30 dias. Permissões: Project (leitura), Database → Database e Migrations (escrita), Auth (escrita); todo o resto **None**. Revogar ao fim da Etapa 2. |
| Vercel | Team **Conexo** (Hobby — passar a Pro antes de alunos reais). Projeto `portal-aluno`, Root Directory `apps/aluno`, produção em https://portal-aluno-kappa.vercel.app. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (Sensitive). A secret key exposta em captura de tela foi revogada e substituída. |
| GitHub | Branch padrão do repositório: `claude/upbeat-bohr-8heral` (contém todo o histórico anterior). |
| Domínio / Resend | Ainda sem domínio; será registrado no Registro.br (CPF de Thiago). Até lá, e-mails de teste pelo SMTP padrão do Supabase; Resend em subdomínio (`portal.<dominio>`) antes de convidar alunos reais. |
| Ambiente Claude | Rede *Custom*: `api.supabase.com`, `*.supabase.co`, `*.vercel.app` + padrões. Token do Supabase como **segredo de rede** (Bearer, host `api.supabase.com`, prefixo `/v1/projects/xzwdnanssqkrxkyntwes/`) — o agente usa sem ver o valor. Variável `SUPABASE_PROJECT_REF`. Segredos só valem em sessões iniciadas depois de salvos. |
| Pendente (pré‑existente) | `apps/publico/fixtures/preview/{MATERIAIS_POR_MODULO,ESTOQUE,EQUIPAMENTOS}.csv` nunca foram commitados → testes do portal público falham no CI. Recriar (planilhas reais ou exemplos mínimos). |

**Token (atualizado 07/10/2026):** recriado com Project → Read, Database → Database **Read-write**, Database →
Migrations Read-write, Auth Read-write; todo o resto None. (Sem *Database Read‑write* a API recusa consultas SQL
com `missing database_read`.) Conexão verificada com `select 1`.

**Etapa 2 · Parte 1 — pessoas e acesso (aplicada em 07/10/2026, aguardando aprovação)**
- Migrações aplicadas no Supabase e registradas com a mesma versão dos arquivos: `20261006120000_base`
  (Etapa 1, ainda não aplicada no remoto) e `20261007120000_pessoas_e_acesso`.
- Tabelas: `cohorts`, `profiles`, `enrollments`, `terms_versions`, `terms_acceptances`, todas com RLS.
  Dados iniciais: turma "Especialização Conexo | Turma 2027" (01/02/2027–31/07/2029) e termo `0.1-provisorio`.
- Testes de isolamento em `packages/db/tests/` (27 casos), rodando no CI (`npm run db:test`) e no Supabase
  (transação desfeita, sem resíduo).

**Etapa 2 · Parte 2 — login e convites (aprovada em 07/10/2026; 2FA removido depois, ver abaixo)**
- Migração `20261007130000_login_e_2fa`: poderes de admin e coordenação **só com sessão 2FA (aal2)**, também no
  banco; `admin_people()` e `admin_reset_mfa()` (só admin com 2FA); `bootstrap_first_admin(email)` (só o dono do
  banco, só enquanto não houver admin); `my_mfa_enrolled()`.
- Telas: `/entrar`, `/esqueci-senha`, `/auth/confirmar` (links com token_hash), `/auth/retorno` (links no formato
  padrão do Supabase), `/definir-senha`, `/seguranca/2fa`, `/seguranca/2fa/configurar`, `/termo`; painel
  `/admin/alunos` e `/admin/equipe` (convite por e-mail ou link, novo link, reenviar, redefinir 2FA).
- Sessão em cookies httpOnly + SameSite=Lax (+ Secure em produção); login sempre no servidor.
- Auth do projeto (API de gerenciamento): site `https://portal-aluno-kappa.vercel.app/auth/retorno`, redirecionamentos
  permitidos para esse domínio e `localhost:3001`, senha ≥ 10 com letras e números, links válidos por 24 h,
  autocadastro desligado, TOTP desligado (desde 07/10/2026).
- **Limites do plano gratuito sem SMTP próprio:** e-mails com o texto padrão do Supabase (em inglês) e no máximo
  **2 e-mails por hora**; modelos em português prontos em `packages/db/supabase/templates/` entram com o Resend.
  Proteção contra senhas vazadas (HaveIBeenPwned) exige plano Pro. Até lá, convites preferencialmente por
  **"Gerar link para enviar por mensagem"**.
- Ambiente local completo: `npx supabase start` em `packages/db` (config em `supabase/config.toml`, e-mails no
  Mailpit). Testes de banco: 43 casos (27 + 16) no CI e no Supabase.

**Primeiro admin (uma vez):** 1) no painel do Supabase, *Authentication → Users → Invite user* com o e-mail da
pessoa; 2) ela abre o e-mail, cria a senha e aceita o termo; 3) executar
`select public.bootstrap_first_admin('email@...');` (SQL Editor ou API de gerenciamento). A partir daí, papéis só
pelo painel.

**Remoção do 2FA (07/10/2026)** — migração `20261008110000_sem_2fa`: `is_admin()`, `coordinates()` e
`can_view_profile()` voltam a depender só do papel e da matrícula (sem exigir sessão aal2); `admin_people()` sem a
coluna de 2FA; removidas `has_mfa()`, `my_mfa_enrolled()` e `admin_reset_mfa()`; fatores existentes apagados.
TOTP desligado no Auth. App: removidas as telas `/seguranca/2fa` e `/seguranca/2fa/configurar`, o botão de ativar
2FA no Perfil, a coluna e o "Redefinir 2FA" no painel de pessoas. RLS, isolamento entre turmas, papéis protegidos,
último admin protegido, rotas e sessão httpOnly continuam iguais.

**Etapa 2 · Parte 3 — turmas, cronograma e módulos (aplicada em 07/10/2026, aguardando aprovação)**
- Migração `20261008120000_turmas_modulos`: `faculty` (docentes e equipe, compartilhados entre turmas), `modules`,
  `module_days` (N dias por módulo), `module_sessions` (programação por turno, horário opcional, tipo),
  `session_faculty` (vários professores, "a confirmar"), `module_staff` (equipe; visível ou interna),
  `module_internal_notes` (só admin/coordenação), `module_materials` + `material_checks`, `module_deliverables`,
  `module_resources` (link/arquivo/texto, fase, obrigatoriedade, liberação por data), `cohort_events`,
  `change_log` (histórico "de → para" com autor), `copy_cohort_structure()`; bucket privado `module-files`.
- Aluno vê só módulos publicados da turma em que está matriculado (turma encerrada continua visível); coordenação
  lê tudo da própria turma; só admin grava. Módulo publicado não se exclui (arquiva).
- Pré-cadastro (`packages/db/seeds/turma-2027.sql`, executado uma vez): 30 módulos publicados ("Módulo N"),
  90 dias, 58 atividades, 18 docentes/equipe com os nomes do material; observações da planilha em observações
  internas; nomes ambíguos preservados.
- Testes de banco: 63 casos (27 + 13 + 23) no CI e no Supabase.

**Ajustes na gestão de pessoas e equipe (07/10/2026)** — migração `20261008130000_gestao_pessoas`:
- **Excluir pessoa (login):** sem histórico (nunca entrou, sem aceite, sem alterações, sem vínculo de docente) → conta
  apagada no Auth; com histórico → **acesso desativado** (`profiles.deactivated_at` + bloqueio no Auth): perde na hora
  admin/coordenação/turma (as funções de permissão exigem conta ativa), perfil e histórico ficam; "Reativar acesso"
  desfaz. Só admin desativa/reativa; o último admin ativo não pode ser desativado; ninguém exclui a própria conta.
- **Excluir docente/equipe (sem login):** sem vínculo com atividades ou equipes de módulo → excluído; com vínculo →
  inativo (sai das listas de escolha, continua onde já estava). As chaves estrangeiras impedem apagar vínculos.
- **Reenviar acesso:** quem ainda não entrou → novo convite; quem já tem senha → link de nova senha (recuperação),
  sem criar conta. Link para copiar (WhatsApp) ou envio por e-mail. Painel "Abrir" em Alunos e em Docentes e
  coordenação.
- Testes de banco: 78 casos (27 + 13 + 23 + 15).

**Próximo passo:** aprovação da Parte 3.

## N. Decisões

### N.1 Tomadas (v1)
| # | Tema | Decisão |
|---|---|---|
| 1 | Fonte do cronograma | **Opção A.** Banco = fonte acadêmica (módulos, aulas, docentes, cronograma). Planilha = logística, materiais, estoque, equipamentos, cachês. |
| 2 | Portal público | **Mantido e separado**, lendo do banco as informações acadêmicas (views públicas). Sem cadastro duplicado. |
| 3 | Professor | Docente = entidade de conteúdo; usuário = permissões. Professor convidado **não vê casos** no MVP. Admin e coordenação acompanham casos e produção; outros só por autorização explícita. |
| 4 | Coordenação × paciente | Coordenação **vê o identificador** (iniciais/código) para localizar/discutir casos, dentro das regras de acesso, com auditoria. |
| 5 | Paciente | **Iniciais ou código.** Nome completo nunca é armazenado. |
| 6 | Produção | Unidade de contagem **configurável por procedimento** (dente, peça, arcada, caso/paciente). Taxonomia definida depois, com a coordenação clínica, antes da etapa de casos. |
| 7 | IA | **No MVP 1, opcional e nunca dependência.** Estruturado é o caminho principal; "Descrever o que fiz" sugere procedimento/quantidade/dentes/temas; IA sugere temas da dificuldade; aluno sempre confirma; sem IA tudo funciona; recomendação só do banco. |
| 8 | Workflow | Duas camadas: MVP 1 editor estruturado + grafo automático (edição completa sem código); MVP 2 canvas. |
| 9 | Ranking | MVP 2. |
| 10 | Primeira turma | **Fevereiro de 2027.** Arquitetura multi‑turma. |
| 11 | Administração | Coordenadora é a principal operadora inicial; painel simples para pessoa não técnica (D.1). Outros admins no futuro. |
| 12 | Stack | **Next.js + Supabase (São Paulo) + Vercel.** |
| 13 | Vídeo | **Bunny Stream**, atrás da abstração `VideoPlayer`. |
| 14 | Contas | Infraestrutura em nome da empresa/instituição, não pessoal. |
| — | Conceitos | **Topics** como taxonomia central (conteúdo, workflow, procedimento, dificuldade, recomendação, dashboard). **Caso** = paciente + plano; **procedimento realizado** = evento que alimenta a produção. |

### N.3 Decisões para a Etapa 2 (06/10/2026)
| Tema | Decisão |
|---|---|
| Contas | Supabase, Vercel e Resend em nome da instituição/Conexo, nunca em contas pessoais. |
| Domínio | A definir. Desenvolvimento e prévia usam endereços temporários (`*.vercel.app`); nada bloqueia a estrutura. |
| Login | Só e-mail + senha no MVP. Sem "Entrar com Google". Sem autocadastro: contas nascem por convite. |
| 2FA | ~~Obrigatório para admin e coordenação; opcional para aluno.~~ **Removido em 07/10/2026:** nenhum perfil usa 2FA; admin, coordenação e aluno entram só com e-mail e senha. Permissões dependem apenas do papel e da matrícula (RLS). |
| Usuários | Começamos com usuários de teste. Nenhuma credencial em código ou chat; usuários reais convidados pelo painel. |
| Turma | "Especialização Conexo \| Turma 2027", fev/2027 a jul/2029 — editável pelo admin. |
| Termo de uso | Texto provisório identificado como tal. **Versionado**: tabela `terms_versions` (versão, texto, vigente desde) e `terms_acceptances` (usuário, versão, data/hora). Nova versão vigente exige novo aceite no próximo acesso. |
| Papéis | `admin`, `coordenacao`, `aluno`. Docente é entidade acadêmica (`teachers`), sem login no MVP. |
| Segurança | Regras de acesso no banco (RLS) além da interface; nenhum segredo no GitHub; nenhuma chave sensível no navegador; imagens clínicas privadas. |

### N.2 Ainda abertas (nenhuma bloqueia a Etapa 1)
| # | Decisão | Bloqueia a partir de |
|---|---|---|
| 1 | **Quem cria as contas institucionais** (Supabase, Vercel, Bunny, Anthropic, e-mail) e em nome de qual CNPJ. Alternativa se atrasar: criar em conta pessoal e **transferir** depois (Supabase e Vercel permitem transferir projetos entre organizações). | Etapa 2 (Supabase) · 4 (Bunny) · 7 (Anthropic) |
| 2 | **Lista inicial de temas (`topics`)** — ~30–60 temas para começar (ex.: isolamento, preparo, cimentação, substrato escurecido, seleção de material, ajuste oclusal…). Sugestão: definir na mesma conversa da taxonomia de procedimentos. | Etapa 4 |
| 3 | **Taxonomia de procedimentos** (lista, categorias, unidade de cada um) com a coordenação clínica, + ~50 descrições de exemplo para avaliar a IA. | Etapas 6 e 7 |
| 4 | **Número de alunos** da primeira turma. | Ajuste de custos e do limiar do ranking (não bloqueia código) |
| 5 | **Domínio** (ex.: `portal.<dominio>.com.br`) e quem administra o DNS. | Etapa 12 (piloto) |
| 6 | **Responsável institucional por LGPD**; termo de uso, aviso de privacidade, base legal, contratos com fornecedores e transferência internacional. A IA pode ir para produção **desligada** até essa revisão. | Lançamento real |
| 7 | **Política de retenção** dos casos após o fim da turma (exportar e anonimizar/excluir depois de X meses?). | Lançamento real |
| 8 | **Guia de marca completo**, logo em **SVG** e **licença web da Gilroy** (ou aprovação de uma alternativa gratuita para números). A Etapa 1 usa substituta e é trocada sem retrabalho. | Polimento visual |
| 9 | **O que é indispensável no primeiro dia de aula** se o prazo apertar (sugestão em M: login, cronograma, biblioteca, Início e casos no dia 1; workflows e painel da coordenação nas primeiras semanas). | Planejamento a partir da Etapa 5 |
| 10 | **Nome do portal** na interface (ex.: "Conexo · Portal do Aluno"). | Polimento visual |

---

## P. Alterações v0 → v1

| Seção | Mudança |
|---|---|
| 0.1 / 0.1b | Opção A decidida. Novo desenho: **repositório com dois apps** (`apps/aluno`, `apps/publico`) e pacotes compartilhados (`ui`, `db`); portal público lê o banco por **views públicas somente leitura** + planilha para logística. |
| 0.2 | Área de edição de logística do portal público migra para o mesmo login depois (MVP 2). |
| 0.3 / F | Professor sem acesso a casos confirmado; acesso extra só por autorização explícita (`case_access_grants`, tela no MVP 2). |
| 0.6 / H / L | **IA movida para o MVP 1** como camada opcional: "Descrever o que fiz", sugestão de temas da dificuldade, validação no servidor contra o banco, disjuntor, liga/desliga por configuração e por turma, tabela `ai_suggestions`. Recomendação de conteúdo continua 100% por consulta ao banco. |
| 0.8 | Unidade de contagem confirmada; taxonomia de procedimentos adiada para reunião com a coordenação clínica (sistema nasce com cadastro vazio). |
| 0.9 | Caso × procedimento realizado confirmado. |
| D.1 | Novo: requisitos do **painel admin para pessoa não técnica**. |
| E | Novas tabelas: `procedure_topics` (procedimento ↔ tema), `ai_suggestions`, `case_access_grants`, `audit_log`. |
| G.4 | Requisito explícito: no MVP 1 o admin cria/edita/publica workflows completos sem código. |
| I | Bunny Stream decidido, com abstração `VideoPlayer`. |
| J.2 | Paciente por iniciais/código (decidido); coordenação vê identificador com auditoria (decidido — v0 recomendava não). |
| K | Custo de IA passa a valer desde o MVP 1 (continua < US$ 5/mês). |
| L | MVP 1 inclui IA opcional e acesso da coordenação a casos; MVP 2 ganha tela de autorizações e login unificado no portal público. |
| M | Plano refeito em 13 etapas (IA ganhou etapa própria, a 7); dependências por etapa; nota de prazo para fevereiro/2027; **escopo detalhado da Etapa 1** (M.1) e o que será visível ao final (M.2). |
| N | Separado em decisões tomadas (N.1) e abertas (N.2), com a etapa que cada aberta bloqueia. |
| O | Nova seção de identidade visual Conexo (preliminar, a partir das páginas enviadas). |
| E.5.1, Q, O.4 (rodada de 06/10) | Foto de capa do caso (privada, RLS do caso, URL assinada, sem EXIF); ciclo Rascunho → Pré-visualização → Publicado → Arquivado com confirmação de impacto; direção visual Dark Glass. |

---

*Arquitetura v1. Aguardando autorização explícita para iniciar a Etapa 1.*
