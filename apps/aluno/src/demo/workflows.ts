/**
 * Três workflows FICTÍCIOS para a prévia. Conteúdo educacional de exemplo, escrito para
 * demonstrar a experiência: perguntas, orientações, alertas, conteúdos e caminhos possíveis.
 * Não é protocolo clínico da especialização.
 */
import type { WorkflowGraph } from '@/lib/workflow'

export type DemoWorkflow = {
  slug: string
  title: string
  category: string
  summary: string
  status: 'Publicado' | 'Rascunho'
  updated: string
  graph: WorkflowGraph
}

const abordagemAnterior: WorkflowGraph = {
  start: 'alteracao',
  nodes: {
    alteracao: {
      type: 'pergunta',
      title: 'Qual é a principal alteração?',
      body: 'Olhe o sorriso como um todo antes de olhar o dente. O que mais incomoda o paciente e o que mais chama a sua atenção?',
      options: [
        { key: 'cor', label: 'Cor', next: 'substrato' },
        { key: 'forma', label: 'Forma', next: 'forma-quanto' },
        { key: 'posicao', label: 'Posição', next: 'posicao-alerta' },
        { key: 'estrutura', label: 'Estrutura', next: 'estrutura-quanto' },
        { key: 'multiplas', label: 'Múltiplas', next: 'multiplas-orientacao' },
      ],
    },
    substrato: {
      type: 'pergunta',
      title: 'O substrato apresenta escurecimento significativo?',
      body: 'Compare o dente com os vizinhos e com a escala, de preferência em foto com filtro polarizador.',
      topics: ['Cor', 'Substrato escurecido'],
      options: [
        { key: 'sim', label: 'Sim', next: 'substrato-orientacao' },
        { key: 'nao', label: 'Não', next: 'cor-distribuicao' },
      ],
    },
    'substrato-orientacao': {
      type: 'orientacao',
      title: 'Antes de decidir, investigue a causa do escurecimento',
      body: 'A causa muda o tratamento. Um substrato escuro pede, em geral, uma estratégia para lidar com a cor antes de pensar no material final.',
      points: [
        'O dente tem tratamento endodôntico? A obturação está adequada?',
        'Há sinais de necrose pulpar não tratada? Considere testes de sensibilidade e radiografia.',
        'O clareamento (interno ou externo) poderia reduzir o problema antes de restaurar?',
        'Quanto de espessura você terá disponível para mascarar o fundo?',
      ],
      topics: ['Substrato escurecido'],
      contents: [{ slug: 'manejo-de-substratos-escurecidos' }, { slug: 'clareamento-interno-indicacoes' }],
      next: 'substrato-resultado',
    },
    'substrato-resultado': {
      type: 'resultado',
      title: 'Caminhos possíveis para discutir com seu supervisor',
      paths: [
        {
          name: 'Clarear primeiro e reavaliar',
          criteria: ['Causa identificada e tratada', 'Paciente aceita etapas e tempo de espera', 'Expectativa realista sobre o resultado do clareamento'],
        },
        {
          name: 'Clareamento + restauração com controle de opacidade',
          criteria: ['Escurecimento residual após clarear', 'Espaço para camadas de opacidade crescente', 'Bom controle de isolamento'],
        },
        {
          name: 'Restauração indireta com material de maior opacidade',
          criteria: ['Escurecimento intenso que não responde ao clareamento', 'Necessidade de preparo mais profundo justificada', 'Comunicação clara de cor com o laboratório'],
        },
      ],
      reminder: 'Não existe uma resposta única. Compare os caminhos com as condições reais do paciente.',
    },
    'cor-distribuicao': {
      type: 'pergunta',
      title: 'A alteração de cor é generalizada ou localizada?',
      options: [
        { key: 'generalizada', label: 'Generalizada', next: 'cor-generalizada' },
        { key: 'localizada', label: 'Localizada (manchas)', next: 'cor-localizada' },
      ],
    },
    'cor-generalizada': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Clareamento supervisionado', criteria: ['Dentes íntegros', 'Ausência de sensibilidade importante', 'Expectativa alinhada com o paciente'] },
        { name: 'Clareamento + ajustes restauradores pontuais', criteria: ['Restaurações antigas em área visível', 'Troca planejada depois da estabilização da cor'] },
      ],
    },
    'cor-localizada': {
      type: 'orientacao',
      title: 'Observe a profundidade da mancha',
      points: ['A mancha é superficial (esmalte) ou profunda?', 'Microabrasão, infiltração resinosa ou restauração resolvem com menos desgaste?'],
      contents: [{ slug: 'selecao-de-cor-e-substrato' }],
      next: 'cor-generalizada',
    },
    'forma-quanto': {
      type: 'pergunta',
      title: 'A mudança de forma pede acréscimo, redução ou ambos?',
      body: 'Um mock-up ajuda a responder: o que precisa ser acrescentado para chegar ao resultado planejado?',
      topics: ['Mock-up', 'Planejamento estético'],
      options: [
        { key: 'acrescimo', label: 'Acréscimo', next: 'forma-mockup' },
        { key: 'reducao', label: 'Redução ou ambos', next: 'forma-alerta' },
      ],
    },
    'forma-mockup': {
      type: 'conteudo',
      title: 'Teste a forma no mock-up antes de decidir o material',
      body: 'O mock-up mostra ao paciente o resultado e mostra a você onde haverá espessura de material.',
      contents: [{ slug: 'mock-up-do-enceramento-a-boca' }, { slug: 'preparos-minimamente-invasivos' }],
      next: 'forma-resultado',
    },
    'forma-alerta': {
      type: 'alerta',
      title: 'Avalie oclusão e guia anterior antes de reduzir',
      body: 'Reduzir comprimento ou volume pode alterar a guia anterior e a fonética. Verifique os movimentos excursivos.',
      contents: [{ slug: 'analise-de-guia-anterior' }],
      next: 'forma-resultado',
    },
    'forma-resultado': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Resina composta direta', criteria: ['Acréscimos pequenos a moderados', 'Substrato favorável', 'Paciente aceita manutenção periódica'] },
        { name: 'Laminado cerâmico', criteria: ['Mudanças maiores de forma e cor', 'Esmalte suficiente para adesão', 'Espaço confirmado no mock-up'] },
      ],
    },
    'posicao-alerta': {
      type: 'alerta',
      title: 'Considere a ortodontia antes de compensar posição com restauração',
      body: 'Compensar posição com material costuma exigir desgaste maior. Discuta a abordagem multidisciplinar.',
      next: 'posicao-orto',
    },
    'posicao-orto': {
      type: 'pergunta',
      title: 'O paciente aceita tratamento ortodôntico prévio?',
      options: [
        { key: 'sim', label: 'Sim', next: 'posicao-resultado' },
        { key: 'nao', label: 'Não', next: 'posicao-resultado' },
      ],
    },
    'posicao-resultado': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Ortodontia e depois finalização restauradora', criteria: ['Melhor preservação de estrutura', 'Paciente aceita o tempo de tratamento'] },
        { name: 'Compensação restauradora com limites claros', criteria: ['Desalinhamentos leves', 'Documentar a recusa da ortodontia', 'Planejar no mock-up'] },
      ],
    },
    'estrutura-quanto': {
      type: 'pergunta',
      title: 'Quanto de estrutura dental permanece?',
      options: [
        { key: 'muita', label: 'Perda pequena', next: 'estrutura-resultado' },
        { key: 'pouca', label: 'Perda extensa', next: 'estrutura-resultado' },
      ],
    },
    'estrutura-resultado': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Restauração direta', criteria: ['Remanescente amplo', 'Margens em esmalte'] },
        { name: 'Restauração indireta (laminado, coroa parcial)', criteria: ['Perda extensa', 'Necessidade de resistência e anatomia previsíveis'] },
      ],
      reminder: 'Para dentes posteriores, use o workflow "Direta ou indireta?".',
    },
    'multiplas-orientacao': {
      type: 'orientacao',
      title: 'Organize as alterações por prioridade',
      points: [
        'Saúde primeiro: periodonto, cáries, endodontia.',
        'Depois posição, depois cor, por último forma.',
        'Cada alteração pode abrir o seu próprio workflow.',
      ],
      next: 'multiplas-resultado',
    },
    'multiplas-resultado': {
      type: 'resultado',
      title: 'Caminho sugerido',
      paths: [{ name: 'Planejamento multidisciplinar em etapas', criteria: ['Sequência definida com o supervisor', 'Fotos e planejamento digital no Smile Cloud'] }],
    },
  },
}

