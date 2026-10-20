-- Etapa 6 · ajuste final — odontograma (posições FDI) e arcada no registro.
-- Migração só aditiva: 2 tipos, 1 coluna em procedure_steps, 1 coluna em performed_procedures, 2 gatilhos novos,
-- 2 colunas no fim da visão da Produção. Nada é renomeado ou apagado; os registros existentes ficam como estão.
--
-- Conceito (aprovado em 21/10/2026):
-- - A UNIDADE da etapa diz como se conta (dente, peça, arcada, caso). A LOCALIZAÇÃO diz o que o aluno identifica
--   no registro: posições FDI ('dentes'), a arcada ('arcada') ou nada ('nenhuma').
-- - Unidade dente → dentes; arcada → arcada; caso → nenhuma (fixas). Unidade peça → escolhida etapa a etapa
--   (ex.: laminado/coroa → dentes; placa oclusal → arcada). Não existe regra global "peça = dente".
-- - FDI é só posição (inclui a posição de um elemento protético/pôntico): nenhuma condição, diagnóstico ou face.
-- - Arcada: superior, inferior ou ambas; obrigatória em registro novo de etapa por arcada; quantidade 1 ou 2.
-- - Com posições FDI marcadas, a quantidade é o número de posições (não editável).
-- - Dentes ou arcada onde a etapa não identifica isso: recusado com mensagem (nunca descartado em silêncio).

create type public.step_location as enum ('dentes', 'arcada', 'nenhuma');
create type public.dental_arch as enum ('superior', 'inferior', 'ambas');

-- ─── Etapas: localização ──────────────────────────────────────────────────────────────────────────
alter table public.procedure_steps add column location public.step_location not null default 'nenhuma';

-- Preenchimento: pela unidade; nas etapas por peça, conforme aprovado (placa oclusal → arcada; demais → dentes).
update public.procedure_steps s
   set location = case
     when s.unit = 'dente' then 'dentes'::public.step_location
     when s.unit = 'arcada' then 'arcada'::public.step_location
     when s.unit = 'peca' and exists (
       select 1 from public.procedures p where p.id = s.procedure_id and p.slug = 'placa-oclusal'
     ) then 'arcada'::public.step_location
     when s.unit = 'peca' then 'dentes'::public.step_location
     else 'nenhuma'::public.step_location
   end
 where s.location is distinct from (case
     when s.unit = 'dente' then 'dentes'::public.step_location
     when s.unit = 'arcada' then 'arcada'::public.step_location
     when s.unit = 'peca' and exists (
       select 1 from public.procedures p where p.id = s.procedure_id and p.slug = 'placa-oclusal'
     ) then 'arcada'::public.step_location
     when s.unit = 'peca' then 'dentes'::public.step_location
     else 'nenhuma'::public.step_location
   end);

alter table public.procedure_steps add constraint procedure_steps_location_check check (
  (unit = 'dente' and location = 'dentes')
  or (unit = 'arcada' and location = 'arcada')
  or (unit = 'caso' and location = 'nenhuma')
  or unit = 'peca'
);

-- Fora das etapas por peça, a localização acompanha a unidade (inclusive se a unidade for trocada no Admin).
create or replace function public.procedure_steps_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.unit = 'dente' then
    new.location := 'dentes';
  elsif new.unit = 'arcada' then
    new.location := 'arcada';
  elsif new.unit = 'caso' then
    new.location := 'nenhuma';
  end if;
  return new;
end
$$;
create trigger procedure_steps_location before insert or update of unit, location on public.procedure_steps
  for each row execute function public.procedure_steps_location();

-- ─── Registros: arcada ────────────────────────────────────────────────────────────────────────────
alter table public.performed_procedures add column arch public.dental_arch;

-- Coerência do registro com a localização da etapa. Roda antes do gatilho que já existe (ordem alfabética).
-- Em alteração, só confere quando muda o que importa (registros antigos continuam editáveis/removíveis).
create or replace function public.performed_procedures_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location public.step_location;
begin
  if tg_op = 'UPDATE'
     and new.step_id is not distinct from old.step_id
     and new.teeth is not distinct from old.teeth
     and new.arch is not distinct from old.arch
     and new.quantity is not distinct from old.quantity then
    return new;
  end if;
  select location into v_location from public.procedure_steps where id = new.step_id;
  if not found then
    raise exception 'Etapa inexistente.' using errcode = '23503';
  end if;

  if v_location = 'dentes' then
    if new.arch is not null then
      raise exception 'Esta etapa identifica posições FDI, não arcada.' using errcode = '23514';
    end if;
    if cardinality(new.teeth) > 0 then
      new.quantity := cardinality(new.teeth);
    end if;
  elsif v_location = 'arcada' then
    if cardinality(new.teeth) > 0 then
      raise exception 'Esta etapa não identifica dentes: informe a arcada.' using errcode = '23514';
    end if;
    if new.arch is null and (tg_op = 'INSERT' or old.arch is not null) then
      raise exception 'Informe a arcada: superior, inferior ou ambas.' using errcode = '23514';
    end if;
    if new.arch is not null then
      new.quantity := case when new.arch = 'ambas' then 2 else 1 end;
    end if;
  else
    if cardinality(new.teeth) > 0 then
      raise exception 'Esta etapa não identifica dentes.' using errcode = '23514';
    end if;
    if new.arch is not null then
      raise exception 'Esta etapa não identifica arcada.' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger performed_procedures_location before insert or update on public.performed_procedures
  for each row execute function public.performed_procedures_location();

revoke all on function public.performed_procedures_location(), public.procedure_steps_location() from public, anon, authenticated;

-- ─── Base da Produção (Etapa 9): arcada e localização no fim da visão (colunas existentes intactas) ──────
create or replace view public.active_performed_procedures
with (security_invoker = true) as
select pp.id, pp.case_id, pp.owner_id, pp.cohort_id, pp.step_id, pp.procedure_id, p.category_id, p.kind,
       s.unit, s.completes, pp.performed_on, pp.quantity, pp.teeth, pp.module_id,
       pp.arch, s.location
from public.performed_procedures pp
join public.clinical_cases c on c.id = pp.case_id
join public.procedure_steps s on s.id = pp.step_id
join public.procedures p on p.id = pp.procedure_id
where pp.removed_at is null and c.removed_at is null;

update public.schema_info set version = '20261021120000_odontograma_arcada', updated_at = now();
