-- Etapa 10 · Parte 1 — auditoria do acesso à produção individual de um aluno (painel da coordenação/Admin).
-- Migração SÓ ADITIVA: uma função nova, suas permissões e a versão do esquema. Nenhuma tabela, coluna, política,
-- gatilho ou dado existente é alterado. Reaproveita a tabela audit_log da Etapa 6 e o mesmo padrão de log_case_view:
-- a auditoria é gravada ANTES de qualquer dado sair do banco, e a função devolve se a pessoa pode ver.
--
-- Regras (aprovadas em 12/11/2026):
-- - Identidade: só sessão autenticada (auth.uid()); visitante não executa.
-- - Permissão: admin ativo, ou coordenação ativa daquela turma (public.coordinates — a mesma regra que já dá à
--   coordenação a leitura dos casos da turma). Nenhuma permissão é ampliada.
-- - O aluno consultado precisa ser aluno da turma (matrícula ativa ou inativa).
-- - Registra quem acessou, qual aluno, a turma e o horário. Nunca dados clínicos nem identificadores de pacientes.
-- - Acesso recusado devolve false SEM gravar nada.

create or replace function public.log_student_production_view(p_student_id uuid, p_cohort_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or p_student_id is null or p_cohort_id is null then
    return false;
  end if;
  -- Admin ativo ou coordenação ativa desta turma (o próprio aluno, colegas e outras turmas ficam de fora).
  if not public.coordinates(p_cohort_id) then
    return false;
  end if;
  if not exists (
    select 1 from public.enrollments
    where user_id = p_student_id and cohort_id = p_cohort_id and role_in_cohort = 'aluno'
  ) then
    return false;
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, cohort_id, owner_id)
  values (v_actor, 'aluno.producao.abrir', 'profiles', p_student_id, p_cohort_id, p_student_id);
  return true;
end
$$;

revoke all on function public.log_student_production_view(uuid, uuid) from public, anon, authenticated;
grant execute on function public.log_student_production_view(uuid, uuid) to authenticated;

update public.schema_info set version = '20261112120000_auditoria_producao', updated_at = now();
