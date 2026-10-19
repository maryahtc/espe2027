# Etapa 6 — Meus casos · arquitetura final e catálogo inicial (para revisão)

> Situação: **arquitetura e catálogo aprovados (13/10/2026, ajuste final dos clareamentos). Parte 1 implementada em 19/10/2026.**
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
| `procedures` | categoria, nome, slug, **tipo** (tratamento/geral), sinônimos, ativo, ordem | Procedimento usado não é apagado: é desativado. Ver seção 8 |
| `procedure_steps` | procedimento, nome, **unidade** (`dente`, `peca`, `arcada`, `caso`), sinônimos, **conclui**, exige descrição, ativo, ordem | Etapas clínicas (ajuste de 13/10/2026, seção 8). "Outro procedimento" exige descrição |
| `procedure_topics` | procedimento ↔ tema | Liga à biblioteca (taxonomia de temas da Etapa 4) |
| `clinical_cases` | dono, turma, **paciente** (iniciais/código), título (opcional), situação (`em_andamento`/`concluido`), início, conclusão, supervisor (opcional, docente), link do Smile Cloud, dificuldade, facilidade, faria diferente, foto de capa, **removido_em** | Início = data do 1º procedimento. Sem histórico de versões dos textos (privacidade) |
| `performed_procedures` | caso, dono, turma, **etapa** (e procedimento), **data**, **quantidade**, dentes (FDI 11–48), módulo (automático pela data, corrigível), nota curta, descrição (se "Outro"), **removido_em** | É o que a Produção vai contar |
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
| Procedimento | Um toque na etapa já com o procedimento ("Laminado cerâmico · Cimentação"; seção 8). Atalhos com as 6 mais usadas pelo aluno + busca por nome e sinônimos ("lente de contato" → Laminado cerâmico). "+ outro procedimento" adiciona outra linha na mesma consulta (ex.: preparo ×4 e provisório ×4) |
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

## 8. Procedimento × etapa clínica (ajuste de 13/10/2026)

**Dois níveis no catálogo, um toque no registro.**

| Nível | O que é | Exemplo |
|---|---|---|
| **Procedimento** (tratamento) | O que se trata e se conclui. Tem categoria, sinônimos e **tipo**: *tratamento* (tem conclusão) ou *geral* (diagnóstico/planejamento — só experiência) | Laminado cerâmico |
| **Etapa clínica** | O que se executa numa consulta. Tem **unidade** própria e pode ser a **etapa que conclui** (no máximo uma por procedimento) | Preparo (dente) · Provisório (peça) · **Cimentação (peça, conclui)** |

- Procedimento simples tem **uma etapa só**, que conclui (ex.: Restauração em resina — anterior). Na tela aparece só o
  nome do procedimento.
- **Registro:** a lista e a busca mostram as etapas já com o procedimento ("Laminado cerâmico · Cimentação"). O aluno
  continua tocando **uma** opção por linha; atalhos com as 6 etapas que ele mais usa. Buscar "lente" mostra as três
  etapas do Laminado cerâmico.
- **Sinônimos** ficam no procedimento e na etapa e só levam ao item oficial; nunca criam procedimento novo.
- **Ordem livre:** o sistema não obriga registrar preparo antes da cimentação (o aluno pode ter feito só uma etapa).

**Banco (ajuste no modelo aprovado, continua só aditivo):** `procedures` ganha *tipo* (tratamento/geral); nova tabela
`procedure_steps` (procedimento, nome, unidade, sinônimos, conclui, ordem, ativo); `performed_procedures` passa a
guardar a **etapa** (e o procedimento, copiado da etapa para consultas rápidas). Regra no banco: no máximo uma etapa que
conclui por procedimento; procedimento *geral* não tem etapa que conclui.

**Duas leituras na Produção (Etapa 9), calculadas dos mesmos registros ativos:**
1. **Experiência clínica:** soma das quantidades **por etapa** (quantas vezes executou cada etapa), incluindo os
   procedimentos gerais.
2. **Produção concluída:** soma das quantidades **só das etapas que concluem**, por procedimento. Preparo e provisório
   nunca entram aqui — 4 preparos + 4 cimentações de laminado = **4 laminados concluídos**, não 8.

**"Outro procedimento":** etapa única, unidade caso, **descrição obrigatória**, conta só como experiência. A descrição é
guardada também em forma normalizada (sem acento/maiúsculas), o que permite ao admin ver **"Descrições frequentes"**
(texto, nº de registros, nº de alunos) e decidir se viram item oficial. Reclassificar os registros antigos para o novo
item seria uma ação administrativa futura, com autorização.

**Profilaxia/limpeza:** fora do catálogo por enquanto.

## 9. Catálogo final revisado (para validação com a coordenação clínica)

