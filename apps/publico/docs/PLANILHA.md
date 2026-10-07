# Guia da planilha — para a coordenação

A planilha **continua sendo a fonte oficial**. O portal só lê; nada precisa ser digitado duas vezes.
Alterou a planilha → em até **1 minuto** o portal mostra a mudança.

> **Atualização (Etapa 3 · Parte A, 08/10/2026):** cronograma, módulos e professores passaram a vir **somente do
> Admin do Portal do Aluno** (banco, visões públicas). As abas MÓDULOS, AULAS e PROFESSORES não são mais lidas nem
> editadas por aqui; a planilha continua oficial apenas para **materiais, estoque e equipamentos**. Ver
> `docs/PORTAL-DO-ALUNO-ARQUITETURA.md` (seção S) na raiz do repositório.

## O que o portal lê

| Aba | O portal usa | O portal NUNCA publica |
|---|---|---|
| **MÓDULOS** *(nova)* | Módulo, Mês previsto, Data início, Data fim, Tema principal, Descrição, Status | Equipe, Observações internas, qualquer outra coluna |
| **AULAS** *(nova)* | Módulo, Dia do módulo, Data, Início, Fim, Período, Tema da aula, Descrição, Tipo, Professor(es), Observações públicas, Status | Observações internas, qualquer outra coluna |
| **PROFESSORES** | Professor, Especialidade / tema, Bio curta *(nova)* · Apelidos *(nova, só para vincular — não aparece)* | Cidade, Contato, Cachê, Passagem, Hotel, Chegada, Saída, Status, Responsável, Observações, E-mail, Telefone |
| **MATERIAIS POR MÓDULO** | Módulo, Tema / Aula, Professor, Material, Marca / Especificação, Qtd. necessária | Mês, Data, Qtd. em estoque, Qtd. faltante *(o portal calcula)*, Empresa / parceiro, Responsável, Prazo, Status, Observações |
| **ESTOQUE** | Material, Categoria, Marca / Especificação, Unidade, Estoque atual, Estoque mínimo, Última atualização | Estoque inicial, Entradas, Saídas, Módulo, Mês, Responsável, Observações |
| **EQUIPAMENTOS** | Equipamento, Categoria, Módulo, Qtd. necessária, Qtd. disponível | Já temos?, Parceiro possível, Responsável, Prazo, Status, Local, Observações |
| empresas, MARKETING, FOTO E VÍDEO, PENDÊNCIAS, DASHBOARD | **nada** — nem são lidas | tudo |

Regras de segurança:

- **Coluna nova é invisível por padrão.** Pode criar colunas internas à vontade: elas nunca aparecem no portal.
- As colunas são encontradas **pelo nome do cabeçalho** (linha 1). Pode mudar a ordem, inserir colunas no meio etc.
  Só não renomeie os cabeçalhos da tabela acima sem avisar.
- Tudo que aparece no portal pode ser visto por **qualquer pessoa com o link**. Na dúvida, use "Observações internas".

## Aba MÓDULOS — uma linha por módulo

| Coluna | Exemplo | Observação |
|---|---|---|
| Módulo | `7` | Obrigatório. Número inteiro. |
| Mês previsto | `ago/2027` ou `08/2027` | Usado enquanto não há datas. |
| Data início / Data fim | `18/08/2027` | Sempre DD/MM/AAAA. Se vazias, o portal usa as datas das aulas. |
| Tema principal | `Reabilitação estética` | Aparece em destaque. Vazio → "Tema a definir". |
| Descrição | texto | Opcional. |
| Status | `Confirmado`, `A confirmar` ou `Rascunho` | **Rascunho** esconde o módulo e todas as aulas dele. **A confirmar** mostra um selo discreto. |

## Aba AULAS — uma linha por aula

