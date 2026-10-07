-- ⚠ NÃO EXECUTAR NO SUPABASE DE PRODUÇÃO (regra de 07/10/2026, ver AGENTS.md).
-- Rodar só no ambiente local (supabase start) ou no Postgres do CI.
-- Pré-cadastro da Turma 2027 a partir do planejamento enviado em 07/10/2026
-- ("Cronograma Módulo Espe – DATAS" e "– AULAS/PROFESSORES").
-- Tudo aqui é ponto de partida: datas, professores, programação e observações são editáveis pelo Admin.
-- Correções aprovadas: Módulo 4 = 20–22/05/2027 · Dez/2028 = 07–09/12/2028 · "Gi Borelli"/"Giovanna" =
-- Giovanna Borelli · "Tiradentes" = Gabriel Tiradentes. Nomes ambíguos (Jo, Lu, Marcelo, "Thi e Vi")
-- foram preservados como estão na planilha.
-- Títulos: "Módulo N" (definitivos serão escolhidos pela coordenação no Admin).
-- Execução única: recusa se a turma já tiver módulos.

do $$
declare
  v_cohort uuid := (select id from public.cohorts where slug = 'turma-2027');
  v_mod uuid;
  v_day uuid;
  v_ses uuid;
  v_dates date[];
  v_i int;
begin
  if v_cohort is null then
    raise exception 'Turma 2027 não encontrada.';
  end if;
  if exists (select 1 from public.modules where cohort_id = v_cohort) then
    raise exception 'A Turma 2027 já tem módulos; pré-cadastro não executado.';
  end if;

  -- ── Docentes e equipe, com os nomes como aparecem no material ──
  insert into public.faculty (full_name, display_name, kind)
  select n, n, k::public.faculty_kind
  from (values
    ('Maryah', 'docente'), ('Victor', 'docente'), ('Elber', 'docente'), ('Thiago', 'docente'), ('Rene', 'docente'),
    ('Lu', 'docente'), ('Marcelo', 'docente'), ('Caio', 'docente'), ('Clecila', 'docente'), ('Voigt', 'docente'),
    ('Joester', 'docente'), ('Jo', 'docente'), ('Raquel', 'docente'), ('Ricardo', 'equipe_clinica'),
    ('Luciano', 'equipe_clinica'), ('Meloto', 'equipe_clinica')
  ) v(n, k)
  where not exists (select 1 from public.faculty f where f.display_name = v.n);
  insert into public.faculty (full_name, display_name, kind)
  select 'Giovanna Borelli', 'Giovanna Borelli', 'docente'
  where not exists (select 1 from public.faculty where full_name = 'Giovanna Borelli');
  insert into public.faculty (full_name, display_name, kind)
  select 'Gabriel Tiradentes', 'Gabriel Tiradentes', 'docente'
  where not exists (select 1 from public.faculty where full_name = 'Gabriel Tiradentes');

  -- ── 30 módulos, 3 dias cada (quinta a sábado) ──
  for v_i in 1..30 loop
    v_dates := case v_i
      when 1 then array['2027-02-11','2027-02-12','2027-02-13']   when 2 then array['2027-03-18','2027-03-19','2027-03-20']
      when 3 then array['2027-04-22','2027-04-23','2027-04-24']   when 4 then array['2027-05-20','2027-05-21','2027-05-22']
      when 5 then array['2027-06-10','2027-06-11','2027-06-12']   when 6 then array['2027-07-22','2027-07-23','2027-07-24']
      when 7 then array['2027-08-19','2027-08-20','2027-08-21']   when 8 then array['2027-09-16','2027-09-17','2027-09-18']
      when 9 then array['2027-10-21','2027-10-22','2027-10-23']   when 10 then array['2027-11-25','2027-11-26','2027-11-27']
      when 11 then array['2027-12-09','2027-12-10','2027-12-11']  when 12 then array['2028-01-20','2028-01-21','2028-01-22']
      when 13 then array['2028-02-17','2028-02-18','2028-02-19']  when 14 then array['2028-03-23','2028-03-24','2028-03-25']
      when 15 then array['2028-04-27','2028-04-28','2028-04-29']  when 16 then array['2028-05-25','2028-05-26','2028-05-27']
      when 17 then array['2028-06-22','2028-06-23','2028-06-24']  when 18 then array['2028-07-20','2028-07-21','2028-07-22']
      when 19 then array['2028-08-24','2028-08-25','2028-08-26']  when 20 then array['2028-09-21','2028-09-22','2028-09-23']
      when 21 then array['2028-10-19','2028-10-20','2028-10-21']  when 22 then array['2028-11-23','2028-11-24','2028-11-25']
      when 23 then array['2028-12-07','2028-12-08','2028-12-09']  when 24 then array['2029-01-18','2029-01-19','2029-01-20']
      when 25 then array['2029-02-22','2029-02-23','2029-02-24']  when 26 then array['2029-03-22','2029-03-23','2029-03-24']
      when 27 then array['2029-04-26','2029-04-27','2029-04-28']  when 28 then array['2029-05-24','2029-05-25','2029-05-26']
      when 29 then array['2029-06-21','2029-06-22','2029-06-23']  else array['2029-07-19','2029-07-20','2029-07-21']
    end::date[];
    insert into public.modules (cohort_id, position, number, title, status)
    values (v_cohort, v_i, v_i, 'Módulo ' || v_i, 'rascunho')
    returning id into v_mod;
    insert into public.module_days (module_id, date, label)
    select v_mod, v_dates[d], 'Dia ' || d from generate_series(1, 3) d;
  end loop;
