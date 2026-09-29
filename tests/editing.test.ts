import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoWorkbook } from '@fixtures/workbook'
import { getEntity } from '@/config/editing'
import { buildPortalData } from '@/server/data/pipeline/build'
import { MemoryWorkbook } from '@/server/data/store/memory'
import { readPreviewWorkbook } from '@/server/data/source/preview'
import { resolveRole } from '@/server/auth/directory'
import { createSessionToken, readSessionToken } from '@/server/auth/session'
import { findRecord, listRecords, loadTable } from '@/server/editing/records'
import { createRecord, removeRecord, updateRecord, type Editor } from '@/server/editing/service'

const editor: Editor = { email: 'coordenacao@exemplo.com', role: 'coordenacao' }
const NOW = new Date('2026-09-29T15:00:00Z')
const aulas = getEntity('aulas')!
const modulos = getEntity('modulos')!
const professores = getEntity('professores')!
const materiais = getEntity('materiais')!
const estoque = getEntity('estoque')!

function preview() {
  return new MemoryWorkbook(readPreviewWorkbook())
}

async function record(wb: MemoryWorkbook, entity = aulas, match: (v: Record<string, string>) => boolean) {
  const table = await loadTable(wb, entity)
  return listRecords(entity, table).find((r) => match(r.values))!
}

async function history(wb: MemoryWorkbook) {
  return (await wb.readTab('HISTÓRICO')) ?? []
}

afterEach(() => vi.unstubAllEnvs())

describe('edição: grava só o que mudou', () => {
  it('altera um campo, atribui ID e registra no HISTÓRICO', async () => {
    const wb = preview()
    const r = await record(wb, aulas, (v) => v.title === 'smilecloud 3D')
    expect(r.id).toBeNull()
    const result = await updateRecord(wb, aulas, r.ref, r.version, { ...r.values, start: '8h' }, editor, NOW)
    expect(result).toMatchObject({ ok: true })

    const table = await loadTable(wb, aulas)
    const after = findRecord(aulas, table, result.ok ? result.ref : '')!
    expect(after.values.start).toBe('08:00')
    expect(after.id).toMatch(/^AUL-[A-Z0-9]{6}$/)
    // Nada mais na linha mudou
    expect({ ...after.values, start: '' }).toEqual({ ...r.values, start: '' })

    const log = await history(wb)
    expect(log[0]).toEqual(['Data e hora', 'Pessoa', 'Perfil', 'Ação', 'Aba', 'ID', 'Linha', 'Alterações'])
    expect(log[1]).toEqual(expect.arrayContaining(['coordenacao@exemplo.com', 'Coordenação', 'Edição', 'AULAS', after.id]))
    expect(String(log[1]![7])).toContain('Início: (vazio) → 8h')
  })

  it('não reescreve campos intocados, mesmo com valores "fora do padrão" (planilha soberana)', async () => {
    const wb = preview()
    const m1 = await record(wb, modulos, (v) => v.number === '1')
    expect(m1.values.plannedMonth).toBe('fev')
    await updateRecord(wb, modulos, m1.ref, m1.version, { ...m1.values, title: 'Diagnóstico' }, editor, NOW)
    const again = await record(wb, modulos, (v) => v.number === '1')
    expect(again.values).toMatchObject({ plannedMonth: 'fev', startDate: '11/02/2027', title: 'Diagnóstico' })
  })

  it('lista de professores com a mesma pessoa em outra ordem/separador não é regravada', async () => {
    const wb = preview()
    const r = await record(wb, aulas, (v) => v.title === 'primeira consulta/inteligencia')
    const result = await updateRecord(wb, aulas, r.ref, r.version, { ...r.values, professors: 'Elber; Maryah; Victor' }, editor, NOW)
    expect(result).toMatchObject({ ok: true })
    const after = await record(wb, aulas, (v) => v.title === 'primeira consulta/inteligencia')
    expect(after.values.professors).toBe('Maryah e Victor e Elber')
  })

  it('bloqueia a gravação se a linha mudou na planilha (conflito)', async () => {
    const wb = preview()
    const r = await record(wb, aulas, (v) => v.title === 'PT e PPR')
    await updateRecord(wb, aulas, r.ref, r.version, { ...r.values, day: '4' }, editor, NOW)
    const stale = await updateRecord(wb, aulas, r.ref, r.version, { ...r.values, title: 'Outro' }, editor, NOW)
    expect(stale).toMatchObject({ ok: false })
    expect(stale.ok ? '' : stale.message).toContain('alterada na planilha')
  })

  it('valida o que foi alterado e não grava nada se houver erro', async () => {
    const wb = preview()
    const r = await record(wb, aulas, (v) => v.title === 'PT e PPR')
    const result = await updateRecord(wb, aulas, r.ref, r.version, { ...r.values, date: '31/02/2027', title: '' }, editor, NOW)
    expect(result).toMatchObject({ ok: false, errors: { date: 'Use o formato DD/MM/AAAA.', title: 'Campo obrigatório.' } })
    expect(await wb.readTab('HISTÓRICO')).toBeNull()
  })

  it('texto que parece fórmula é gravado como texto', async () => {
    const wb = preview()
    const r = await record(wb, aulas, (v) => v.title === 'PT e PPR')
    await updateRecord(wb, aulas, r.ref, r.version, { ...r.values, description: '=IMPORTXML("x")' }, editor, NOW)
    const after = await record(wb, aulas, (v) => v.title === 'PT e PPR')
    expect(after.values.description).toBe('=IMPORTXML("x")')
    const writes: unknown[] = []
    const spy = { ...wb, setCells: async (_t: string, cells: { value: unknown }[]) => writes.push(...cells.map((c) => c.value)) }
    await updateRecord(Object.assign(Object.create(wb), spy), aulas, after.ref, after.version, { ...after.values, publicNotes: '+55 11' }, editor, NOW)
    expect(writes).toContain("'+55 11")
  })
})

