# Portal do Aluno — Proposta de Arquitetura (v0, para aprovação)

> Status: **proposta — nada implementado.** Nenhum código será escrito antes da aprovação explícita.
> Data: 06/10/2026. Base: especificação "Portal do Aluno da Especialização" + leitura do repositório atual
> (portal público de cronograma, `docs/ARQUITETURA.md`).

---

## 0. Leitura crítica — inconsistências e riscos encontrados

Antes da proposta, os pontos da especificação que **conflitam entre si, com o sistema que já existe, ou que
escondem complexidade**. Cada um tem uma recomendação; os que precisam da sua decisão estão repetidos na seção N.

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

**Recomendação:** A, executada na etapa 3 do plano (seção M), com a planilha atual servindo de carga inicial.

### 0.2 Dois logins diferentes

O portal atual usa **login Google** (sessão própria). A especificação pede **e-mail e senha** com Supabase Auth.
Recomendação: **unificar em Supabase Auth**, que oferece e-mail+senha **e** "Entrar com Google" no mesmo cadastro.
Professores que já entram com Google continuam entrando com Google.

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

### 0.6 IA para classificar procedimento pode deixar o registro mais lento, não mais rápido

A meta é registrar um caso em **< 1 minuto**. Digitar "Preparo e cimentação de dois onlays nos dentes 36 e 37",
esperar a IA e conferir a classificação leva mais tempo do que tocar em **[Onlay] [×2] [36] [37]** numa lista de
procedimentos frequentes. E o princípio 12 diz: "não implementar IA onde regras simples bastam".

