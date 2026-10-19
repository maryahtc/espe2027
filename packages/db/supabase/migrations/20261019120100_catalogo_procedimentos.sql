-- Etapa 6 · Parte 1 — catálogo inicial de procedimentos e etapas clínicas.
-- Versão EXATA aprovada pela Maryah em 13/10/2026 (com o ajuste dos clareamentos: só experiência, sem "Finalização").
-- Só inserções (aditiva). Nenhum vínculo com temas: o admin define em Admin → Procedimentos.
-- Unidades: preparo = dente; cimentação/restauração indireta = peça; escaneamento e moldagem = arcada;
-- procedimentos gerais = caso. Em cirurgia e implantes, "dente" = posição/sítio (FDI).

insert into public.procedure_categories (name, slug, position) values
  ('Diagnóstico, planejamento e registros', 'diagnostico-planejamento-e-registros', 1),
  ('Dentística direta', 'dentistica-direta', 2),
  ('Restaurações indiretas', 'restauracoes-indiretas', 3),
  ('Núcleos e pinos', 'nucleos-e-pinos', 4),
  ('Endodontia', 'endodontia', 5),
  ('Cirurgia e implantes', 'cirurgia-e-implantes', 6),
  ('Prótese sobre implante', 'protese-sobre-implante', 7),
  ('Periodontia estética', 'periodontia-estetica', 8),
  ('Prótese removível', 'protese-removivel', 9),
  ('Oclusão', 'oclusao', 10),
  ('Clareamento e manchas', 'clareamento-e-manchas', 11),
  ('Outros', 'outros', 12)
on conflict (slug) do nothing;

