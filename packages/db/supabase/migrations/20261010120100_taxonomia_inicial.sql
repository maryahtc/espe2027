-- Etapa 4 · Parte 1 — taxonomia inicial aprovada pela Maryah em 08/10/2026: 7 áreas e 27 temas.
-- Origem: programação do pré-cadastro da Turma 2027 (módulos 1 a 11).
--
-- SOMENTE INCLUSÃO, autorizada explicitamente para produção: insere o que não existir (por slug) e não altera
-- nem apaga nada. Depois daqui, áreas e temas são mantidos pelo Admin.
-- Pendente (não cadastrar até esclarecer): "inteligência" (M1). Decidido não cadastrar agora: "Lu do Ateliê Oral"
-- (atividade/convidada), Mock-up, Cimentação adesiva, Restaurações provisórias, Seleção de cor, área Periodontia.

insert into public.categories (name, slug, position) values
  ('Diagnóstico e Documentação', 'diagnostico-e-documentacao', 1),
  ('Planejamento e Odontologia Digital', 'planejamento-e-odontologia-digital', 2),
  ('Oclusão', 'oclusao', 3),
  ('Materiais e Adesão', 'materiais-e-adesao', 4),
  ('Dentística Restauradora', 'dentistica-restauradora', 5),
  ('Prótese e Reabilitação', 'protese-e-reabilitacao', 6),
  ('Gestão', 'gestao', 7)
on conflict (slug) do nothing;