const denteEscurecido: WorkflowGraph = {
  start: 'endo',
  nodes: {
    endo: {
      type: 'pergunta',
      title: 'O dente tem tratamento endodôntico?',
      body: 'Confirme na radiografia e no histórico do paciente.',
      options: [
        { key: 'sim', label: 'Sim', next: 'obturacao' },
        { key: 'nao', label: 'Não', next: 'vitalidade' },
      ],
    },
    obturacao: {
      type: 'pergunta',
      title: 'A obturação e o selamento parecem adequados?',
      options: [
        { key: 'adequada', label: 'Sim', next: 'clareamento-interno' },
        { key: 'inadequada', label: 'Não ou tenho dúvida', next: 'retratamento' },
      ],
    },
    'clareamento-interno': {
      type: 'orientacao',
      title: 'Considere o clareamento interno como primeira etapa',
      points: ['Barreira cervical antes do agente clareador', 'Registre a cor inicial com foto e escala', 'Combine com o paciente o número de sessões'],
      contents: [{ slug: 'clareamento-interno-indicacoes' }],
      next: 'resultado-endo',
    },
    retratamento: {
      type: 'alerta',
      title: 'Resolva a endodontia antes da estética',
      body: 'Clarear ou restaurar sobre uma endodontia duvidosa coloca todo o tratamento em risco.',
      next: 'resultado-endo',
    },
    'resultado-endo': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Clareamento interno e reavaliação', criteria: ['Endodontia adequada', 'Escurecimento de origem interna'] },
        { name: 'Restauração com controle de opacidade', criteria: ['Escurecimento residual', 'Espaço para mascarar o fundo'] },
      ],
    },
    vitalidade: {
      type: 'pergunta',
      title: 'O dente responde aos testes de sensibilidade?',
      options: [
        { key: 'responde', label: 'Responde', next: 'causas' },
        { key: 'nao-responde', label: 'Não responde ou duvidoso', next: 'investigar' },
      ],
    },
    causas: {
      type: 'orientacao',
      title: 'Investigue causas intrínsecas e extrínsecas',
      points: ['Trauma antigo?', 'Medicações na infância (tetraciclina)?', 'Fluorose?', 'Restaurações antigas com infiltração?'],
      contents: [{ slug: 'selecao-de-cor-e-substrato' }],
      next: 'resultado-vital',
    },
    investigar: {
      type: 'alerta',
      title: 'Investigue necrose pulpar antes de qualquer tratamento estético',
      body: 'Radiografia periapical, testes complementares e, se indicado, encaminhamento para endodontia.',
      next: 'resultado-vital',
    },
    'resultado-vital': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Clareamento externo', criteria: ['Polpa vital', 'Escurecimento leve a moderado'] },
        { name: 'Restauração ou laminado', criteria: ['Causa esclarecida', 'Clareamento insuficiente ou contraindicado'] },
      ],
    },
  },
}

