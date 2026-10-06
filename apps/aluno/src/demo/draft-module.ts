import { type DemoModule, teachers } from './data'

/** Módulo em rascunho no admin (prévia): invisível ao aluno até ser publicado. */
export const draftModule: DemoModule = {
  number: 31,
  slug: '31',
  title: 'Reabilitação oral avançada',
  start: '2029-09-13',
  end: '2029-09-15',
  teachers: [teachers[0]!, teachers[4]!],
  state: 'upcoming',
}