end
$$;

-- ── Programação, professores, equipe e observações (módulos com conteúdo no material) ──
create function pg_temp.mod(p_n int) returns uuid language sql as $$
  select id from public.modules where number = p_n and cohort_id = (select id from public.cohorts where slug = 'turma-2027')
$$;
create function pg_temp.dia(p_n int, p_d int) returns uuid language sql as $$
  select id from public.module_days where module_id = pg_temp.mod(p_n) and label = 'Dia ' || p_d
$$;
create function pg_temp.fac(p_name text) returns uuid language sql as $$
  select id from public.faculty where display_name = p_name
$$;
-- Atividade com professores (lista separada por vírgula; sufixo "?" = a confirmar).
create function pg_temp.ativ(p_n int, p_d int, p_period text, p_title text, p_type text, p_profs text, p_pos int default 0)
returns void language plpgsql as $$
declare v_ses uuid; v_p text;
begin
  insert into public.module_sessions (module_id, day_id, period, title, activity_type, position)
  values (pg_temp.mod(p_n), pg_temp.dia(p_n, p_d), p_period::public.day_period, p_title, p_type::public.activity_type, p_pos)
  returning id into v_ses;
  if p_profs <> '' then
    foreach v_p in array string_to_array(p_profs, ',') loop
      insert into public.session_faculty (session_id, module_id, faculty_id, tentative)
      values (v_ses, pg_temp.mod(p_n), pg_temp.fac(btrim(replace(v_p, '?', ''))), v_p like '%?%');
    end loop;
  end if;
end
$$;
create function pg_temp.equipe(p_n int, p_names text) returns void language plpgsql as $$
declare v_p text; v_i int := 0;
begin
  foreach v_p in array string_to_array(p_names, ',') loop
    v_i := v_i + 1;
    insert into public.module_staff (module_id, faculty_id, role, visible_to_students, position)
    values (pg_temp.mod(p_n), pg_temp.fac(btrim(v_p)), 'equipe_clinica', true, v_i);
  end loop;
end
$$;
create function pg_temp.obs(p_n int, p_text text) returns void language sql as $$
  insert into public.module_internal_notes (module_id, notes) values (pg_temp.mod(p_n), p_text)
  on conflict (module_id) do update set notes = public.module_internal_notes.notes || chr(10) || excluded.notes
$$;