| Coluna | Exemplo | Observação |
|---|---|---|
| Módulo | `7` | Obrigatório. |
| Dia do módulo | `2` | Útil enquanto não há data (aparece "Dia 2 · data a definir"). |
| Data | `19/08/2027` | DD/MM/AAAA. Pode ficar vazia. |
| Início / Fim | `14:00` / `18:00` | Também aceita `14h`, `14h30`. |
| Período | `Manhã`, `Tarde`, `Noite`, `Dia inteiro` | Usado quando ainda não há horário. |
| Tema da aula | `Preparos para restaurações indiretas` | Obrigatório. |
| Descrição | texto | Opcional. |
| Tipo | `Teórica`, `Laboratorial`, `Clínica`, `Hands-on`, `Demonstração`, `Discussão de caso`, `Outro` | Use lista suspensa. |
| Professor(es) | `João Silva; Maria Souza` | Separe por `;`, `,`, `e`, `+` ou `/`. Use os nomes da aba PROFESSORES (ou um apelido cadastrado lá). |
| Observações públicas | `Trazer modelos de estudo.` | **Aparece no portal.** |
| Status | `Confirmada`, `A confirmar`, `Rascunho` | Vazio = publicada normalmente. Rascunho = escondida. |
| Observações internas | texto | Nunca aparece. |

## Aba PROFESSORES

- **Professor**: nome completo como deve aparecer (ex.: `Thiago Fulano`). Gera o endereço `/professores/thiago-fulano`.
- **Apelidos**: como o nome é escrito nas AULAS, separado por vírgula (ex.: `Thiago, Thi`). Não aparece no portal.
  Se o nome curto for único (só um professor chamado "Thiago"), o vínculo é automático mesmo sem apelido.
- Professores **sem nenhuma aula publicada não aparecem** no portal (evita expor convites em negociação).
- Nome que aparece nas AULAS mas não existe em PROFESSORES ainda é publicado (só o nome) e gera um aviso no diagnóstico.

## Materiais × estoque

- Em MATERIAIS POR MÓDULO, a coluna **Material** deve ter exatamente o mesmo nome usado no ESTOQUE.
  Recomendado: **lista suspensa** com o intervalo `ESTOQUE!A2:A` (Dados → Validação de dados → Menu suspenso de um intervalo).
- Se houver dois itens com o mesmo nome e marcas diferentes, a coluna **Marca / Especificação** desempata.
- **Qtd. em estoque** e **Qtd. faltante** podem ser apagadas ou virar fórmula — o portal calcula sozinho:
  `faltam = necessário − estoque atual` → status **OK**, **Atenção** ou **Sem dados**.
- Status do estoque: **Insuficiente** (atual ≤ 0), **Baixo** (atual < mínimo), **OK**.

## Listas suspensas recomendadas (Dados → Validação de dados)

| Aba / coluna | Opções |
|---|---|
| AULAS › Tipo | Teórica, Laboratorial, Clínica, Hands-on, Demonstração, Discussão de caso, Outro |
| AULAS › Período | Manhã, Tarde, Noite, Dia inteiro |
| AULAS › Status | Confirmada, A confirmar, Rascunho |
| AULAS › Professor(es) | Intervalo `PROFESSORES!A2:A`, com **"Permitir várias seleções"** |
| MÓDULOS › Status | Confirmado, A confirmar, Rascunho |
| MATERIAIS POR MÓDULO › Material | Intervalo `ESTOQUE!A2:A` |

## Regra: a planilha é soberana

O portal **nunca deduz, completa, corrige ou renumera** datas, números de módulo, professores ou temas.

- Informação ausente → o portal mostra **“a confirmar”** (ex.: “Tema a confirmar”, “Datas a confirmar”, “Horário a confirmar”).
- Possível inconsistência → o dado aparece **como está**, com um selo “a confirmar”, e o problema é listado no
  diagnóstico (`/api/saude`) para a coordenação corrigir na planilha. Hoje o portal sinaliza:
  - **data fora do período do curso** ou fora das datas do módulo (a data é exibida com o ano, como está);
  - **número de módulo repetido** (os dois módulos são exibidos, com “Numeração a confirmar”).
