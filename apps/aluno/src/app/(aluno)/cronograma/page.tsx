import type { Metadata } from 'next'
import { CalendarPage } from '@/components/calendar/CalendarPage'
import { NoCohort } from '@/components/academic/NoCohort'
import { studentCalendar } from '@/lib/academic/student'

export const metadata: Metadata = { title: 'Cronograma' }

export default async function CronogramaPage() {
  const data = await studentCalendar()
  if (!data) return <NoCohort title="Cronograma" />
  const first = data.cohort.startsOn.slice(0, 7)
  const last = data.cohort.endsOn.slice(0, 7)
  const current = data.today.slice(0, 7)
  // Mês de hoje, dentro do período da turma (antes do início: o primeiro mês).
  const monthKey = current < first ? first : current > last ? last : current
  return <CalendarPage monthKey={monthKey} {...data} />
}