-- Módulo 1 · fevereiro/2027
select pg_temp.ativ(1, 1, 'manha', 'Abertura: primeira consulta / inteligência', 'outro', 'Maryah,Victor,Elber', 1);
select pg_temp.ativ(1, 1, 'tarde', 'Fotografia teórica', 'teorica', 'Maryah,Victor,Elber', 2);
select pg_temp.ativ(1, 2, 'manha', 'Documentação complementar (tomo, Rx) — mostrar casos', 'clinica', 'Thiago,Victor,Elber,Rene', 1);
select pg_temp.ativ(1, 2, 'tarde', 'Fotografia e anamnese', 'clinica', 'Thiago,Victor,Elber,Rene', 2);
select pg_temp.ativ(1, 3, 'manha', 'Continuação', 'outro', 'Lu,Marcelo', 1);
select pg_temp.ativ(1, 3, 'tarde', 'Explicação da prática e finalização (Lu do ateliê oral — entrevista)', 'outro', 'Lu,Marcelo', 2);
select pg_temp.equipe(1, 'Elber,Thiago,Victor,Ricardo,Luciano,Maryah');
insert into public.module_deliverables (module_id, title, phase, position) values (pg_temp.mod(1), 'Anamnese, foto', 'durante', 1);
select pg_temp.obs(1, 'Materiais (planilha): ver com o Marlon para levar mais equipamentos.' || chr(10) ||
  'Equipe: direcionar para o Marlon as compras dos alunos — onde comprar e o que levar nos primeiros módulos.' || chr(10) ||
  'Entregáveis (texto original da planilha): "anamnese, foto omo".' || chr(10) ||
  'Professores do dia 3 na planilha: "Lu atelie/Marcelo".');

-- Módulo 2 · março/2027
select pg_temp.ativ(2, 1, 'manha', 'IA em exames de imagem', 'teorica', 'Caio', 1);
select pg_temp.ativ(2, 1, 'tarde', 'Escaneamento (teórica e prática)', 'pratica', 'Victor', 2);
select pg_temp.ativ(2, 2, 'dia_todo', 'Aula de JIG e prática de JIG', 'pratica', 'Clecila', 1);
select pg_temp.ativ(2, 3, 'dia_todo', 'Prática de escaneamento (JIG etc.)', 'pratica', 'Victor', 1);
select pg_temp.equipe(2, 'Thiago,Victor,Ricardo,Luciano,Clecila');
select pg_temp.obs(2, 'Ver com empresas de scanner no IOA (Sirona/Straumann/3Shape); já conferir se todos estão com o Smile pronto.');

-- Módulo 3 · abril/2027
select pg_temp.ativ(3, 1, 'dia_todo', 'Smile Cloud (smile design)', 'outro', 'Thiago', 1);
select pg_temp.ativ(3, 2, 'dia_todo', 'Smile Cloud (Blueprint)', 'outro', 'Thiago', 1);
select pg_temp.ativ(3, 3, 'dia_todo', 'Smile Cloud (casos)', 'outro', 'Thiago', 1);
select pg_temp.equipe(3, 'Thiago,Victor,Ricardo,Luciano,Maryah');
select pg_temp.obs(3, 'Falar com Florin para aula online.');

-- Módulo 4 · maio/2027
select pg_temp.ativ(4, 1, 'dia_todo', 'Marketing + gestão', 'outro', 'Giovanna Borelli,Maryah', 1);
select pg_temp.ativ(4, 2, 'manha', 'Adesão', 'outro', 'Clecila', 1);
select pg_temp.ativ(4, 2, 'tarde', 'Sistema cerâmico', 'outro', 'Clecila', 2);
select pg_temp.ativ(4, 3, 'dia_todo', 'Enceramento analógico anterior (anatomia / hands-on)', 'hands_on', 'Thiago', 1);
select pg_temp.equipe(4, 'Thiago,Victor,Ricardo,Luciano,Maryah,Giovanna Borelli,Clecila');
select pg_temp.obs(4, 'Falar mais sobre venda com Smile Cloud.' || chr(10) ||
  'Datas: a planilha de aulas indicava 22/05/2026 no dia 3; considerado 20–22/05/2027 (planilha de datas).');

-- Módulo 5 · junho/2027
select pg_temp.ativ(5, 1, 'dia_todo', 'Enceramento analógico posterior (anatomia / hands-on)', 'hands_on', 'Thiago', 1);
select pg_temp.ativ(5, 2, 'dia_todo', 'Hands-on resina anterior', 'hands_on', 'Thiago', 1);
select pg_temp.ativ(5, 3, 'dia_todo', 'Hands-on resina posterior', 'hands_on', 'Thiago', 1);
select pg_temp.equipe(5, 'Thiago,Victor,Ricardo,Luciano');
select pg_temp.obs(5, 'Ideia: ser mais coroa — reconstrução total anterior e posterior.');

