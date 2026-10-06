import {
  IconBook,
  IconBranch,
  IconCalendar,
  IconChart,
  IconHome,
  IconLayers,
  IconMegaphone,
  IconTag,
  IconTooth,
  IconUser,
  IconUsers,
} from '@portal/ui/icons'
import type { AdminIcon, NavIcon as NavIconName } from '@/config/nav'

const ICONS = {
  home: IconHome,
  calendar: IconCalendar,
  book: IconBook,
  branch: IconBranch,
  tooth: IconTooth,
  user: IconUser,
  users: IconUsers,
  layers: IconLayers,
  megaphone: IconMegaphone,
  tag: IconTag,
  chart: IconChart,
} as const

export function NavIcon({ name, size = 20 }: { name: NavIconName | AdminIcon; size?: number }) {
  const Icon = ICONS[name]
  return <Icon size={size} />
}
