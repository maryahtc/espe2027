/**
 * Etapa 10 — "Precisa da sua atenção" do painel inicial do Admin. Regras puras, objetivas e verificáveis (sem banco).
 * Duas naturezas, sempre distinguidas na tela:
 * - `pendencia`: algo cadastrado de forma incompleta que afeta o aluno (convite não aceito, preparação obrigatória
 *   ainda em rascunho, conteúdo sem tema, módulo sem professor);
 * - `editorial`: lembrete de cadastro, nunca erro clínico ou acadêmico (módulo próximo sem nenhuma preparação,
 *   workflows em rascunho).
 * Procedimento sem conteúdo vinculado NÃO é pendência.
 */
import { addDays, daysBetween } from '@/lib/dates'

export type AttentionKind = 'pendencia-atrasada' | 'professores-a-confirmar' | 'logistica-pendente' | 'convite' | 'preparacao-rascunho' | 'sem-preparacao' | 'conteudo-sem-tema' | 'modulo-sem-professor' | 'workflow-rascunho'
export type AttentionItem = { kind: AttentionKind; tone: 'pendencia' | 'editorial'; text: string; href: string; when?: string; action?: string }

export type AttentionInput = {
  today: string
  people: Array<{ invited_at: string | null; last_sign_in_at: string | null; deactivated_at: string | null }>
  /** Módulos de turmas ativas (qualquer status; as regras olham só os publicados). */
  modules: Array<{ id: string; label: string; title: string; status: string; start: string | null; end: string | null; teachers: number; staffTeachers: number }>
  /** Itens de preparação ("antes") de cada módulo: conteúdos da Biblioteca e recursos do módulo, com o status deles. */
  prep: Array<{ moduleId: string; requirement: string; status: string }>
  contents: Array<{ status: string; topics: number }>
  workflowsDraft: number
  /** Pendências do quadro com prazo vencido e ainda em aberto (Bloco A). 0 quando o banco não tem o quadro. */
  tasksOverdue?: number
  /** Professores e logística dos módulos que começam em até LOGISTICS_WINDOW_DAYS (Bloco A · B1). */
  logistics?: { toConfirm: number; travelPending: number; lodgingPending: number; waiting: number }
}

/** Janela de logística: módulos que começam nos próximos 45 dias. */
export const LOGISTICS_WINDOW_DAYS = 45

/** Janela de preparação: a mesma da Início do aluno (30 dias antes do módulo). */
export const PREP_WINDOW_DAYS = 30

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const inDays = (n: number) => (n === 0 ? 'começa hoje' : n === 1 ? 'começa amanhã' : `começa em ${n} dias`)

