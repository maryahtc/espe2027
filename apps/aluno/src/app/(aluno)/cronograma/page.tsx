import type { Metadata } from 'next'
import { CalendarPage } from '@/components/calendar/CalendarPage'
import { DEMO_TODAY } from '@/demo/data'

export const metadata: Metadata = { title: 'Cronograma' }

export default function CronogramaPage() {
  return <CalendarPage monthKey={DEMO_TODAY.slice(0, 7)} />
}