const diretaOuIndireta: WorkflowGraph = {
  start: 'perda',
  nodes: {
    perda: {
      type: 'pergunta',
      title: 'Quanto da estrutura dental foi perdida?',
      body: 'Considere a cavidade depois da remoção do tecido cariado e da restauração antiga.',
      options: [
        { key: 'pequena', label: 'Até 1/3 da largura entre cúspides', next: 'isolamento' },
        { key: 'media', label: 'Entre 1/3 e 2/3', next: 'cuspides' },
        { key: 'grande', label: 'Mais de 2/3', next: 'cuspides' },
      ],
    },
    isolamento: {
      type: 'pergunta',
      title: 'É possível fazer isolamento absoluto adequado?',
      options: [
        { key: 'sim', label: 'Sim', next: 'resultado-direta' },
        { key: 'nao', label: 'Não', next: 'alerta-isolamento' },
      ],
    },
    'alerta-isolamento': {
      type: 'alerta',
      title: 'Sem isolamento, a adesão fica comprometida',
      body: 'Avalie afastamento gengival, elevação de margem ou outra estratégia antes de restaurar.',
      contents: [{ slug: 'isolamento-absoluto-em-anteriores' }],
      next: 'resultado-direta',
    },
    'resultado-direta': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Resina composta direta', criteria: ['Cavidade pequena a moderada', 'Isolamento viável', 'Contatos oclusais em estrutura dental'] },
        { name: 'Resina direta com técnica semidireta', criteria: ['Acesso difícil', 'Necessidade de melhor anatomia'] },
      ],
    },
    cuspides: {
      type: 'pergunta',
      title: 'Há cúspides fragilizadas ou perdidas?',
      options: [
        { key: 'nao', label: 'Não', next: 'conteudo-indireta' },
        { key: 'sim', label: 'Sim', next: 'conteudo-indireta' },
      ],
    },
    'conteudo-indireta': {
      type: 'conteudo',
      title: 'Compare as opções antes de decidir',
      body: 'A partir daqui a restauração indireta costuma ser mais previsível. Revise indicações e limites.',
      contents: [{ slug: 'onlays-e-overlays-indicacoes' }, { slug: 'controle-de-profundidade-termino-cervical' }],
      next: 'resultado-indireta',
    },
    'resultado-indireta': {
      type: 'resultado',
      title: 'Caminhos possíveis',
      paths: [
        { name: 'Onlay', criteria: ['Uma ou mais cúspides envolvidas', 'Remanescente com espessura adequada'] },
        { name: 'Overlay', criteria: ['Recobrimento de todas as cúspides', 'Necessidade de proteção cuspídea'] },
        { name: 'Coroa', criteria: ['Remanescente muito comprometido', 'Necessidade de retenção adicional'] },
      ],
    },
  },
}

