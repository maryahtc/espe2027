import type { Metadata } from 'next'
import { PlaybookApp } from '@/features/playbook/PlaybookApp'

export const metadata: Metadata = {
  title: 'Playbook — Thiago Ottoboni',
  description: 'Fluxo interativo de tomada de decisão na estratificação: palatina, substrato, dentina, maquiagem e vestibular.',
}

export default function PlaybookPage() {
  return <PlaybookApp />
}