describe('criação e remoção', () => {
  it('cria aula nova com ID e ela aparece no portal', async () => {
    const wb = preview()
    const result = await createRecord(
      wb,
      aulas,
      { module: '7', day: '1', date: '', start: '14:00', end: '18:00', title: 'Aula nova', professors: 'Adriano Lima', type: 'Hands-on' },
      editor,
      NOW,
    )
    expect(result).toMatchObject({ ok: true })
    const { dataset } = await buildPortalData(wb.source('preview'), NOW)
    expect(dataset.classes.find((c) => c.title === 'Aula nova')).toMatchObject({ moduleSlug: '07', start: '14:00', type: 'hands-on', professorSlugs: ['adriano-lima'] })
  })

  it('cria a aba quando ela ainda não existe na planilha', async () => {
    const wb = new MemoryWorkbook({ PROFESSORES: [['Professor']] })
    const result = await createRecord(wb, materiais, { module: '3', material: 'Resina A2', required: '12' }, editor, NOW)
    expect(result).toMatchObject({ ok: true })
    const tab = (await wb.readTab('MATERIAIS POR MÓDULO'))!
    expect(tab[0]![0]).toBe('ID')
    expect(tab[1]).toEqual(expect.arrayContaining(['3', 'Resina A2', 12]))
  })

  it('arquivar aula = Status "Rascunho" (sai do portal, continua na planilha)', async () => {
    const wb = preview()
    const r = await record(wb, aulas, (v) => v.title === 'smilecloud 3D')
    const result = await removeRecord(wb, aulas, r.ref, r.version, editor, NOW)
    expect(result).toMatchObject({ ok: true })
    expect((await record(wb, aulas, (v) => v.title === 'smilecloud 3D')).values.status).toBe('Rascunho')
    const { dataset } = await buildPortalData(wb.source('preview'), NOW)
    expect(dataset.classes.some((c) => c.title === 'smilecloud 3D')).toBe(false)
  })

  it('remover equipamento apaga a linha e guarda os dados no HISTÓRICO', async () => {
    const wb = preview()
    const equipamentos = getEntity('equipamentos')!
    const r = await record(wb, equipamentos, (v) => v.name === 'Mocho')
    await removeRecord(wb, equipamentos, r.ref, r.version, editor, NOW)
    expect(listRecords(equipamentos, await loadTable(wb, equipamentos)).map((x) => x.values.name)).toEqual(['Microscópio'])
    const log = await history(wb)
    expect(log[1]).toEqual(expect.arrayContaining(['Remoção', 'EQUIPAMENTOS']))
    expect(String(log[1]![7])).toContain('Equipamento: Mocho')
  })

  it('estoque: "Última atualização" é preenchida quando o estoque atual muda', async () => {
    const wb = preview()
    await createRecord(wb, estoque, { material: 'Resina A2', current: '8', minimum: '10' }, editor, NOW)
    const r = await record(wb, estoque, (v) => v.material === 'Resina A2')
    expect(r.values.updatedAt).toBe('29/09/2026')
  })
})

describe('privacidade na área de edição', () => {
  it('colunas internas não são lidas nos registros e continuam intactas depois de editar', async () => {
    const wb = new MemoryWorkbook(demoWorkbook)
    const table = await loadTable(wb, professores)
    const records = listRecords(professores, table)
    // (o nome fictício "SENTINELA Professor Sem Aula" é público; as colunas privadas não)
    expect(JSON.stringify(records)).not.toMatch(/SENTINELA_(CACHE|CONTATO|HOTEL|PASSAGEM|CIDADE|OBS)|sentinela@/)
    expect(Object.keys(records[0]!.values).sort()).toEqual(['aliases', 'bio', 'name', 'specialty'])

    const joao = records.find((r) => r.values.name === 'João Silva')!
    await updateRecord(wb, professores, joao.ref, joao.version, { ...joao.values, specialty: 'Dentística' }, editor, NOW)
    const row = (await wb.readTab('PROFESSORES'))!.find((line) => line[0] === 'João Silva')!
    expect(row).toContain('SENTINELA_CACHE R$ 9.999,00')
    expect(row).toContain('sentinela@privado.test')
    expect(row).toContain('Dentística')
  })
})

describe('login', () => {
  it('coordenação por ADMIN_EMAILS e professores pela coluna E-mail da aba PROFESSORES', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'Coord@Exemplo.com, outra@exemplo.com')
    const wb = new MemoryWorkbook({ PROFESSORES: [['Professor', 'E-mail'], ['João', 'joao@exemplo.com'], ['Ana', '']] })
    expect(await resolveRole(wb, 'coord@exemplo.com')).toBe('coordenacao')
    expect(await resolveRole(wb, ' JOAO@exemplo.com ')).toBe('professor')
    expect(await resolveRole(wb, 'estranho@exemplo.com')).toBeNull()
  })

  it('sessão assinada: recusa adulteração e expiração', () => {
    const token = createSessionToken('joao@exemplo.com', 'professor', 1_000)
    expect(readSessionToken(token, 2_000)).toMatchObject({ email: 'joao@exemplo.com', role: 'professor' })
    const [payload, signature] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ email: 'x@y.com', role: 'coordenacao', exp: 9e15 })).toString('base64url')
    expect(readSessionToken(`${forged}.${signature}`, 2_000)).toBeNull()
    expect(readSessionToken(`${payload}.xxx`, 2_000)).toBeNull()
    expect(readSessionToken(token, 1_000 + 13 * 3600_000)).toBeNull()
  })
})
