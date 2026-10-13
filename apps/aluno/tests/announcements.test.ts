import { describe, expect, it } from 'vitest'
import { activeAnnouncements, type AnnouncementVM, situation, sortForAdmin, validLink } from '@/lib/announcements/model'

const a = (over: Partial<AnnouncementVM>): AnnouncementVM => ({
  id: 'x',
  cohortId: 't1',
  cohortName: 'Turma 2027',
  title: 'Aviso',
  body: 'Texto',
  signature: null,
  linkUrl: null,
  linkLabel: null,
  important: false,
  visibleFrom: '2027-02-01',
  visibleUntil: '2027-02-10',
  status: 'publicado',
  publishedAt: '2027-01-30T10:00:00Z',
  updatedAt: '2027-01-30T10:00:00Z',
  ...over,
})

describe('situação do aviso', () => {
  it('rascunho e arquivado independem da data; publicado depende do período (inclusivo)', () => {
    expect(situation(a({ status: 'rascunho' }), '2027-02-05')).toBe('rascunho')
    expect(situation(a({ status: 'arquivado' }), '2027-02-05')).toBe('arquivado')
    expect(situation(a({}), '2027-01-31')).toBe('programado')
    expect(situation(a({}), '2027-02-01')).toBe('no-ar')
    expect(situation(a({}), '2027-02-10')).toBe('no-ar')
    expect(situation(a({}), '2027-02-11')).toBe('encerrado')
  })
})

describe('avisos no Início', () => {
  const list = [
    a({ id: 'comum', title: 'Comum', visibleFrom: '2027-02-03' }),
    a({ id: 'importante', title: 'Importante', important: true, visibleFrom: '2027-02-01' }),
    a({ id: 'todas', title: 'Todas', cohortId: null }),
    a({ id: 'outra', title: 'Outra turma', cohortId: 't2' }),
    a({ id: 'rascunho', status: 'rascunho' }),
    a({ id: 'futuro', visibleFrom: '2027-02-20', visibleUntil: '2027-02-25' }),
  ]

  it('só os publicados no período, da turma ou "para todas"; importantes primeiro', () => {
    expect(activeAnnouncements(list, { cohortId: 't1', today: '2027-02-05' }).map((x) => x.id)).toEqual(['importante', 'comum', 'todas'])
  })

  it('"Entendi" esconde só aviso comum; importante continua até a data final', () => {
    const dismissed = new Set(['comum', 'importante'])
    expect(activeAnnouncements(list, { cohortId: 't1', today: '2027-02-05', dismissed }).map((x) => x.id)).toEqual(['importante', 'todas'])
  })

  it('depois da data final, nem o importante aparece', () => {
    expect(activeAnnouncements(list, { cohortId: 't1', today: '2027-02-11' })).toEqual([])
  })
})

describe('painel e link', () => {
  it('ordem do painel: no ar, programados, rascunhos, encerrados, arquivados', () => {
    const items = [
      a({ id: 'arq', status: 'arquivado' }),
      a({ id: 'enc', visibleUntil: '2027-02-02' }),
      a({ id: 'ras', status: 'rascunho' }),
      a({ id: 'prog', visibleFrom: '2027-03-01', visibleUntil: '2027-03-02' }),
      a({ id: 'ar' }),
    ]
    expect(sortForAdmin(items, '2027-02-05').map((x) => x.id)).toEqual(['ar', 'prog', 'ras', 'enc', 'arq'])
  })

  it('link aceita página do portal ou https://; recusa o resto', () => {
    expect(validLink('/cronograma/2027-02')).toBe(true)
    expect(validLink('https://exemplo.com/x')).toBe(true)
    expect(validLink('http://exemplo.com')).toBe(false)
    expect(validLink('javascript:alert(1)')).toBe(false)
    expect(validLink('//exemplo.com')).toBe(false)
  })
})
