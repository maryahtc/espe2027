# Etapa 6 — Meus casos · arquitetura final e catálogo inicial (para revisão)

> Situação: **proposta ajustada em 13/10/2026, aguardando aprovação. Nada implementado.**
> Decisões da Maryah já incorporadas (13/10/2026): registro rápido com 4 essenciais; caso ≠ procedimento; exclusão
> lógica para o aluno e exclusão definitiva só administrativa; catálogo validado antes de entrar em produção;
> coordenação lê os casos da própria turma com auditoria; só foto de capa; supervisor informativo; conteúdos
> relacionados já nesta etapa; "Minha produção" escondida até a Etapa 9; turma encerrada somente leitura; "entregue"
> fora; texto do termo preparado para revisão (não publicado).

## 1. Princípios
1. **Registrar um procedimento em menos de 1 minuto, no celular.** Essenciais: paciente/código, data, procedimento e
   quantidade. Todo o resto é opcional e pode ser completado depois.
2. **Caso não é procedimento.** Caso = acompanhamento de um paciente/tratamento ao longo do tempo, com quantos
   procedimentos forem necessários, inclusive multidisciplinares.
3. **Procedimento realizado é a unidade da Produção** (Etapa 9): procedimento + data + quantidade na unidade do catálogo.
4. **O Conexo não é prontuário.** Nunca: nome completo, CPF, telefone, nascimento, endereço, anamnese, diagnóstico
   detalhado, exames. Documentação clínica (fotos, radiografias, tomografias, escaneamentos, PDFs) fica no Smile Cloud.
5. **Nada se perde por engano:** "Excluir" do aluno é recuperável; exclusão definitiva é administrativa, excepcional e
   registrada.

## 2. Modelo de dados (migração só aditiva)

| Tabela | Campos principais | Observações |
|---|---|---|
| `procedure_categories` | nome, slug, ordem, arquivada | Preenchida só após validação do catálogo |
| `procedures` | categoria, nome, slug, **unidade** (`dente`, `peca`, `arcada`, `caso`), sinônimos, ativo, ordem, exige descrição | "Outro procedimento" exige descrição curta. Procedimento usado não é apagado: é desativado |
| `procedure_topics` | procedimento ↔ tema | Liga à biblioteca (taxonomia de temas da Etapa 4) |
| `clinical_cases` | dono, turma, **paciente** (iniciais/código), título (opcional), situação (`em_andamento`/`concluido`), início, conclusão, supervisor (opcional, docente), link do Smile Cloud, dificuldade, facilidade, faria diferente, foto de capa, **removido_em** | Início = data do 1º procedimento. Sem histórico de versões dos textos (privacidade) |
| `performed_procedures` | caso, dono, turma, procedimento, **data**, **quantidade**, dentes (FDI 11–48), módulo (automático pela data, corrigível), nota curta, descrição (se "Outro"), **removido_em** | É o que a Produção vai contar |
| `case_difficulty_topics` | caso ↔ tema (1–3), origem (aluno / sugestão por sinônimo) | Sem IA nesta etapa |
| `case_access_grants` | estrutura para acesso extra (ex.: supervisor) | Sem tela (MVP 2). Supervisor informado no caso **não** ganha acesso |
| `audit_log` | quem, quando, ação, caso, turma, dono — **sem conteúdo clínico** | Abertura de caso pela coordenação/admin, exclusão definitiva |
| bucket `case-covers` | privado | Foto de capa (E.5.1): link temporário, mesmas regras de leitura do caso |

Funções no banco:
- `case_readable(caso)`: dono; coordenação da turma; admin; acesso extra vigente.
- `module_for_date(turma, data)`: módulo em andamento naquela data, senão o último anterior.
- `suggest_topics(texto)`: temas cujos nomes/sinônimos aparecem no texto da dificuldade (sem acento), para o aluno
  confirmar.
- `log_case_view(caso)`: grava a auditoria quando coordenação/admin abre um caso individual.
- `purge_case(caso, motivo)`: exclusão definitiva — **só admin**, só para caso já removido pelo aluno.
- `active_performed_procedures` (visão): procedimentos que contam na Produção (regra da seção 4).

