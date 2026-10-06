import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarPage } from '@/components/calendar/CalendarPage'
import { COURSE_FIRST_MONTH, COURSE_LAST_MONTH } from '@/demo/data'
import { monthRange } from '@/lib/calendar'

const MONTHS = monthRange(COURSE_FIRST_MONTH, COURSE_LAST_MONTH)

export function generateStaticParams() {
  return MONTHS.map((mes) => ({ mes }))
}

export const metadata: Metadata = { title: 'Cronograma' }

export default async function CronogramaMesPage({ params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params
  if (!MONTHS.includes(mes)) notFound()
  return <CalendarPage monthKey={mes} />
}
