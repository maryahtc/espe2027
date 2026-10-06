export type NavItem = { href: string; label: string }

export const primaryNav: NavItem[] = [
  { href: '/', label: 'Início' },
  { href: '/cronograma', label: 'Cronograma' },
  { href: '/professores', label: 'Professores' },
  { href: '/playbook', label: 'Playbook' },
]

/** Páginas operacionais — agrupadas separadamente no menu. */
export const operationsNav: NavItem[] = [
  { href: '/materiais', label: 'Materiais' },
  { href: '/estoque', label: 'Estoque' },
  { href: '/equipamentos', label: 'Equipamentos' },
]