## 3. Regras de acesso (RLS, testadas com alunos e turmas diferentes)
| Quem | Casos e procedimentos |
|---|---|
| Aluno dono | Lê, cria, edita, conclui/reabre, remove e restaura os próprios. Só registra em turma **ativa** em que está matriculado como aluno |
| Colegas | Nada |
| Coordenação da turma | Lê os casos **não removidos** dos alunos da turma, com identificador do paciente; não edita; cada abertura vai para a auditoria |
| Admin | Lê os casos de qualquer turma (com auditoria), inclusive removidos; não edita; único que pode excluir definitivamente |
| Docentes convidados, supervisor informado, portal público, IA | Nada |
| Turma encerrada | Aluno lê; não cria nem edita (somente leitura) |

Ninguém tem permissão de `DELETE` direto nas tabelas de casos: a remoção do aluno é uma marcação (`removido_em`), e a
exclusão definitiva passa obrigatoriamente pela função `purge_case`.

## 4. Exclusão lógica, exclusão definitiva e impacto na Produção
**Para o aluno — "Excluir" (exclusão lógica):**
- Caso inteiro: marca `removido_em` no caso. Some de Meus casos, do Início, das buscas e da visão da coordenação; vai
  para o filtro **"Excluídos"**, com **Restaurar** a qualquer momento.
- Um registro de procedimento lançado por engano: mesma lógica no registro (`removido_em`), com Restaurar.
- Editar continua possível a qualquer momento (corrigir data, quantidade, procedimento, dentes).

**Impacto na Produção (Etapa 9):**
- A Produção será **calculada na hora** a partir de `active_performed_procedures` = procedimentos **não removidos** de
  casos **não removidos**. Nada é guardado em totais.
- Remover → sai de todos os números imediatamente (totais, por categoria, evolução mensal, por módulo).
  Restaurar → volta, com a data original. Nenhum recálculo ou rotina extra é necessário.
- Caso **concluído** continua contando (concluir não é remover).
- Turma encerrada: a produção fica congelada porque nada mais pode ser registrado ou alterado.
- Painéis da coordenação (Etapa 11) usam a mesma visão: casos removidos não entram nos agregados.

**Exclusão definitiva (administrativa, excepcional):**
- Uso: pedido do titular (LGPD), dado proibido registrado por engano (ex.: nome completo do paciente) ou ordem
  institucional.
- Só admin, só para caso **já removido** pelo aluno (dois passos), com **motivo obrigatório** e confirmação.
- Apaga caso, procedimentos, temas e foto de capa. Grava na auditoria: quem, quando, motivo, aluno, turma e quantos
  registros foram apagados — **sem conteúdo clínico**.
- Efeito na Produção: os procedimentos deixam de existir; os números atuais se ajustam sozinhos. Relatórios exportados
  antes não mudam.
- Texto com dado proibido pode simplesmente ser **editado** pelo aluno (sem histórico de versões), sem precisar excluir
  o caso.

## 5. Registro rápido (estrutura final)
Uma tela, pensada para o polegar. No topo: **[Novo caso] [Caso em andamento]**.

**Essenciais (obrigatórios):**
| Campo | Como funciona |
|---|---|
| Paciente/código | Novo caso: até 12 caracteres, maiúsculas automáticas ("M.A.S.", "SC-1023"). Recusa formato de nome ("Maria Silva"), CPF e telefone. Se o aluno já tem caso em andamento com o mesmo código, oferece "registrar nele". Caso em andamento: toca no caso (os 3 mais recentes aparecem em atalhos, com busca) |
| Data | Hoje, já preenchida. Não aceita data futura |
| Procedimento | Atalhos com os 6 mais usados pelo aluno + busca por nome e sinônimos ("lente de contato" → Laminado). "+ outro procedimento" adiciona outra linha na mesma consulta (ex.: preparo ×4 e provisório ×4) |
| Quantidade | Na unidade do procedimento ("4 peças", "2 dentes", "1 arcada"). Unidade "caso" = 1, sem pergunta |

**Automático, corrigível:** Módulo — "Módulo 03 · pela data · alterar".

**Opcionais (no "Completar depois", recolhido, ou na página do caso):**
dentes (seletor FDI; se marcados, a quantidade em dente/peça acompanha), título do caso, supervisor (lista de docentes,
só informativo), link do Smile Cloud (domínio validado), maior dificuldade + temas sugeridos (1–3, o aluno confirma),
maior facilidade, faria diferente, foto de capa.