with p (category, name, slug, kind, synonyms, position) as (values
  -- A. Diagnóstico, planejamento e registros (geral: só experiência)
  ('diagnostico-planejamento-e-registros', 'Exame clínico e plano de tratamento', 'exame-clinico-e-plano-de-tratamento', 'geral', array['avaliação', 'primeira consulta', 'plano de tratamento'], 1),
  ('diagnostico-planejamento-e-registros', 'Documentação fotográfica', 'documentacao-fotografica', 'geral', array['fotos', 'protocolo fotográfico'], 2),
  ('diagnostico-planejamento-e-registros', 'Escaneamento intraoral', 'escaneamento-intraoral', 'geral', array['scanner', 'escaneamento digital', 'moldagem digital'], 3),
  ('diagnostico-planejamento-e-registros', 'Moldagem convencional', 'moldagem-convencional', 'geral', array['moldagem', 'silicone de adição', 'poliéter'], 4),
  ('diagnostico-planejamento-e-registros', 'Planejamento digital do sorriso', 'planejamento-digital-do-sorriso', 'geral', array['DSD', 'smile design'], 5),
  ('diagnostico-planejamento-e-registros', 'Enceramento diagnóstico', 'enceramento-diagnostico', 'geral', array['enceramento', 'wax-up'], 6),
  ('diagnostico-planejamento-e-registros', 'Mock-up', 'mock-up', 'geral', array['ensaio restaurador', 'test drive'], 7),
  ('diagnostico-planejamento-e-registros', 'Registro oclusal / montagem em articulador', 'registro-oclusal-montagem-em-articulador', 'geral', array['JIG', 'arco facial', 'articulador'], 8),
  -- B. Dentística direta (etapa única que conclui)
  ('dentistica-direta', 'Restauração em resina — anterior', 'restauracao-em-resina-anterior', 'tratamento', array['resina anterior', 'classe III', 'classe IV'], 1),
  ('dentistica-direta', 'Restauração em resina — posterior', 'restauracao-em-resina-posterior', 'tratamento', array['resina posterior', 'classe I', 'classe II'], 2),
  ('dentistica-direta', 'Restauração cervical (classe V / LCNC)', 'restauracao-cervical-classe-v-lcnc', 'tratamento', array['classe V', 'abfração', 'lesão cervical'], 3),
  ('dentistica-direta', 'Faceta direta em resina', 'faceta-direta-em-resina', 'tratamento', array['faceta em resina', 'lente de resina'], 4),
  ('dentistica-direta', 'Recontorno / acréscimo em resina', 'recontorno-acrescimo-em-resina', 'tratamento', array['fechamento de diastema', 'recontorno cosmético'], 5),
  ('dentistica-direta', 'Resina injetável', 'resina-injetavel', 'tratamento', array['técnica injetável', 'injection molding'], 6),
  ('dentistica-direta', 'Reparo de restauração', 'reparo-de-restauracao', 'tratamento', array['reparo'], 7),
  -- C. Restaurações indiretas
  ('restauracoes-indiretas', 'Laminado cerâmico', 'laminado-ceramico', 'tratamento', array['lente de contato dental', 'faceta cerâmica', 'faceta de porcelana'], 1),
  ('restauracoes-indiretas', 'Coroa total', 'coroa-total', 'tratamento', array['coroa cerâmica', 'zircônia', 'dissilicato', 'coroa'], 2),
  ('restauracoes-indiretas', 'Inlay / onlay / overlay', 'inlay-onlay-overlay', 'tratamento', array['restauração parcial indireta', 'onlay', 'overlay'], 3),
  ('restauracoes-indiretas', 'Restauração semidireta', 'restauracao-semidireta', 'tratamento', array['semidireta', 'resina indireta'], 4),
  ('restauracoes-indiretas', 'Prótese parcial fixa (dentossuportada)', 'protese-parcial-fixa-dentossuportada', 'tratamento', array['ponte', 'PPF'], 5),
  -- D. Núcleos e pinos (etapa única que conclui)
  ('nucleos-e-pinos', 'Pino de fibra de vidro', 'pino-de-fibra-de-vidro', 'tratamento', array['pino intrarradicular', 'pino de fibra'], 1),
  ('nucleos-e-pinos', 'Núcleo metálico fundido', 'nucleo-metalico-fundido', 'tratamento', array['NMF'], 2),
  ('nucleos-e-pinos', 'Reconstrução coronária', 'reconstrucao-coronaria', 'tratamento', array['build-up', 'núcleo de preenchimento'], 3),
  -- E. Endodontia
  ('endodontia', 'Tratamento endodôntico', 'tratamento-endodontico', 'tratamento', array['canal', 'endo', 'tratamento de canal'], 1),
  ('endodontia', 'Retratamento endodôntico', 'retratamento-endodontico', 'tratamento', array['retratamento', 'refazer canal'], 2),
  -- F. Cirurgia e implantes
  ('cirurgia-e-implantes', 'Exodontia', 'exodontia', 'tratamento', array['extração'], 1),
  ('cirurgia-e-implantes', 'Implante', 'implante', 'tratamento', array['implante osseointegrado', 'fixture'], 2),
  ('cirurgia-e-implantes', 'Enxerto ósseo', 'enxerto-osseo', 'tratamento', array['enxerto', 'regeneração óssea', 'ROG'], 3),
  ('cirurgia-e-implantes', 'Enxerto de tecido mole', 'enxerto-de-tecido-mole', 'tratamento', array['enxerto gengival', 'conjuntivo', 'enxerto livre'], 4),
  -- G. Prótese sobre implante
  ('protese-sobre-implante', 'Coroa sobre implante', 'coroa-sobre-implante', 'tratamento', array['prótese sobre implante unitária'], 1),
  ('protese-sobre-implante', 'Prótese fixa total sobre implantes', 'protese-fixa-total-sobre-implantes', 'tratamento', array['protocolo', 'all-on-4', 'prótese híbrida'], 2),
  -- H. Periodontia estética
  ('periodontia-estetica', 'Gengivoplastia / recontorno gengival', 'gengivoplastia-recontorno-gengival', 'tratamento', array['gengivoplastia', 'recontorno gengival'], 1),
  ('periodontia-estetica', 'Aumento de coroa clínica', 'aumento-de-coroa-clinica', 'tratamento', array['ACC', 'cirurgia periodontal', 'osteotomia'], 2),
  -- I. Prótese removível
  ('protese-removivel', 'Prótese removível (total ou parcial)', 'protese-removivel-total-ou-parcial', 'tratamento', array['dentadura', 'PT', 'PPR'], 1),
  -- J. Oclusão
  ('oclusao', 'Placa oclusal', 'placa-oclusal', 'tratamento', array['placa miorrelaxante', 'placa de bruxismo'], 1),
  ('oclusao', 'Ajuste oclusal', 'ajuste-oclusal', 'tratamento', array['desgaste seletivo'], 2),
  -- K. Clareamento e manchas (clareamentos: só experiência)
  ('clareamento-e-manchas', 'Clareamento de consultório', 'clareamento-de-consultorio', 'tratamento', array['clareamento', 'branqueamento'], 1),
  ('clareamento-e-manchas', 'Clareamento caseiro supervisionado', 'clareamento-caseiro-supervisionado', 'tratamento', array['clareamento de moldeira'], 2),
  ('clareamento-e-manchas', 'Clareamento interno', 'clareamento-interno', 'tratamento', array['dente não vital', 'walking bleach'], 3),
  ('clareamento-e-manchas', 'Microabrasão / infiltração resinosa', 'microabrasao-infiltracao-resinosa', 'tratamento', array['mancha branca', 'infiltrante'], 4),
  -- L. Outros (só experiência, descrição obrigatória)
  ('outros', 'Outro procedimento', 'outro-procedimento', 'geral', array[]::text[], 1)
)
insert into public.procedures (category_id, name, slug, kind, synonyms, position)
select c.id, p.name, p.slug, p.kind::public.procedure_kind, p.synonyms, p.position
from p join public.procedure_categories c on c.slug = p.category
on conflict (slug) do nothing;