**Recomendação:** MVP 1 com **seleção estruturada rápida** (procedimentos recentes/frequentes no topo, busca com
sinônimos, odontograma compacto opcional). IA de classificação entra no MVP 2 como **atalho opcional** ("descreva
em texto livre e eu preencho para você conferir"), sempre preservando o texto original.

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

No MVP 1, o aluno pode **marcar 1–3 temas** na dificuldade (chips sugeridos por palavra‑chave, sem IA); no MVP 2,
a IA sugere os temas a partir do texto. Em ambos os casos a recomendação **é uma consulta ao banco** — a IA nunca
gera títulos, logo **é impossível recomendar algo inexistente**.

### 0.8 O que conta como "1 procedimento"?

"Resina anterior 8": 8 dentes? 8 sessões? 8 pacientes? "Clareamento 3": 3 pacientes ou 3 arcadas? Sem essa
regra, os números de produção não são comparáveis entre alunos. **Recomendação:** cada procedimento cadastrado
tem uma **unidade de contagem** definida pelo admin (`por dente` | `por elemento/peça` | `por arcada` |
`por paciente/caso`), e a tela de registro pede a quantidade nessa unidade. Decisão sua na seção N.

### 0.9 Caso × consulta × data

A especificação tem **"Data da clínica"** (uma data) no caso e, dentro do caso, um **mapa com várias consultas**.
Um caso de laminados tem 4–6 consultas em meses diferentes. Quando a produção é contada — no registro do caso ou
quando a consulta é marcada REALIZADA?

**Recomendação:**
- **Caso** = paciente + plano de tratamento (agrupador).
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
exposure_references       cohort_id · procedure_id · reference_count · note     (MVP 2)
```

### E.5 Casos (dados do aluno — isolados por RLS)
```
clinical_cases            id · owner_id · cohort_id · patient_label (iniciais/código)
                          · module_id? · supervisor_teacher_id? · smile_cloud_url
                          · summary · difficulty_text · ease_text · do_differently_text
                          · created_at · updated_at
case_difficulty_topics    case_id · topic_id · source (aluno|ia|palavra-chave) · confirmed bool
performed_procedures      id · case_id · owner_id · procedure_id · performed_on · quantity · teeth smallint[]
                          · session_id? · original_text? · classified_by (manual|ia) · ai_confidence?
treatment_sessions        id · case_id · owner_id · position · title · planned_on · plan_text
                          · notes · status (planejada|realizada)
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
- **MFA (TOTP)** obrigatório para `admin` e `coordenacao` (quem vê dados de todos). Opcional para alunos.

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

**Camada 2 (MVP 2): canvas de arrastar e soltar** com **React Flow (`@xyflow/react`)**, biblioteca madura, MIT,
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

| Função | MVP 1 (sem LLM) | MVP 2 (com LLM) | Precisa de RAG/embeddings? |
|---|---|---|---|
| **Classificar procedimento** | Seleção estruturada com busca por nome + sinônimos (`synonyms[]`), recentes primeiro. | Texto livre → LLM com **saída estruturada** (`procedure_id` restrito ao enum de IDs cadastrados, `quantity`, `teeth[]`, `confidence`). Extração de dentes por regex (notação FDI 11–48) antes do LLM. Aluno confere e corrige; texto original salvo. | Não. Catálogo de ~50–150 procedimentos cabe inteiro no prompt. |
| **Interpretar dificuldade** | Correspondência de palavras‑chave/sinônimos do texto com `topics.synonyms` → sugere chips; aluno confirma. | LLM recebe texto + lista de temas (id, nome, descrição) → devolve até 3 `topic_id` do enum + justificativa curta. Aluno confirma. | Não. Lista de temas (~50–200) cabe no prompt. |
| **Recomendar conteúdo** | SQL: conteúdos publicados com os temas confirmados ∪ ligados ao procedimento, ordenados por peso do tema, obrigatórios do módulo atual, não concluídos pelo aluno. | Mesmo SQL. Opcional: LLM reordena os ~10 candidatos e escreve a frase "por que isto ajuda" — só com IDs da lista recebida (validado no servidor; ID fora da lista é descartado). | Só no futuro, se o acervo passar de centenas de itens e os temas ficarem insuficientes: `pgvector` no próprio Supabase sobre título+descrição+transcrição. |
| **Busca da biblioteca** | Busca textual do Postgres (`tsvector` com dicionário português + `unaccent`). | — | Futuro: busca semântica nas transcrições. |
| **Dificuldades da turma** | Contagem de `case_difficulty_topics` confirmados. | — | Não. |

**Conclusão sobre RAG:** **não é necessário no MVP** nem provavelmente no MVP 2. A taxonomia de temas faz o papel
do "retrieval" com mais controle pedagógico (o admin decide o que é relevante para "substrato escurecido").
Embeddings entram só se o acervo crescer muito ou se quisermos buscar dentro das transcrições das aulas.

### H.3 Implementação técnica (MVP 2)
- Uma interface `ProcedureClassifier` / `TopicSuggester` com duas implementações: `RuleBased` (MVP 1) e `LLM`
  (MVP 2). Trocar = configuração; se a API falhar, cai na de regras — o registro **nunca depende da IA**.
- Chamada no servidor (Server Action), com timeout curto (~5 s); a tela de registro não espera: salva o caso e a
  sugestão aparece na confirmação.
- Provedor: API da Anthropic (Claude), com saída estruturada (schema JSON com enums dos IDs) — o modelo fica
  configurável por variável de ambiente. Para uma tarefa curta de classificação um modelo menor (ex.: Haiku 4.5)
  provavelmente basta; validaremos com um conjunto de ~50 exemplos reais antes de escolher.
- **Minimização:** o texto enviado ao provedor **não** inclui identificador do paciente, link do Smile Cloud,
  nome do aluno nem data — só o texto do procedimento/dificuldade. Orientação na tela: "não escreva o nome do
  paciente nos campos de texto"; filtro simples remove padrões de nome/CPF/telefone antes do envio.
- Registro de cada sugestão (`classified_by`, `ai_confidence`, se o aluno corrigiu) → mede a qualidade ao longo do
  tempo.

---

## I. Vídeos

**Recomendação: hospedagem externa com player incorporado. Primeira opção: Bunny Stream. Alternativa mais
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
1. **Não armazenar nome completo do paciente.** Campo "Identificação do paciente" com **iniciais ou código**
   (ex.: o código que o aluno já usa no Smile Cloud). Validação que desencoraja nomes completos (ex.: alerta se
   houver mais de 2 palavras com mais de 3 letras). **Recomendado** — decisão sua.
2. Nenhum campo de CPF, telefone, data de nascimento, fotos, anamnese ou diagnóstico.
3. Link do Smile Cloud: aceitar só o domínio do Smile Cloud; orientar a usar link que exige login.
4. Textos livres: aviso "não inclua dados que identifiquem o paciente".
5. IA: enviar só o texto clínico, sem identificadores (seção H.3); usar provedor com contrato de tratamento de
   dados e retenção mínima.
6. Ranking e dashboards da turma: **só agregados**, nunca caso individual; limiar mínimo de participantes.
7. Coordenação vê o identificador do paciente? Recomendo **não** — o painel mostra procedimento, data e reflexões;
   o identificador fica só para o próprio aluno. (Decisão sua.)

### J.3 Segurança
- RLS em todas as tabelas + testes automatizados de isolamento (seção F).
- Banco na **região São Paulo** do Supabase (reduz transferência internacional; ainda assim Vercel/IA/vídeo podem
  processar fora do país — mapear).
- Criptografia em trânsito (TLS) e em repouso (padrão do Supabase). Backups diários (plano Pro) com retenção
  definida.
- MFA para admin/coordenação; poucos admins; `service_role` só no servidor.
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
| **IA** (MVP 2) | — | **< US$ 5/mês.** Ex.: ~400 registros/mês × ~2 mil tokens de entrada + 300 de saída: com Claude Haiku 4.5 (US$ 1/US$ 5 por milhão) ≈ US$ 1,4; com Claude Sonnet 5.5 (US$ 2/US$ 10) ≈ US$ 2,8 | Só muda de ordem de grandeza se usarmos IA em leitura de transcrições. |
| **Domínio** | `.com.br` no Registro.br: ~R$ 40/ano | idem | Se já houver domínio da especialização, usar subdomínio (`portal.…`) — custo zero. |
| **Monitoramento de erros** (Sentry) | grátis | grátis (plano Developer) | Volume alto de erros/equipe maior. |
| **Outros** | — | Eventual assessoria LGPD (não recorrente) | — |
| **Total aproximado** | **~US$ 0–5/mês** | **~US$ 60–90/mês (≈ R$ 330–500)** | Cada nova turma acrescenta basicamente custo de vídeo (entrega). |

Alternativa mais barata avaliada: hospedar tudo num VPS (~US$ 10/mês) com Postgres próprio. Economiza ~US$ 40/mês,
mas transfere para vocês backup, atualização de segurança e disponibilidade de um sistema com dados de saúde.
**Não recomendo.**

---

## L. MVP

### MVP 1 — alunos usando (núcleo do ciclo)
- Login (convite, senha, recuperação), papéis, RLS, termo de aceite, privacidade.
- Turmas, matrículas, docentes (admin).
- Módulos + cronograma + conteúdos antes/durante, com obrigatoriedade (admin + aluno). Migração da planilha.
- Biblioteca: conteúdos (vídeo via serviço externo, artigo, PDF, link), categorias, **temas**, busca textual,
  filtros, relacionados, progresso "iniciado/concluído".
- Início do aluno com próximo módulo, pendências, timeline, avisos, atalhos.
- **Meus casos**: registro rápido estruturado, procedimentos realizados, reflexões, temas de dificuldade (chips por
  palavra‑chave), botão Smile Cloud.
- **Mapa de tratamento** (kanban horizontal; reordenar com arrastar no desktop e botões ↑↓/arrastar no celular;
  "realizada" oferece registrar procedimento).
- **Minha produção**: totais, distribuição por procedimento/categoria, evolução mensal, filtros, "pouca exposição"
  (comparação com a mediana da turma ou com referência do admin, se houver).
- **Recomendações por regras** (temas + procedimento → biblioteca) após o registro e na Início.
- **Workflows**: motor + player + editor estruturado com mapa do grafo + publicação/versões; "explorar no workflow"
  a partir de temas.
- Painel da coordenação **básico**: totais da turma, distribuição, evolução, dificuldades por tema, alunos com
  pouca produção.
- Avisos.

### MVP 2 — refinamento e inteligência
- IA: classificação do texto livre e sugestão de temas para dificuldades (com correção pelo aluno).
- **Canvas visual (React Flow)** para workflows.
- Produção da turma / ranking opcional com foco em diversidade (com limiar de participantes).
- Referências de exposição por procedimento configuradas pelo admin e visualização de lacunas mais rica.
- Papel professor com visão de casos que supervisionou.
- Histórico de trajetos no workflow (`workflow_runs`) e analytics de uso dos workflows.
- Exportação da própria produção (PDF/CSV) pelo aluno.
- Notificações por e‑mail (lembrete de pré‑módulo, avisos).

### Versão futura
- Busca semântica / RAG sobre transcrições das aulas (`pgvector`).
- Transcrição automática das videoaulas e "ir para o trecho" nas recomendações.
- Índice de diversidade de experiência / pontuação composta.
- App instalável (PWA com registro offline do caso).
- Integração com o Smile Cloud por API (se existir e fizer sentido).
- Feedback do supervisor sobre o caso; portfólio do aluno ao final da especialização.
- Multi‑instituição (white‑label).

**Cortes deliberados do MVP 1** (parecem bons, mas custam caro agora): IA de classificação, canvas de arrastar,
ranking, gamificação, notificações push, comentários/fórum, app nativo, DRM.

---

## M. Plano de desenvolvimento (etapas pequenas e testáveis)

Cada etapa termina com algo que você **testa no navegador** (ambiente de prévia na Vercel com dados fictícios) e
aprova antes da próxima.

| # | Etapa | Você testa |
|---|---|---|
| 0 | **Decisões** (seção N) + marca/identidade visual + contratos (Supabase Pro, Vercel Pro, vídeo) | — |
| 1 | **Fundação**: projeto Supabase (São Paulo), migrações versionadas, design system com a marca, layout com navegação mobile/desktop, ambientes (dev/prévia/produção), CI com lint/tipos/testes | Navegar no esqueleto vazio no celular e no desktop |
| 2 | **Login e papéis**: convite, senha, recuperação, MFA admin, `profiles`, `cohorts`, `enrollments`, RLS base + **testes de isolamento**, painel admin de pessoas/turmas | Convidar um aluno de teste, entrar, trocar senha; tentar abrir `/admin` como aluno |
| 3 | **Cronograma e módulos**: tabelas, migração da planilha atual, admin de módulos/programação, páginas de cronograma e módulo do aluno; decidir o destino do portal público | Ver a grade real; editar um módulo no painel e ver a mudança |
| 4 | **Biblioteca**: conteúdos, categorias, temas, integração com serviço de vídeo (upload direto + player assinado), busca, filtros, progresso, vínculo com módulos (antes/durante + obrigatoriedade) | Subir uma aula, vinculá‑la a um módulo, assisti‑la como aluno no celular |
| 5 | **Início do aluno**: próximo módulo, pendências, timeline, avisos | "Teste dos 5 segundos" com um aluno real |
| 6 | **Meus casos**: procedimentos (admin), registro rápido, lista, detalhe, reflexões, temas de dificuldade por palavra‑chave | **Cronometrar o registro no celular (< 1 min)** |
| 7 | **Mapa de tratamento** | Montar um plano de 5 consultas, reordenar, marcar realizada |
| 8 | **Produção + recomendações por regras** | Ver a produção mudar após registrar; ver recomendações coerentes |
| 9 | **Workflows**: motor, player, editor estruturado, validação, versões, "explorar no workflow" | Montar o workflow "Alteração estética anterior" sozinho e usá‑lo como aluno |
| 10 | **Painel da coordenação** | Ver a turma de teste; conferir que nenhum dado de paciente aparece onde não deve |
| 11 | **Piloto**: revisão de segurança, desempenho, acessibilidade, domínio, termo, 2–3 alunos reais por 2 semanas | Uso real |
| 12 | **Lançamento MVP 1** → depois MVP 2 em etapas do mesmo tamanho (IA, canvas, ranking…) | — |

Estimativa grosseira: cada etapa de 1 a 2 semanas de desenvolvimento; MVP 1 em torno de 3–4 meses incluindo
ciclos de revisão. As etapas 6–8 podem vir antes da 9 (workflows) porque são o coração do uso diário.

---

## N. Decisões que preciso de você antes de começar

**Produto**
1. **Fonte do cronograma:** o banco passa a ser a fonte de módulos/aulas/professores e a planilha fica só para
   logística (opção A, recomendada)? Ou a planilha continua mandando (opção B)? (0.1)
2. **O portal público atual** (cronograma sem login para professores) continua existindo? Se sim, no mesmo
   domínio (`/publico`) ou em subdomínio próprio?
3. **Papel do professor convidado:** confirma que, no MVP, professor **não vê casos** e só a coordenação vê? (0.3)
4. **A coordenação vê o identificador do paciente** nos casos, ou só procedimento/data/reflexões? (J.2.7)
5. **Identificação do paciente:** iniciais/código (recomendado) ou nome completo? (J.2.1)
6. **Unidade de contagem da produção:** por procedimento (dente/peça/arcada/caso) definida pelo admin — confirma?
   E quais procedimentos e categorias iniciais? (uma lista sua de ~20–40 já basta para começar) (0.8)
7. **MVP 1 sem IA** (registro estruturado + temas por palavra‑chave), com IA no MVP 2 — de acordo? (0.6)
8. **Editor de workflow em duas camadas** (estruturado no MVP 1, canvas no MVP 2) — de acordo? Ou o canvas é
   imprescindível já no lançamento? (G.4)
9. **Ranking no MVP 2**, com limiar mínimo de participantes e foco em diversidade — de acordo? (0.5)
10. **Número de alunos** por turma e **data em que a primeira turma precisa usar** o portal.
11. Quem vai **alimentar a biblioteca e os workflows** (você, equipe, professores)? Define o quanto o painel admin
    precisa ser polido no início.

**Técnicas e contratos**
12. **Stack** Next.js + Supabase (região São Paulo) + Vercel Pro — aprovada? (Mantém o que já existe no repositório.)
13. **Vídeo:** Bunny Stream (recomendado: mais barato, token por aluno) ou Vimeo (mais familiar)? Vocês já têm
    conta/acervo em algum serviço? Quantas horas de aula existem hoje?
14. **Domínio:** qual será (ex.: `portal.<dominio>.com.br`) e quem administra o DNS?
15. **Quem é o titular das contas** (Supabase, Vercel, vídeo, IA) — em nome da instituição, de preferência.
16. **LGPD:** quem na instituição responde por privacidade e vai revisar o termo de uso e a base legal? (J.4)

**Identidade visual**
17. **Arquivo da marca:** você mencionou que pode enviar — sim, por favor (link do Drive/Canva ou o PDF do guia).
    A especialização usa marca própria, ou a identidade da Accolità ou do Zero | 1? O design system atual do
    portal público tem a cor de destaque ainda como "a definir".

---

*Fim da proposta. Aguardando aprovação explícita antes de qualquer implementação.*