with t (area, name, slug, synonyms, origin) as (values
  -- 1 · Diagnóstico e Documentação
  ('diagnostico-e-documentacao', 'Primeira consulta e anamnese', 'primeira-consulta-e-anamnese',
    array['anamnese', 'entrevista inicial', 'avaliação inicial'],
    'M1 · "primeira consulta" · Fotografia e anamnese · entregável "Anamnese, foto"'),
  ('diagnostico-e-documentacao', 'Fotografia odontológica', 'fotografia-odontologica',
    array['foto', 'fotografia intraoral', 'fotografia extraoral', 'protocolo fotográfico'],
    'M1 · Fotografia teórica · Fotografia e anamnese'),
  ('diagnostico-e-documentacao', 'Exames de imagem: tomografia e radiografia', 'exames-de-imagem-tomografia-e-radiografia',
    array['tomo', 'tomografia', 'TC', 'CBCT', 'Rx', 'raio-x', 'radiografia'],
    'M1 · Documentação complementar (tomo, Rx)'),
  ('diagnostico-e-documentacao', 'Inteligência artificial em exames de imagem', 'inteligencia-artificial-em-exames-de-imagem',
    array['IA', 'inteligência artificial', 'IA em imagem'],
    'M2 · IA em exames de imagem'),
  -- 2 · Planejamento e Odontologia Digital
  ('planejamento-e-odontologia-digital', 'Escaneamento intraoral', 'escaneamento-intraoral',
    array['scanner', 'escaneamento', 'moldagem digital', 'digitalização'],
    'M2 · Escaneamento · Prática de escaneamento · M8 · preparo de faceta e escaneamento'),
  ('planejamento-e-odontologia-digital', 'Planejamento digital do sorriso', 'planejamento-digital-do-sorriso',
    array['smile design', 'DSD', 'Smile Cloud', 'Blueprint', 'planejamento estético'],
    'M3 · Smile Cloud (smile design · Blueprint · casos)'),
  ('planejamento-e-odontologia-digital', 'Enceramento diagnóstico', 'enceramento-diagnostico',
    array['enceramento', 'wax-up', 'enceramento analógico'],
    'M4 · Enceramento anterior · M5 · Enceramento posterior'),
  ('planejamento-e-odontologia-digital', 'Anatomia e escultura dental', 'anatomia-e-escultura-dental',
    array['anatomia dental', 'escultura', 'forma dental'],
    'M4 e M5 · "(anatomia / hands-on)"'),
  -- 3 · Oclusão
  ('oclusao', 'Registro oclusal com JIG', 'registro-oclusal-com-jig',
    array['JIG', 'JIG de Lucia', 'desprogramador', 'relação cêntrica', 'registro interoclusal'],
    'M2 · Aula e prática de JIG · Prática de escaneamento (JIG etc.)'),
  -- 4 · Materiais e Adesão
  ('materiais-e-adesao', 'Adesão', 'adesao',
    array['adesivo', 'sistema adesivo', 'condicionamento ácido', 'hibridização'],
    'M4 · Adesão'),
  ('materiais-e-adesao', 'Sistemas cerâmicos', 'sistemas-ceramicos',
    array['cerâmica', 'porcelana', 'dissilicato de lítio', 'zircônia'],
    'M4 · Sistema cerâmico'),
  -- 5 · Dentística Restauradora
  ('dentistica-restauradora', 'Resina composta em anteriores', 'resina-composta-em-anteriores',
    array['resina anterior', 'estratificação anterior', 'restauração direta anterior'],
    'M5 · Hands-on resina anterior'),
  ('dentistica-restauradora', 'Resina composta em posteriores', 'resina-composta-em-posteriores',
    array['resina posterior', 'restauração posterior', 'restaurações parciais em resina'],
    'M5 · Hands-on resina posterior · M8 · restaurações parciais em resina composta'),
  ('dentistica-restauradora', 'Restaurações Classe I e Classe II', 'restauracoes-classe-i-e-classe-ii',
    array['classe I', 'classe II', 'cavidade oclusal', 'cavidade proximal'],
    'M9 · Classe I e Classe II (hands-on)'),
  ('dentistica-restauradora', 'Faceta direta em resina', 'faceta-direta-em-resina',
    array['faceta de resina', 'faceta direta', 'laminado de resina'],
    'M10 · Hands-on faceta de resina (escurecido)'),
  ('dentistica-restauradora', 'Substrato escurecido', 'substrato-escurecido',
    array['dente escurecido', 'escurecimento', 'mascaramento'],
    'M10 · "escurecido"'),
  ('dentistica-restauradora', 'Restaurações semidiretas', 'restauracoes-semidiretas',
    array['semidireta', 'inlay/onlay em resina'],
    'M11 · Semidireta'),
  ('dentistica-restauradora', 'Isolamento do campo operatório', 'isolamento-do-campo-operatorio',
    array['isolamento absoluto', 'dique de borracha', 'lençol de borracha'],
    'M6 · Isolamento e preenchimento (contexto restaurador, confirmado)'),
  ('dentistica-restauradora', 'Técnica de resina injetável', 'tecnica-de-resina-injetavel',
    array['resina injetada', 'injetável', 'injeção', 'injection molding'],
    'M6 · Injeção, hands-on (contexto restaurador, confirmado)'),
  -- 6 · Prótese e Reabilitação
  ('protese-e-reabilitacao', 'Preparo para laminado cerâmico', 'preparo-para-laminado-ceramico',
    array['laminado', 'faceta cerâmica', 'lente de contato', 'preparo de faceta'],
    'M7 · Preparo laminado (teórica) · M8 · preparo de faceta'),
  ('protese-e-reabilitacao', 'Preparo parcial', 'preparo-parcial',
    array['onlay', 'overlay', 'inlay', 'preparo para restauração parcial'],
    'M7 · Preparo parcial · dever de casa "reconstrução do preparo"'),
  ('protese-e-reabilitacao', 'Preparo para coroa total', 'preparo-para-coroa-total',
    array['coroa', 'preparo de coroa', 'coroa total'],
    'M9 · Hands-on de preparo de coroa'),
  ('protese-e-reabilitacao', 'Pinos intrarradiculares', 'pinos-intrarradiculares',
    array['pino', 'pino de fibra', 'retentor intrarradicular', 'núcleo'],
    'M10 · Pino (teoria e hands-on)'),
  ('protese-e-reabilitacao', 'Prótese sobre implante', 'protese-sobre-implante',
    array['PSI', 'prótese sobre implantes', 'implantossuportada'],
    'M11 · PSI (confirmado)'),
  -- 7 · Gestão
  ('gestao', 'Marketing odontológico', 'marketing-odontologico',
    array['marketing', 'redes sociais', 'posicionamento'],
    'M4 · Marketing + gestão'),
  ('gestao', 'Gestão de consultório', 'gestao-de-consultorio',
    array['gestão', 'administração', 'finanças do consultório'],
    'M4 · Marketing + gestão'),
  ('gestao', 'Apresentação e aceitação do plano de tratamento', 'apresentacao-e-aceitacao-do-plano-de-tratamento',
    array['apresentação de caso', 'aceitação de tratamento', 'plano de tratamento', 'conversão de tratamento'],
    'M4 · observação interna (a origem não aparece para o aluno)')
),
novos as (
  insert into public.topics (category_id, name, slug, synonyms)
  select c.id, t.name, t.slug, t.synonyms
  from t join public.categories c on c.slug = t.area
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.topic_notes (topic_id, origin)
select n.id, t.origin from novos n join t on t.slug = n.slug
on conflict (topic_id) do nothing;

update public.schema_info set version = '20261010120100_taxonomia_inicial', updated_at = now();