export function attentionItems(input: AttentionInput): AttentionItem[] {
  const { today } = input
  const out: AttentionItem[] = []

  // 0. Pendências do quadro com prazo vencido (cadastradas por pessoas; sempre pendência).
  if (input.tasksOverdue && input.tasksOverdue > 0)
    out.push({
      kind: 'pendencia-atrasada',
      tone: 'pendencia',
      text: `${plural(input.tasksOverdue, 'pendência atrasada', 'pendências atrasadas')} no quadro`,
      href: '/admin/pendencias?atrasadas=1',
    })

  // 0b. Professores e logística dos próximos módulos (sempre pendência; "aguardando terceiros" vai no detalhe).
  const lg = input.logistics
  if (lg && lg.toConfirm > 0)
    out.push({
      kind: 'professores-a-confirmar',
      tone: 'pendencia',
      text: `${plural(lg.toConfirm, 'professor a confirmar', 'professores a confirmar')} nos módulos dos próximos ${LOGISTICS_WINDOW_DAYS} dias`,
      href: '/admin/professores?escopo=futuros&situacao=pendente',
    })
  if (lg && lg.travelPending + lg.lodgingPending > 0)
    out.push({
      kind: 'logistica-pendente',
      tone: 'pendencia',
      text: `${plural(lg.travelPending, 'passagem', 'passagens')} e ${plural(lg.lodgingPending, 'hospedagem', 'hospedagens')} pendentes nos próximos ${LOGISTICS_WINDOW_DAYS} dias`,
      href: '/admin/professores?escopo=futuros&situacao=pendente',
      when: lg.waiting ? `${plural(lg.waiting, 'professor aguardando', 'professores aguardando')} confirmação de terceiros` : undefined,
    })

  // 1. Convites pendentes: convidado, nunca entrou, não desativado.
  const pending = input.people.filter((p) => p.invited_at && !p.last_sign_in_at && !p.deactivated_at)
  if (pending.length) {
    const oldest = pending.map((p) => p.invited_at!.slice(0, 10)).sort()[0]!
    const days = daysBetween(oldest, today)
    out.push({
      kind: 'convite',
      tone: 'pendencia',
      text: `${plural(pending.length, 'convite ainda não aceito', 'convites ainda não aceitos')}`,
      href: '/admin/alunos',
      when: days > 0 ? `o mais antigo há ${plural(days, 'dia', 'dias')}` : 'enviado hoje',
    })
  }

  // 2. Módulos publicados que começam nos próximos 30 dias: preparação obrigatória em rascunho / nenhuma preparação.
  const horizon = addDays(today, PREP_WINDOW_DAYS)
  const soon = input.modules
    .filter((m) => m.status === 'publicado' && m.start && today <= m.start && m.start <= horizon)
    .sort((a, b) => a.start!.localeCompare(b.start!))
  for (const m of soon) {
    const items = input.prep.filter((x) => x.moduleId === m.id && x.status !== 'arquivado')
    const name = `Módulo ${m.label} · ${m.title}`
    const when = inDays(daysBetween(today, m.start!))
    if (items.some((x) => x.requirement === 'obrigatorio' && x.status === 'rascunho'))
      out.push({ kind: 'preparacao-rascunho', tone: 'pendencia', text: `${name}: preparação obrigatória ainda em rascunho`, href: `/admin/modulos/${m.id}`, when })
    if (!items.length) out.push({ kind: 'sem-preparacao', tone: 'editorial', text: `${name}: nenhuma preparação cadastrada`, href: `/admin/modulos/${m.id}`, when })
  }

  // 3. Conteúdo publicado sem nenhum tema (não aparece nas recomendações nem em "Áreas para explorar").
  const noTopic = input.contents.filter((c) => c.status === 'publicado' && c.topics === 0).length
  if (noTopic)
    out.push({ kind: 'conteudo-sem-tema', tone: 'pendencia', text: `${plural(noTopic, 'conteúdo publicado sem tema', 'conteúdos publicados sem tema')}`, href: '/admin/conteudos' })

  // 4. Módulo publicado, com datas e ainda não terminado, sem nenhum professor (atividades ou equipe docente).
  //    Um só: item com o nome do módulo. Vários (comum no começo da turma, com o cronograma inteiro publicado): um
  //    item agregado com o mais próximo, como convites e conteúdos — a regra é a mesma, só a lista não transborda.
  const noTeacher = input.modules
    .filter((x) => x.status === 'publicado' && x.start && x.end && x.end >= today && x.teachers === 0 && x.staffTeachers === 0)
    .sort((a, b) => a.start!.localeCompare(b.start!))
  if (noTeacher.length === 1) {
    const m = noTeacher[0]!
    out.push({ kind: 'modulo-sem-professor', tone: 'pendencia', text: `Módulo ${m.label} · ${m.title}: sem professor definido`, href: `/admin/modulos/${m.id}` })
  } else if (noTeacher.length > 1) {
    const m = noTeacher[0]!
    out.push({
      kind: 'modulo-sem-professor',
      tone: 'pendencia',
      text: `${plural(noTeacher.length, 'módulo publicado', 'módulos publicados')} sem professor definido`,
      href: '/admin/modulos',
      when: `o mais próximo: Módulo ${m.label} · ${m.title}, ${m.start! <= today ? 'em andamento' : inDays(daysBetween(today, m.start!))}`,
      action: 'Definir professores em Módulos e cronograma',
    })
  }

  // 5. Workflows em rascunho: pendência editorial, não erro.
  if (input.workflowsDraft > 0)
    out.push({ kind: 'workflow-rascunho', tone: 'editorial', text: `${plural(input.workflowsDraft, 'workflow em rascunho', 'workflows em rascunho')}`, href: '/admin/workflows?status=rascunho' })

  return out
}
