import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarPage } from '@/components/calendar/CalendarPage'
import { NoCohort } from '@/components/academic/NoCohort'
import { studentCalendar } from '@/lib/academic/student'

export const metadata: Metadata = { title: 'Cronograma' }

export default async function CronogramaMesPage({ params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) notFound()
  const data = await studentCalendar()
  if (!data) return <NoCohort title="Cronograma" />
  if (mes < data.cohort.startsOn.slice(0, 7) || mes > data.cohort.endsOn.slice(0, 7)) notFound()
  return <CalendarPage monthKey={mes} {...data} />
}