**Depois de salvar:** "Registrado ✓ · M.A.S. · Laminado cerâmico — cimentação ×4", com **Completar caso** e
"Conteúdos da biblioteca sobre este tema" (temas da dificuldade ∪ temas do procedimento).

**Meta de tempo:** registro típico com 4 essenciais em ~20–30 s. O teste da etapa cronometra no celular (< 1 min).

## 6. Experiência
- **Meus casos:** cartões (capa ou iniciais), procedimentos do caso como etiquetas (multidisciplinar), situação, última
  atividade; filtros Em andamento · Concluídos · Excluídos; busca pelo código.
- **Página do caso:** linha do tempo agrupada por data ("12/08 · Preparo para laminado ×4 · 12 11 21 22"), reflexão,
  temas, conteúdos relacionados, Abrir no Smile Cloud, Concluir/Reabrir, Excluir/Restaurar.
- **Início:** atalho "Registrar caso" + 2 casos recentes.
- **Menu do aluno:** "Minha produção" escondida até a Etapa 9.
- **Fica oculto até a etapa própria:** Mapa de tratamento (8), Explorar no Workflow (10), IA (7).
- **Admin → Procedimentos:** categorias e procedimentos (unidade, sinônimos, temas, ativo, ordem), com histórico.
- **Coordenação → Casos da turma:** alunos com nº de casos e último registro → casos do aluno (leitura, auditada).
- **Admin → Casos:** mesma leitura para qualquer turma + "Excluir definitivamente" (protegido) em casos removidos.

## 7. Divisão em partes
1. **Parte 1:** banco, regras de acesso e testes; Admin → Procedimentos; catálogo validado (carga só após sua aprovação).
2. **Parte 2:** registro rápido, Meus casos, página do caso, exclusão lógica, Início; menu sem "Minha produção";
   teste cronometrado no celular.
3. **Parte 3:** foto de capa; leitura da coordenação e do admin com auditoria; exclusão definitiva administrativa;
   conteúdos relacionados.

## 8. Catálogo inicial de procedimentos (para validação com a coordenação clínica)

Unidades: **dente** · **peça** (elemento protético/restauração indireta) · **arcada** · **caso** (uma vez por
paciente/tratamento). Restaurações indiretas aparecem **por etapa clínica** (preparo, provisório, cimentação), para a
Produção mostrar a exposição a cada etapa sem contar duas vezes o mesmo trabalho: "laminados concluídos" = cimentações.

### 1. Diagnóstico e planejamento
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Exame clínico e plano de tratamento | caso | avaliação, primeira consulta, anamnese, plano de tratamento | Primeira consulta e anamnese |
| Documentação fotográfica | caso | fotos, protocolo fotográfico, fotografia | Fotografia odontológica |
| Escaneamento intraoral | arcada | scanner, escaneamento digital, moldagem digital | Escaneamento intraoral |
| Moldagem convencional | arcada | moldagem, silicone de adição, poliéter | — |
| Planejamento digital do sorriso | caso | DSD, smile design, planejamento digital | Planejamento digital do sorriso |
| Enceramento diagnóstico | dente | enceramento, wax-up | Enceramento diagnóstico |
| Mock-up | caso | ensaio restaurador, test drive | Planejamento digital do sorriso |
| Registro oclusal / montagem em articulador | caso | JIG, registro com JIG, arco facial, articulador | Registro oclusal com JIG |

### 2. Dentística restauradora direta
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Restauração em resina — anterior | dente | resina anterior, classe III, classe IV | Resina composta em anteriores |
| Restauração em resina — posterior | dente | resina posterior, classe I, classe II | Resina composta em posteriores; Restaurações Classe I e Classe II |
| Restauração cervical (classe V / lesão não cariosa) | dente | classe V, LCNC, abfração, cervical | Adesão |
| Faceta direta em resina | dente | faceta em resina, lente de resina | Faceta direta em resina |
| Recontorno / acréscimo em resina | dente | fechamento de diastema, recontorno cosmético, acréscimo | Resina composta em anteriores |
| Resina injetável | dente | técnica injetável, injection molding | Técnica de resina injetável |
| Reparo de restauração | dente | reparo, conserto de restauração | Adesão |