Unidades aprovadas: preparo = **dente**; cimentação/restauração indireta = **peça**; escaneamento e moldagem =
**arcada**; procedimentos gerais = **caso**. ✓ = etapa que conclui. Em cirurgia, "dente" = posição/sítio (notação FDI).

### A. Diagnóstico, planejamento e registros — *geral (só experiência)*
| Procedimento | Unidade | Sinônimos principais |
|---|---|---|
| Exame clínico e plano de tratamento | caso | avaliação, primeira consulta, plano de tratamento |
| Documentação fotográfica | caso | fotos, protocolo fotográfico |
| Escaneamento intraoral | arcada | scanner, escaneamento digital, moldagem digital |
| Moldagem convencional | arcada | moldagem, silicone de adição, poliéter |
| Planejamento digital do sorriso | caso | DSD, smile design |
| Enceramento diagnóstico | dente | enceramento, wax-up |
| Mock-up | caso | ensaio restaurador, test drive |
| Registro oclusal / montagem em articulador | caso | JIG, arco facial, articulador |

### B. Dentística direta — *tratamento, etapa única ✓*
| Procedimento | Unidade | Sinônimos principais |
|---|---|---|
| Restauração em resina — anterior | dente ✓ | resina anterior, classe III, classe IV |
| Restauração em resina — posterior | dente ✓ | resina posterior, classe I, classe II |
| Restauração cervical (classe V / LCNC) | dente ✓ | classe V, abfração, lesão cervical |
| Faceta direta em resina | dente ✓ | faceta em resina, lente de resina |
| Recontorno / acréscimo em resina | dente ✓ | fechamento de diastema, recontorno cosmético |
| Resina injetável | dente ✓ | técnica injetável, injection molding |
| Reparo de restauração | dente ✓ | reparo |

### C. Restaurações indiretas
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Laminado cerâmico | Preparo (dente) · Provisório (peça) · **Cimentação (peça) ✓** | lente de contato dental, faceta cerâmica, faceta de porcelana |
| Coroa total | Preparo (dente) · Provisório (peça) · **Cimentação (peça) ✓** | coroa cerâmica, zircônia, dissilicato, coroa |
| Inlay / onlay / overlay | Preparo (dente) · Provisório (peça) · **Cimentação (peça) ✓** | restauração parcial indireta, onlay, overlay |
| Restauração semidireta | Preparo (dente) · **Cimentação (peça) ✓** | semidireta, resina indireta |
| Prótese parcial fixa (dentossuportada) | Preparo de pilar (dente) · Provisório (peça) · **Cimentação (peça) ✓** | ponte, PPF — peça = cada elemento da ponte |

### D. Núcleos e pinos — *tratamento, etapa única ✓*
| Procedimento | Unidade | Sinônimos principais |
|---|---|---|
| Pino de fibra de vidro | dente ✓ | pino intrarradicular, pino de fibra |
| Núcleo metálico fundido | dente ✓ | NMF |
| Reconstrução coronária | dente ✓ | build-up, núcleo de preenchimento |

### E. Endodontia — *novo, multidisciplinar* (recomendo incluir)
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Tratamento endodôntico | Sessão de tratamento (dente) · **Obturação (dente) ✓** | canal, endo, tratamento de canal |
| Retratamento endodôntico | Sessão de tratamento (dente) · **Obturação (dente) ✓** | retratamento, refazer canal |

### F. Cirurgia e implantes — *novo, multidisciplinar* (recomendo incluir)
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Exodontia | **Exodontia (dente) ✓** | extração |
| Implante | **Instalação do implante (dente) ✓** · Reabertura / cicatrizador (dente) | implante osseointegrado, fixture |
| Enxerto ósseo | **Enxerto (dente/sítio) ✓** | enxerto, regeneração óssea, ROG |
| Enxerto de tecido mole | **Enxerto (dente/sítio) ✓** | enxerto gengival, conjuntivo, enxerto livre |

### G. Prótese sobre implante
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Coroa sobre implante | Provisório (peça) · **Instalação (peça) ✓** | prótese sobre implante unitária |
| Prótese fixa total sobre implantes | Prova (arcada) · **Instalação (arcada) ✓** | protocolo, all-on-4, prótese híbrida |

### H. Periodontia estética — *mantidos, multidisciplinar*
| Procedimento | Unidade | Sinônimos principais |
|---|---|---|
| Gengivoplastia / recontorno gengival | dente ✓ | gengivoplastia, recontorno gengival |
| Aumento de coroa clínica | dente ✓ | ACC, cirurgia periodontal, osteotomia |

### I. Prótese removível — *mantido*
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Prótese removível (total ou parcial) | Prova (arcada) · **Instalação (arcada) ✓** | dentadura, PT, PPR |

