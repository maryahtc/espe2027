# Publicação do Bloco A — roteiro (runbook)

> **Status:** PREPARADO, NÃO EXECUTADO. Nenhum passo abaixo roda sem autorização explícita da Maryah.
> Escopo: migrações `20261123120000_pendencias` (B2 + Equipe operacional) e
> `20261124120000_professores_logistica` (B1), e o deploy do código da branch de desenvolvimento.
> Fora do escopo: carga da planilha, correções acadêmicas, mudança de plano do Supabase.

## Estado de partida (conferido em 24/11/2026)

| Item | Valor |
| --- | --- |
| Produção (Vercel) | branch `claude/upbeat-bohr-8heral` em `23653d8` (Etapa 10 · Parte 3) |
| Supabase de produção | `xzwdnanssqkrxkyntwes`, 17 migrações, versão `20261112120000_auditoria_producao` |
| Código a publicar | último commit verde de `claude/inspiring-volta-nbryhg` |
| Proteção do código antigo | o código em produção não usa as tabelas novas; o código novo só liga os módulos quando `health()` informa versão ≥ `20261123120000` (pendências) e ≥ `20261124120000` (logística) |

## Sequência

### 1. Backup e validação da recuperação — quem executa: Maryah (ou o workflow do GitHub, se ativado)

1. No computador da Maryah, com a URL do *session pooler* (Dashboard → Connect → Session pooler) só na variável
   de ambiente, nunca em arquivo:
   `SUPABASE_DB_URL='postgresql://…' ops/backup/backup.sh`
2. Ainda no computador dela (precisa de Docker): `ops/backup/restore-test.sh backups/<pasta>` → tem de terminar em
   **"✓ Restauração validada"** (impressão digital do backup = impressão digital da cópia restaurada).
3. Criptografar (`BACKUP_AGE_RECIPIENT`) e guardar a cópia fora do computador (Drive pessoal + 1 cópia offline).
4. Anotar a impressão digital impressa pelo backup (`fingerprint.txt`) — ela é a referência "antes".

**Se falhar:** não seguir. Erro de conexão → conferir URL do pooler/senha; restauração divergente → me enviar a
saída do `restore-test.sh` (nenhum dado pessoal sai do computador, só a lista de chaves divergentes).

### 2. Conferência de produção — somente leitura (Claude, via conector Supabase)

- `select public.health()` → versão `20261112120000_auditoria_producao`.
- `list_migrations` → 17 registros, último `20261112120000`.
- `ops/backup/fingerprint.sql` → tem de ser **igual** ao `fingerprint.txt` do passo 1 (prova que nada mudou entre o
  backup e a publicação). Diferente → refazer o passo 1.
- Conferir que não existem ainda `admin_tasks`, `ops_people`, `faculty_contacts`, `module_faculty_logistics`.

**Se falhar:** parar e reportar; nada foi alterado.

### 3. Migração B2 + Equipe operacional — `20261123120000_pendencias`

- Aplicar o arquivo do repositório, sem edição, com `apply_migration` (um único lote: se qualquer comando falhar,
  o Postgres desfaz tudo).
- Só cria: 3 tipos, 3 tabelas, 1 função-guarda, 2 funções de permissão, gatilhos, políticas, permissões; e
  atualiza a linha única de `schema_info`.

**Se falhar:** nada fica aplicado (transação desfeita). Reportar a mensagem de erro e parar.

### 4. Migração B1 — `20261124120000_professores_logistica`

- Idem, só depois do passo 3 concluído. Cria 3 tipos, 2 tabelas, guarda, 2 funções de permissão, gatilhos e políticas.

**Se falhar:** o passo 3 permanece (é inofensivo sozinho: o código novo liga só as pendências). Parar e reportar.

### 5. Versão no histórico

- O conector grava a migração com a hora da aplicação como versão. Corrigir **apenas** os dois registros novos em
  `supabase_migrations.schema_migrations` para `20261123120000` e `20261124120000` (precisa da mesma autorização
  dada na Etapa 10 · Parte 2 para o registro de `20261112120000`).
- Conferir: 19 registros, últimos dois = os nomes acima; `health()` → `20261124120000_professores_logistica`.

**Se falhar:** não afeta o funcionamento (o app lê `schema_info`, não o histórico); corrigir antes do próximo deploy.

### 6. Integridade dos dados existentes

- Rodar de novo `fingerprint.sql` com detalhe por chave e comparar com o "antes":
  - toda chave que existia antes tem de ter **o mesmo valor**, exceto `schema_info` (versão) e o próprio histórico de
    migrações;
  - as chaves novas são só dos objetos criados nos passos 3–4 (tabelas vazias);
  - `auth.users`, `storage.*`, módulos, atividades, docentes, equipes, entregas: inalterados.
- `get_advisors` (segurança): nenhum alerta novo.

**Se falhar:** não fazer o deploy; reportar a diferença (ver Contingência C).

### 7. Deploy

- Avançar `claude/upbeat-bohr-8heral` por *fast-forward* do `23653d8` até o commit validado (sem merge, sem reescrita).
- Acompanhar o deploy de Produção da Vercel pela API de deployments do GitHub até `success`.
- `GET /api/saude` → `ok`, versão do banco `20261124120000_professores_logistica`, `tasksReady` e `logisticsReady` verdadeiros.

**Se falhar o build:** produção continua no `23653d8` (a Vercel só troca quando o build termina). Corrigir na branch
de desenvolvimento e repetir.

### 8. Testes de fumaça autenticados — Maryah, com as contas reais (sem dados fictícios em produção)

| Conta | Verificar |
| --- | --- |
| Admin | Painel com indicadores; "Pendências" abre vazio; "Equipe operacional" abre; "Professores" lista os docentes; abrir um professor mostra a agenda; módulos, atividades e edição acadêmica abrem como antes |
| Coordenação | "Pendências" e "Professores" da própria turma (só leitura nas gerais); não abre `/admin/*` |
| Aluno | Início, agenda, módulos e biblioteca como antes; `/admin/*` e `/coordenacao/*` → 404 |
| Visitante | Site público igual; `/admin` redireciona para o login |

Cadastrar a primeira pendência real e a primeira pessoa da Equipe operacional só depois de todas as linhas acima ok.

## Contingência

| Situação | Ação |
| --- | --- |
| A. Falha no código após o deploy | Voltar a branch de deploy para `23653d8` (ou "Promote to Production" do deploy anterior na Vercel). As tabelas novas ficam no banco sem efeito: o código antigo não as conhece. |
| B. Migração aplicada, mas indesejada | Os objetos novos podem ser removidos por um script de reversão (`drop` só do que os passos 3–4 criaram, e `schema_info` de volta a `20261112120000_auditoria_producao`). É destrutivo: **só com autorização explícita**, e só enquanto as tabelas novas estiverem vazias ou com dados já exportados. |
| C. Dados existentes divergentes no passo 6 | Parar tudo, não fazer deploy, investigar pela lista de chaves. Restaurar do backup (passo 1) é o último recurso e exige autorização, pois sobrescreve produção. |
| D. Produção pausada / indisponível | Plano Free pausa após 7 dias sem uso: reativar pelo Dashboard; nenhum dado se perde. |

## Depois da publicação

- Backup semanal manual (ou diário via workflow `ops/backup/github-actions-backup.example.yml`, se ativado) e
  restauração de teste mensal.
- Cópias criptografadas com retenção de 30 dias + 1 cópia mensal guardada por 12 meses.
- Antes de qualquer migração futura: backup do dia + impressão digital "antes/depois", como acima.
