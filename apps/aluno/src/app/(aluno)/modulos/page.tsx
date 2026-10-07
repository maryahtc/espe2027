import type { Metadata } from 'next'
import { NoCohort } from '@/components/academic/NoCohort'
import { ModuleView } from '@/components/modules/ModuleView'
import { loadModuleDetail, today } from '@/lib/academic/load'
import { focusModule } from '@/lib/academic/model'
import { studentArea } from '@/lib/academic/student'

export const metadata: Metadata = { title: 'Módulos' }

/** "Módulos" no menu: mostra o módulo em andamento ou o próximo (sem redirecionar). */
export default async function ModulesIndex() {
  const area = await studentArea()
  const target = area ? (focusModule(area.modules) ?? area.modules.at(-1)) : null
  const detail = target ? await loadModuleDetail(target.id, area!.modules) : null
  if (!area || !detail) return <NoCohort title="Módulos" />
  detail.resources = detail.resources.filter((r) => r.status === 'publicado' && (!r.availableFrom || new Date(r.availableFrom) <= new Date()))
  detail.module.staff = detail.module.staff.filter((s) => s.visible)
  return <ModuleView detail={detail} siblings={area.modules} today={today()} />
}