### J. Oclusão
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Placa oclusal | **Instalação (peça) ✓** | placa miorrelaxante, placa de bruxismo |
| Ajuste oclusal | **Ajuste (caso) ✓** | desgaste seletivo |

### K. Clareamento e manchas (ajuste aprovado: clareamentos só experiência)
| Procedimento | Etapas (unidade) | Sinônimos principais |
|---|---|---|
| Clareamento de consultório | Sessão (caso) — *só experiência* | clareamento, branqueamento |
| Clareamento caseiro supervisionado | Entrega e orientação (caso) — *só experiência* | clareamento de moldeira |
| Clareamento interno | Sessão (dente) — *só experiência* | dente não vital, walking bleach |
| Microabrasão / infiltração resinosa | dente ✓ | mancha branca, infiltrante |

### L. Outros
| Procedimento | Unidade | Observação |
|---|---|---|
| Outro procedimento | caso | Descrição obrigatória; só experiência; relatório de descrições frequentes para o admin |

**Provisórios:** entram como **etapa** dos tratamentos (laminado, coroa, inlay/onlay, PPF, coroa sobre implante), não
como procedimento solto — assim contam na experiência sem inflar a produção concluída. Buscar "provisório" lista todos.

**Pontos para a coordenação clínica validar:** inclusão de endodontia, cirurgia e implantes; "dente/sítio" como unidade
de enxertos e implantes; etapas de cada tratamento; clareamento interno só como experiência; sinônimos usados pelos
alunos.

## 10. Exemplo — reabilitação anterior com 4 consultas

Caso **R.C.T. · Reabilitação anterior superior** (um caso só, vários procedimentos):

| Consulta | O que o aluno registra (uma linha = um toque + quantidade; dentes opcionais) |
|---|---|
| **1 · 02/03** | Exame clínico e plano ×1 · Documentação fotográfica ×1 · Escaneamento intraoral ×2 arcadas · Planejamento digital do sorriso ×1 |
| **2 · 16/03** | Mock-up ×1 · Retratamento endodôntico · Obturação ×1 (21) · Exodontia ×1 (14) |
| **3 · 06/04** | Pino de fibra ×1 (21) · Reconstrução coronária ×1 (21) · Laminado cerâmico · Preparo ×3 (12 11 22) · Coroa total · Preparo ×1 (21) · Laminado · Provisório ×3 · Coroa total · Provisório ×1 · Implante · Instalação ×1 (14) |
| **4 · 27/04** | Laminado cerâmico · Cimentação ×3 (12 11 22) · Coroa total · Cimentação ×1 (21) |

**Na página do caso:** linha do tempo por consulta e um resumo por tratamento — "Laminado cerâmico: preparados 3 ·
cimentados 3 ✓ (12 11 22)"; "Coroa total 21: cimentada ✓"; "Implante 14: instalado". Se na consulta 4 só dois
laminados fossem cimentados, apareceria "cimentados 2 de 3 preparados — falta 22" (quando os dentes foram informados).

**Em "Minha produção" (Etapa 9), só com os registros deste caso:**

*Experiência clínica (etapas executadas)*
| Procedimento | Etapas |
|---|---|
| Laminado cerâmico | Preparo 3 dentes · Provisório 3 peças · Cimentação 3 peças |
| Coroa total | Preparo 1 dente · Provisório 1 peça · Cimentação 1 peça |
| Retratamento endodôntico | Obturação 1 dente |
| Pino de fibra · Reconstrução coronária | 1 dente · 1 dente |
| Exodontia · Implante | 1 dente · Instalação 1 dente |
| Diagnóstico e planejamento | Exame 1 · Fotografia 1 · Escaneamento 2 arcadas · Planejamento digital 1 · Mock-up 1 |

*Produção concluída (só etapas que concluem)*
| Procedimento | Concluídos |
|---|---|
| Laminado cerâmico | **3 peças** (não 6) |
| Coroa total | 1 peça |
| Retratamento endodôntico | 1 dente |
| Pino de fibra · Reconstrução coronária | 1 · 1 |
| Exodontia · Implante instalado | 1 · 1 |

Os procedimentos gerais (exame, fotos, escaneamento, planejamento, mock-up) aparecem só na experiência clínica.
Os números também poderão ser vistos por categoria, por mês (data de cada registro) e por módulo.

## 11. Termo de uso
Rascunho técnico da nova versão em [`docs/TERMO-DE-USO-v1-RASCUNHO.md`](./TERMO-DE-USO-v1-RASCUNHO.md) — para revisão
da Maryah e validação jurídica. **Não publicado**: a versão em vigor continua a `0.1-provisorio`. A publicação (nova
versão no banco, com novo aceite de todos) só acontece com autorização expressa e antes de alunos reais registrarem casos.
