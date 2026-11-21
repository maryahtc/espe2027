# Divergências planilha-base × Portal Conexo

Registro permanente das diferenças encontradas entre a planilha "Cronograma Módulo Espe" (Google Drive, alterada em
19/11/2026) e o Portal Conexo em produção. Serve para revisão antes de arquivar a planilha (Bloco B).

**Regras deste registro (decisão da Maryah, 21/11/2026):**

- Nenhum dado da planilha é importado automaticamente.
- Nenhuma correção é aplicada em docentes, equipes, atividades, entregas ou cadastros acadêmicos de produção sem
  autorização explícita, item a item.
- Breda e Valeria **não** devem ser cadastrados por enquanto.
- Este arquivo só ganha linhas novas e atualizações de situação; nada é apagado.

## Como a comparação foi feita (21/11/2026)

- Planilha: abas DATAS e AULAS/PROFESSORES, só leitura, pelo conector do Google Drive.
- Portal: consultas somente de leitura (SELECT) no banco de produção, autorizadas pela Maryah para esta comparação.
- Referência da importação original: `packages/db/seeds/turma-2027.sql` (planejamento de 07/10/2026).

## Resultado geral

| Aspecto | Resultado |
|---|---|
| Datas (30 módulos, 90 dias) | Iguais. Os erros da planilha "7,8,2009" (dez/2028) e "22/05/2026" (M4, dia 3) já tinham correção aprovada; o portal está correto. |
| Horários | Iguais: nenhum lado tem horário; só manhã, tarde ou dia todo. Dado ainda a definir. |
| Temas | A planilha não tem tema por módulo. No portal, só o Módulo 1 tem tema (definido no Admin depois da importação). A EMENTA (46 itens) não está ligada a módulos. |
| Atividades | Títulos e turnos dos módulos 1 a 30 iguais. O portal só corrigiu a grafia. |
| Docentes e equipe | 8 divergências (abaixo). |
| Alterações no portal após a importação | 246 registros no histórico desde 08/10; ex.: tema do Módulo 1 e "Jo" inativado. |

## Divergências e situação

| # | Módulo | Planilha | Portal | Origem | Decisão (21/11/2026) | Situação |
|---|---|---|---|---|---|---|
| 1 | M5, dia 1 (Enceramento posterior) | Thiago, Tiradentes e Joester | Só Thiago | Planilha alterada após 07/10 | Manter pendente a inclusão de Tiradentes e Joester como docentes | **Pendente de validação** |
| 2 | M5, equipe | + Tiradentes, Joester | Thiago, Victor, Ricardo, Luciano | Planilha alterada após 07/10 | Manter pendente | **Pendente de validação** |
| 3 | M7, equipe | + Maryah, Clecila | Thiago, Victor, Ricardo, Luciano | Planilha alterada após 07/10 | Manter pendente | **Pendente de validação** |
| 4 | M8, equipe | + Meloto, Breda | Thiago, Victor, Ricardo, Luciano | Planilha alterada após 07/10; Breda não cadastrado | Manter pendente; **não cadastrar Breda** | **Pendente de validação** |
| 5 | M10, equipe | + Meloto, Valeria | Thiago, Victor, Ricardo, Luciano | Planilha alterada após 07/10; Valeria não cadastrada | Manter pendente; **não cadastrar Valeria** | **Pendente de validação** |
| 6 | M6, dia 3 (Injeção — hands-on) | "Thi e Vi" | Sem professor | Nome ambíguo na importação | Identidade confirmada: **Thiago e Victor** | Identificado; **alteração não autorizada** |
| 7 | M9, dia 3 (Classe I e Classe II) | "Jo e Raquel e Tiradentes" | Jo (inativo), Raquel, Gabriel Tiradentes | Importação + alteração no Admin | Identidade confirmada: **"Jo" = Joester** | Identificado; **alteração não autorizada** |
| 8 | M7, "dever de casa: reconstrução do preparo" | Coluna OBS EQUIPE | Entrega do aluno | Interpretação da importação | Classificação a revisar; preservar o registro atual | **Pendente de validação** |

### Detalhe do item 7 (verificado em 21/11/2026, só leitura)

| Cadastro | Situação | Conta no portal | Atividades vinculadas | Equipes | Histórico |
|---|---|---|---|---|---|
| Joester | ativo, docente | não | M11 dia 3 (Semidireta) | M6, M9 | criado em 07/10 pela importação |
| Jo | **inativo**, docente | não | **M9 dia 3 (Classe I e Classe II)** | nenhuma | criado em 07/10 pela importação; inativado no Admin em 23/10/2026 |

São dois registros distintos para a mesma pessoa. A atividade do M9 dia 3 ainda aponta para o registro inativo "Jo".
Quando autorizado, a correção seria trocar, só nessa atividade, "Jo" por "Joester", mantendo "Jo" inativo para preservar
o histórico. **Nada foi alterado.**

## Próximas revisões

- Itens 1 a 5 e 8: aguardam validação da Maryah.
- Itens 6 e 7: aguardam autorização para a alteração no Admin.
- Antes de arquivar a planilha (Bloco B): repetir esta comparação, porque a planilha continua editável.