with s (procedure, name, slug, unit, completes, requires_description, position) as (values
  -- A. etapa única, só experiência
  ('exame-clinico-e-plano-de-tratamento', 'Exame clínico e plano de tratamento', 'exame-clinico-e-plano-de-tratamento', 'caso', false, false, 1),
  ('documentacao-fotografica', 'Documentação fotográfica', 'documentacao-fotografica', 'caso', false, false, 1),
  ('escaneamento-intraoral', 'Escaneamento intraoral', 'escaneamento-intraoral', 'arcada', false, false, 1),
  ('moldagem-convencional', 'Moldagem convencional', 'moldagem-convencional', 'arcada', false, false, 1),
  ('planejamento-digital-do-sorriso', 'Planejamento digital do sorriso', 'planejamento-digital-do-sorriso', 'caso', false, false, 1),
  ('enceramento-diagnostico', 'Enceramento diagnóstico', 'enceramento-diagnostico', 'dente', false, false, 1),
  ('mock-up', 'Mock-up', 'mock-up', 'caso', false, false, 1),
  ('registro-oclusal-montagem-em-articulador', 'Registro oclusal / montagem em articulador', 'registro-oclusal-montagem-em-articulador', 'caso', false, false, 1),
  -- B. etapa única que conclui (dente)
  ('restauracao-em-resina-anterior', 'Restauração em resina — anterior', 'restauracao-em-resina-anterior', 'dente', true, false, 1),
  ('restauracao-em-resina-posterior', 'Restauração em resina — posterior', 'restauracao-em-resina-posterior', 'dente', true, false, 1),
  ('restauracao-cervical-classe-v-lcnc', 'Restauração cervical (classe V / LCNC)', 'restauracao-cervical-classe-v-lcnc', 'dente', true, false, 1),
  ('faceta-direta-em-resina', 'Faceta direta em resina', 'faceta-direta-em-resina', 'dente', true, false, 1),
  ('recontorno-acrescimo-em-resina', 'Recontorno / acréscimo em resina', 'recontorno-acrescimo-em-resina', 'dente', true, false, 1),
  ('resina-injetavel', 'Resina injetável', 'resina-injetavel', 'dente', true, false, 1),
  ('reparo-de-restauracao', 'Reparo de restauração', 'reparo-de-restauracao', 'dente', true, false, 1),
  -- C. Restaurações indiretas
  ('laminado-ceramico', 'Preparo', 'preparo', 'dente', false, false, 1),
  ('laminado-ceramico', 'Provisório', 'provisorio', 'peca', false, false, 2),
  ('laminado-ceramico', 'Cimentação', 'cimentacao', 'peca', true, false, 3),
  ('coroa-total', 'Preparo', 'preparo', 'dente', false, false, 1),
  ('coroa-total', 'Provisório', 'provisorio', 'peca', false, false, 2),
  ('coroa-total', 'Cimentação', 'cimentacao', 'peca', true, false, 3),
  ('inlay-onlay-overlay', 'Preparo', 'preparo', 'dente', false, false, 1),
  ('inlay-onlay-overlay', 'Provisório', 'provisorio', 'peca', false, false, 2),
  ('inlay-onlay-overlay', 'Cimentação', 'cimentacao', 'peca', true, false, 3),
  ('restauracao-semidireta', 'Preparo', 'preparo', 'dente', false, false, 1),
  ('restauracao-semidireta', 'Cimentação', 'cimentacao', 'peca', true, false, 2),
  ('protese-parcial-fixa-dentossuportada', 'Preparo de pilar', 'preparo-de-pilar', 'dente', false, false, 1),
  ('protese-parcial-fixa-dentossuportada', 'Provisório', 'provisorio', 'peca', false, false, 2),
  ('protese-parcial-fixa-dentossuportada', 'Cimentação', 'cimentacao', 'peca', true, false, 3),
  -- D. Núcleos e pinos
  ('pino-de-fibra-de-vidro', 'Pino de fibra de vidro', 'pino-de-fibra-de-vidro', 'dente', true, false, 1),
  ('nucleo-metalico-fundido', 'Núcleo metálico fundido', 'nucleo-metalico-fundido', 'dente', true, false, 1),
  ('reconstrucao-coronaria', 'Reconstrução coronária', 'reconstrucao-coronaria', 'dente', true, false, 1),
  -- E. Endodontia
  ('tratamento-endodontico', 'Sessão de tratamento', 'sessao-de-tratamento', 'dente', false, false, 1),
  ('tratamento-endodontico', 'Obturação', 'obturacao', 'dente', true, false, 2),
  ('retratamento-endodontico', 'Sessão de tratamento', 'sessao-de-tratamento', 'dente', false, false, 1),
  ('retratamento-endodontico', 'Obturação', 'obturacao', 'dente', true, false, 2),
  -- F. Cirurgia e implantes ("dente" = sítio)
  ('exodontia', 'Exodontia', 'exodontia', 'dente', true, false, 1),
  ('implante', 'Instalação do implante', 'instalacao-do-implante', 'dente', true, false, 1),
  ('implante', 'Reabertura / cicatrizador', 'reabertura-cicatrizador', 'dente', false, false, 2),
  ('enxerto-osseo', 'Enxerto', 'enxerto', 'dente', true, false, 1),
  ('enxerto-de-tecido-mole', 'Enxerto', 'enxerto', 'dente', true, false, 1),
  -- G. Prótese sobre implante
  ('coroa-sobre-implante', 'Provisório', 'provisorio', 'peca', false, false, 1),
  ('coroa-sobre-implante', 'Instalação', 'instalacao', 'peca', true, false, 2),
  ('protese-fixa-total-sobre-implantes', 'Prova', 'prova', 'arcada', false, false, 1),
  ('protese-fixa-total-sobre-implantes', 'Instalação', 'instalacao', 'arcada', true, false, 2),
  -- H. Periodontia estética
  ('gengivoplastia-recontorno-gengival', 'Gengivoplastia / recontorno gengival', 'gengivoplastia-recontorno-gengival', 'dente', true, false, 1),
  ('aumento-de-coroa-clinica', 'Aumento de coroa clínica', 'aumento-de-coroa-clinica', 'dente', true, false, 1),
  -- I. Prótese removível
  ('protese-removivel-total-ou-parcial', 'Prova', 'prova', 'arcada', false, false, 1),
  ('protese-removivel-total-ou-parcial', 'Instalação', 'instalacao', 'arcada', true, false, 2),
  -- J. Oclusão
  ('placa-oclusal', 'Instalação', 'instalacao', 'peca', true, false, 1),
  ('ajuste-oclusal', 'Ajuste', 'ajuste', 'caso', true, false, 1),
  -- K. Clareamento e manchas (clareamentos só experiência)
  ('clareamento-de-consultorio', 'Sessão', 'sessao', 'caso', false, false, 1),
  ('clareamento-caseiro-supervisionado', 'Entrega e orientação', 'entrega-e-orientacao', 'caso', false, false, 1),
  ('clareamento-interno', 'Sessão', 'sessao', 'dente', false, false, 1),
  ('microabrasao-infiltracao-resinosa', 'Microabrasão / infiltração resinosa', 'microabrasao-infiltracao-resinosa', 'dente', true, false, 1),
  -- L. Outros
  ('outro-procedimento', 'Outro procedimento', 'outro-procedimento', 'caso', false, true, 1)
)
insert into public.procedure_steps (procedure_id, name, slug, unit, completes, requires_description, position)
select p.id, s.name, s.slug, s.unit::public.count_unit, s.completes, s.requires_description, s.position
from s join public.procedures p on p.slug = s.procedure
on conflict (procedure_id, slug) do nothing;

update public.schema_info set version = '20261019120100_catalogo_procedimentos', updated_at = now();