- Mês sem ano (ex.: “MAI”) é exibido só como mês; o ano não é suposto.
- Nomes de professores aparecem exatamente como escritos na planilha até serem atualizados.

## Migração da grade atual (AULAS/PROFESSORES)

A grade antiga foi convertida para o formato novo em [`docs/migracao/`](migracao/), **sem deduções**:
textos copiados como estão, datas só onde a grade informa, nenhum tema criado.
Essa conversão é também a base da prévia do portal.

1. Crie as abas **MÓDULOS** e **AULAS** e importe `MODULOS.csv` e `AULAS.csv`
   (Arquivo → Importar → Upload → "Inserir nova(s) página(s)" e renomeie a aba).
2. Na aba PROFESSORES, acrescente as colunas **Apelidos** e **Bio curta** e cole as linhas de `PROFESSORES_novas_colunas.csv`
   (nomes exatamente como aparecem na grade). Quando quiser, troque pelo nome completo e coloque o nome curto em **Apelidos**.
3. Revise a coluna **Observações internas** das AULAS: ela explica cada ponto a confirmar.
4. A aba antiga AULAS/PROFESSORES pode ser mantida como histórico; o portal não a lê.

Como a conversão trata a grade:

- Um texto com “MANHÃ: … / TARDE: …” vira uma aula por período. Quando os professores são informados só para o dia
  (sem indicar manhã ou tarde), eles aparecem nas aulas daquele dia com o status **A confirmar**.
- Linhas que nomeiam o professor (ex.: “Thiago: smilecloud 2D”) vinculam aquele professor à aula.
- Tipo de aula só é preenchido quando a grade diz explicitamente (ex.: “CLINICA”). “TEORIA E HANDS ON” fica na descrição.
- A coluna **Módulo** das aulas do número 9 repetido traz o mês (“9 (OUT)”, “9 (NOV)”) para separar os dois blocos da grade.

Pontos que a coordenação precisa confirmar (aparecem como “a confirmar” no portal):

- **Módulo 4**: só o DIA 3 tem data, e ela é **22/05/2026** (ano diferente dos demais). O portal mostra essa data como está, sinalizada; os dias 1 e 2 aparecem “data a confirmar”.
- **Módulo 9 repetido**: a grade tem dois blocos numerados 9 (OUT e NOV). O portal mostra os dois, com “Numeração a confirmar”.
- **“Pino e”** (módulo 9 de outubro, dia 1): texto incompleto, exibido como está e marcado “A confirmar”.
- **Módulo 1, dia 3 (tarde)**: texto incompleto (“… buscar sempre finalizar com”), marcado “A confirmar”.
- **Módulos 4 a 9**: sem datas na grade → exibidos pelo mês (sem ano) com “Datas a confirmar”.
- **Nenhum módulo tem Tema principal** → “Tema a confirmar”.

## Editar pelo portal (área de edição)

Em `/coordenacao` (link “Área de edição” no rodapé do portal), professores e coordenação editam tudo pelo celular ou
computador. O que é salvo lá é gravado **nesta planilha**.

- Para um professor conseguir entrar, preencha o **E-mail** (conta Google) dele na aba PROFESSORES.
- O portal cria e usa uma coluna **ID** nas abas editadas. Não apague nem altere os IDs.
- Toda alteração feita pelo portal fica registrada na aba **HISTÓRICO** (criada automaticamente).
- Se alguém editar a mesma linha direto na planilha enquanto outra pessoa edita pelo portal, o portal não sobrescreve:
  pede para recarregar.
- Editar direto na planilha continua valendo normalmente.

## Forçar atualização imediata

Normalmente basta esperar até 5 minutos. Para atualizar na hora, peça a quem administra o portal
(ou use o menu da planilha, se configurado — ver README).