-- Módulo 6 · julho/2027
select pg_temp.ativ(6, 1, 'dia_todo', 'Isolamento e preenchimento', 'outro', 'Voigt?', 1);
select pg_temp.ativ(6, 1, 'noite', 'Pré-clínica (orientação)', 'outro', 'Voigt?', 2);
select pg_temp.ativ(6, 3, 'dia_todo', 'Injeção — hands-on', 'hands_on', '', 1);
select pg_temp.equipe(6, 'Thiago,Victor,Ricardo,Raquel,Joester,Luciano,Meloto,Gabriel Tiradentes');
select pg_temp.obs(6, 'Professor do dia 1 na planilha: "Voigt (?)" — marcado como a confirmar.' || chr(10) ||
  'Professores do dia 3 na planilha: "Thi e Vi" — vincular no Admin.');

-- Módulo 7 · agosto/2027
select pg_temp.ativ(7, 1, 'dia_todo', 'Preparo parcial — teórica e hands-on', 'hands_on', '', 1);
select pg_temp.ativ(7, 3, 'dia_todo', 'Preparo laminado — teórica', 'teorica', 'Victor', 1);
select pg_temp.equipe(7, 'Thiago,Victor,Ricardo,Luciano');
insert into public.module_deliverables (module_id, title, phase, position) values (pg_temp.mod(7), 'Dever de casa: reconstrução do preparo', 'depois', 1);

-- Módulo 8 · setembro/2027
select pg_temp.ativ(8, 1, 'dia_todo', 'Hands-on de preparo de faceta e escaneamento', 'hands_on', '', 1);
select pg_temp.ativ(8, 3, 'dia_todo', 'Hands-on restaurações parciais em resina composta', 'hands_on', 'Thiago', 1);
select pg_temp.equipe(8, 'Thiago,Victor,Ricardo,Luciano');
select pg_temp.obs(8, 'Planilha de datas: "ver sobre index".');

-- Módulo 9 · outubro/2027
select pg_temp.ativ(9, 1, 'dia_todo', 'Hands-on de preparo de coroa', 'hands_on', '', 1);
select pg_temp.ativ(9, 3, 'dia_todo', 'Classe I e Classe II — hands-on', 'hands_on', 'Jo,Raquel,Gabriel Tiradentes', 1);
select pg_temp.equipe(9, 'Thiago,Victor,Ricardo,Luciano,Joester,Raquel,Gabriel Tiradentes');

-- Módulo 10 · novembro/2027
select pg_temp.ativ(10, 1, 'dia_todo', 'Pino — teoria e hands-on', 'hands_on', '', 1);
select pg_temp.ativ(10, 3, 'dia_todo', 'Hands-on faceta de resina — escurecido', 'hands_on', '', 1);
select pg_temp.equipe(10, 'Thiago,Victor,Ricardo,Luciano');

-- Módulo 11 · dezembro/2027
select pg_temp.ativ(11, 1, 'dia_todo', 'PSI', 'outro', 'Victor', 1);
select pg_temp.ativ(11, 3, 'dia_todo', 'Semidireta', 'outro', 'Joester,Gabriel Tiradentes', 1);
select pg_temp.equipe(11, 'Thiago,Victor,Ricardo,Luciano');

-- Clínica no dia 2 dos módulos 6 a 30; equipe padrão dos módulos 12 a 30.
select pg_temp.ativ(n, 2, 'dia_todo', 'Clínica', 'clinica', '', 1) from generate_series(6, 30) n;
select pg_temp.equipe(n, 'Thiago,Victor,Ricardo,Luciano') from generate_series(12, 30) n;

-- Publica os 30 módulos (as datas entram antes, para não marcar "data alterada").
update public.modules set status = 'publicado'
 where cohort_id = (select id from public.cohorts where slug = 'turma-2027');

select (select count(*) from public.modules m join public.cohorts c on c.id = m.cohort_id where c.slug = 'turma-2027') as modulos,
       (select count(*) from public.module_days d join public.modules m on m.id = d.module_id join public.cohorts c on c.id = m.cohort_id where c.slug = 'turma-2027') as dias,
       (select count(*) from public.module_sessions s join public.modules m on m.id = s.module_id join public.cohorts c on c.id = m.cohort_id where c.slug = 'turma-2027') as atividades,
       (select count(*) from public.faculty) as docentes_e_equipe;
