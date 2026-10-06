import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export const IconHome = (p: IconProps) => (
  <svg {...base(p)}><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10.5h13V9" /><path d="M10 19.5v-5h4v5" /></svg>
)
export const IconCalendar = (p: IconProps) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
)
export const IconBook = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></svg>
)
export const IconBranch = (p: IconProps) => (
  <svg {...base(p)}><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 7v10M6 12h4a4 4 0 0 0 4-4V7.5M14 12h2" /></svg>
)
export const IconTooth = (p: IconProps) => (
  <svg {...base(p)}><path d="M7.5 3.5c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7.5.4 2.5 1 5 2.5 5s1.7-3 2.3-5c.4-1.3 1-1.5 1.7-1.5s1.3.2 1.7 1.5c.6 2 .8 5 2.3 5s2.1-2.5 2.5-5c.5-3 2-4.5 2-7.5 0-2.5-1.5-4.5-4-4.5-1.8 0-2.7 1-4.5 1s-2.7-1-4.5-1Z" /></svg>
)
export const IconUser = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5" /></svg>
)
export const IconPlay = (p: IconProps) => (
  <svg {...base(p)}><path d="M8 5.5v13l10.5-6.5z" /></svg>
)
export const IconDoc = (p: IconProps) => (
  <svg {...base(p)}><path d="M6.5 3.5h7l4 4v13h-11z" /><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6" /></svg>
)
export const IconArrowRight = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const IconExternal = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10" /></svg>
)
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const IconBell = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
)
export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" /><path d="M15.5 5.8a3 3 0 0 1 0 5.4M17 14.4c1.9.5 3.1 2.1 3.5 4.6" /></svg>
)
export const IconLayers = (p: IconProps) => (
  <svg {...base(p)}><path d="m12 4 8.5 4.5L12 13 3.5 8.5z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" /></svg>
)
export const IconTag = (p: IconProps) => (
  <svg {...base(p)}><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z" /><circle cx="8" cy="8" r="1.2" /></svg>
)
export const IconChart = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>
)
export const IconMegaphone = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 10v4h3l7 4.5v-13L7 10z" /><path d="M17.5 9a4 4 0 0 1 0 6" /></svg>
)
export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
)
export const IconSettings = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></svg>
)