export const workflows: DemoWorkflow[] = [
  {
    slug: 'abordagem-anterior',
    title: 'Abordagem estética anterior',
    category: 'Planejamento',
    summary: 'Cor, forma, posição ou estrutura: por onde começar o raciocínio em dentes anteriores.',
    status: 'Publicado',
    updated: '02/03/2028',
    graph: abordagemAnterior,
  },
  {
    slug: 'dente-escurecido',
    title: 'Dente escurecido',
    category: 'Dentística',
    summary: 'Da causa do escurecimento à estratégia de tratamento.',
    status: 'Publicado',
    updated: '18/02/2028',
    graph: denteEscurecido,
  },
  {
    slug: 'direta-ou-indireta',
    title: 'Direta ou indireta?',
    category: 'Prótese',
    summary: 'Restaurações posteriores: quando a resina deixa de ser o caminho mais previsível.',
    status: 'Publicado',
    updated: '30/01/2028',
    graph: diretaOuIndireta,
  },
]

export function workflowBySlug(slug: string) {
  return workflows.find((w) => w.slug === slug) ?? null
}

/** Rascunho em edição no admin (prévia do editor). Tem uma etapa solta de propósito, para mostrar a verificação. */
export const draftWorkflow: DemoWorkflow = {
  slug: 'rascunho-novo',
  title: 'Alteração estética anterior (rascunho)',
  category: 'Planejamento',
  summary: 'Rascunho para testar o editor.',
  status: 'Rascunho',
  updated: '11/03/2028',
  graph: {
    start: 'q1',
    nodes: {
      q1: {
        type: 'pergunta',
        title: 'Qual é a principal alteração?',
        options: [
          { key: 'cor', label: 'Cor', next: 'q2' },
          { key: 'forma', label: 'Forma', next: 'o3' },
          { key: 'posicao', label: 'Posição', next: 'a4' },
        ],
      },
      q2: {
        type: 'pergunta',
        title: 'O substrato apresenta escurecimento significativo?',
        topics: ['Substrato escurecido'],
        options: [
          { key: 'sim', label: 'Sim', next: 'c5' },
          { key: 'nao', label: 'Não', next: 'r6' },
        ],
      },
      o3: {
        type: 'orientacao',
        title: 'Teste a forma no mock-up antes de decidir',
        points: ['O que precisa ser acrescentado?', 'Onde haverá espessura de material?'],
        contents: [{ slug: 'mock-up-do-enceramento-a-boca' }],
        next: 'r6',
      },
      a4: {
        type: 'alerta',
        title: 'Considere a ortodontia antes de compensar posição',
        body: 'Compensar posição com material costuma exigir desgaste maior.',
        next: 'r6',
      },
      c5: {
        type: 'conteudo',
        title: 'Investigue a causa do escurecimento',
        contents: [{ slug: 'manejo-de-substratos-escurecidos' }, { slug: 'clareamento-interno-indicacoes' }],
        next: 'r6',
      },
      r6: {
        type: 'resultado',
        title: 'Caminhos possíveis',
        paths: [
          { name: 'Resina composta direta', criteria: ['Alterações pequenas a moderadas', 'Substrato favorável'] },
          { name: 'Laminado cerâmico', criteria: ['Mudanças maiores de forma e cor', 'Esmalte suficiente para adesão'] },
        ],
      },
      ref7: {
        type: 'orientacao',
        title: 'Referências do tema',
        body: 'Livros e artigos de apoio.',
        next: 'r6',
      },
    },
  },
}
