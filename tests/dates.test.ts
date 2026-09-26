import { describe, expect, it } from 'vitest'
import {
  formatDateRange,
  formatMonthYear,
  formatWeekdayDate,
  parseDate,
  parseMonth,
  parseTime,
  serialToISODate,
  todayISO,
} from '@/lib/dates'

describe('parseDate', () => {
  it('interpreta sempre DD/MM (padrão brasileiro)', () => {
    expect(parseDate('19/08/2027')).toBe('2027-08-19')
    expect(parseDate('03/02/2027')).toBe('2027-02-03')
    expect(parseDate('3/2/27')).toBe('2027-02-03')
    expect(parseDate('19.08.2027')).toBe('2027-08-19')
    expect(parseDate('2027-08-19')).toBe('2027-08-19')
  })
  it('aceita número serial do Google Sheets', () => {
    expect(parseDate(46527)).toBe('2027-05-20')
    expect(serialToISODate(46527.75)).toBe('2027-05-20')
  })
  it('rejeita datas impossíveis ou texto', () => {
    expect(parseDate('31/02/2027')).toBeNull()
    expect(parseDate('amanhã')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})

describe('parseTime', () => {
  it('aceita formatos comuns', () => {
    expect(parseTime('14:00')).toBe('14:00')
    expect(parseTime('8:00')).toBe('08:00')
    expect(parseTime('14h')).toBe('14:00')
    expect(parseTime('14h30')).toBe('14:30')
    expect(parseTime('14:30:00')).toBe('14:30')
    expect(parseTime(0.5833333333)).toBe('14:00')
  })
  it('rejeita horários inválidos', () => {
    expect(parseTime('25:00')).toBeNull()
    expect(parseTime('tarde')).toBeNull()
  })
})

describe('parseMonth', () => {
  it('aceita mês/ano em vários formatos', () => {
    expect(parseMonth('06/2027')).toBe('2027-06')
    expect(parseMonth('jun/2027')).toBe('2027-06')
    expect(parseMonth('Junho 2027')).toBe('2027-06')
    expect(parseMonth('março de 2028')).toBe('2028-03')
    expect(parseMonth('2027-06')).toBe('2027-06')
  })
})

describe('formatação', () => {
  it('formata intervalos de datas editorialmente', () => {
    expect(formatDateRange('2027-08-18', '2027-08-20')).toBe('18–20 AGO 2027')
    expect(formatDateRange('2027-05-30', '2027-06-01')).toBe('30 MAI – 1 JUN 2027')
    expect(formatDateRange('2027-12-30', '2028-01-02')).toBe('30 DEZ 2027 – 2 JAN 2028')
    expect(formatDateRange('2027-08-18', null)).toBe('18 AGO 2027')
  })
  it('dia da semana independe do fuso', () => {
    expect(formatWeekdayDate('2027-08-19')).toBe('Quinta · 19 AGO')
  })
  it('mês por extenso', () => {
    expect(formatMonthYear('2027-06')).toBe('Junho 2027')
  })
})

describe('todayISO', () => {
  it('usa America/Sao_Paulo, não o fuso do servidor', () => {
    // 02:30 UTC de 20/08 ainda é 19/08 em São Paulo (UTC−3)
    expect(todayISO(new Date('2027-08-20T02:30:00Z'))).toBe('2027-08-19')
    expect(todayISO(new Date('2027-08-20T03:30:00Z'))).toBe('2027-08-20')
  })
})
