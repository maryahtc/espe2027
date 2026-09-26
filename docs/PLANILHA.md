# Guia da planilha — para a coordenação

A planilha **continua sendo a fonte oficial**. O portal só lê; nada precisa ser digitado duas vezes.
Alterou a planilha → em até **5 minutos** o portal mostra a mudança.

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

## Migração da grade atual (AULAS/PROFESSORES)

A grade antiga foi convertida para o formato novo em [`docs/migracao/`](migracao/):

1. Crie as abas **MÓDULOS** e **AULAS** e importe `MODULOS.csv` e `AULAS.csv`
   (Arquivo → Importar → Upload → "Inserir nova(s) página(s)" e renomeie a aba).
2. Na aba PROFESSORES, acrescente as colunas **Apelidos** e **Bio curta** e cole as linhas de `PROFESSORES_novas_colunas.csv`.
   Depois troque a coluna **Professor** pelo nome completo — mantenha o nome curto em **Apelidos**.
3. Revise a coluna **Observações internas** das AULAS: ela guarda o texto original da grade e aponta o que foi interpretado.
4. A aba antiga AULAS/PROFESSORES pode ser mantida como histórico; o portal não a lê.

Pontos que precisam de confirmação (vieram assim da grade):

- **Módulo 4**: a única data era `22/05/2026` → convertido para 20–22/05/**2027** (dias 1 e 2 inferidos).
- **Módulo "9 / NOV"**: estava com o número 9 repetido → convertido para **módulo 10**.
- **Módulo 9, dia 1**: tema incompleto ("Pino e ") → está como **Rascunho** (não aparece).
- **Módulo 1, dia 1**: os professores estavam na linha do dia, sem indicar manhã/tarde → atribuídos às duas aulas.
- Módulos 5 a 10 ainda não têm datas → aparecem com o mês previsto.
- Nenhum módulo tem **Tema principal** ainda.

## Forçar atualização imediata

Normalmente basta esperar até 5 minutos. Para atualizar na hora, peça a quem administra o portal
(ou use o menu da planilha, se configurado — ver README).