### 3. Restaurações indiretas parciais
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Preparo para inlay/onlay/overlay | dente | preparo parcial, preparo onlay, preparo overlay | Preparo parcial |
| Restauração semidireta | peça | semidireta, resina indireta | Restaurações semidiretas |
| Cimentação de inlay/onlay/overlay | peça | cimentação adesiva, cimentação de onlay | Adesão; Sistemas cerâmicos |

### 4. Laminados e coroas
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Preparo para laminado cerâmico | dente | preparo para lente, preparo de faceta | Preparo para laminado cerâmico |
| Cimentação de laminado cerâmico | peça | lente de contato dental, faceta cerâmica, faceta de porcelana | Sistemas cerâmicos; Adesão |
| Preparo para coroa total | dente | preparo de coroa, preparo total | Preparo para coroa total |
| Cimentação de coroa | peça | coroa cerâmica, coroa total, zircônia, dissilicato | Sistemas cerâmicos |
| Provisório | peça | coroa provisória, provisionalização, bisacrílica | — |

### 5. Núcleos e pinos
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Pino de fibra de vidro | dente | pino intrarradicular, pino de fibra | Pinos intrarradiculares |
| Núcleo metálico fundido | dente | NMF, núcleo fundido | Pinos intrarradiculares |
| Reconstrução coronária (núcleo de preenchimento) | dente | build-up, núcleo em resina, preenchimento | Adesão |

### 6. Prótese fixa e sobre implante
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Prótese parcial fixa (dentossuportada) | peça | ponte, PPF, prótese fixa | Preparo para coroa total |
| Coroa sobre implante | peça | prótese sobre implante unitária, coroa implantada | Prótese sobre implante |
| Prótese fixa total sobre implantes (protocolo) | arcada | protocolo, all-on-4, prótese híbrida | Prótese sobre implante |
| Prótese removível (total ou parcial) | arcada | dentadura, PT, PPR | — |

### 7. Oclusão
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Placa oclusal | peça | placa miorrelaxante, placa de bruxismo, placa estabilizadora | — |
| Ajuste oclusal | caso | desgaste seletivo, ajuste de oclusão | — |

### 8. Procedimentos complementares (multidisciplinares)
| Procedimento | Unidade | Sinônimos principais | Temas ligados |
|---|---|---|---|
| Clareamento de consultório | caso | clareamento, branqueamento | Substrato escurecido |
| Clareamento caseiro supervisionado | caso | clareamento de moldeira, clareamento caseiro | — |
| Clareamento interno | dente | clareamento de dente não vital, walking bleach | Substrato escurecido |
| Microabrasão / infiltração resinosa | dente | mancha branca, infiltrante, microabrasão | — |
| Gengivoplastia / recontorno gengival | dente | gengivoplastia, recontorno gengival | — |
| Aumento de coroa clínica | dente | ACC, cirurgia periodontal, osteotomia | — |

### 9. Outros
| Procedimento | Unidade | Observação |
|---|---|---|
| Outro procedimento | caso | Exige descrição curta. O admin revisa os "outros" frequentes e os transforma em itens do catálogo |

Pontos para a coordenação clínica validar:
1. Etapas separadas (preparo / provisório / cimentação) nas indiretas — ou um item único por tipo de peça?
2. Unidades: preparos por **dente** e cimentações por **peça**; escaneamento e moldagem por **arcada**.
3. Itens a incluir ou retirar (ex.: endodontia, cirurgia, prótese removível, profilaxia).
4. Sinônimos que os alunos realmente usam no dia a dia.
5. O "Outro procedimento" fica disponível ou o registro aceita só o catálogo?

## 9. Termo de uso
Rascunho técnico da nova versão em [`docs/TERMO-DE-USO-v1-RASCUNHO.md`](./TERMO-DE-USO-v1-RASCUNHO.md) — para revisão
da Maryah e validação jurídica. **Não publicado**: a versão em vigor continua a `0.1-provisorio`. A publicação (nova
versão no banco, com novo aceite de todos) só acontece com autorização expressa e antes de alunos reais registrarem casos.
