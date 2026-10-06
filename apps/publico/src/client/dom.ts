/** Utilitários mínimos de DOM usados pelos enhancers. */
export function all<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector))
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string; attrs?: Record<string, string> } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props.className) node.className = props.className
  if (props.text !== undefined) node.textContent = props.text
  for (const [key, value] of Object.entries(props.attrs ?? {})) node.setAttribute(key, value)
  for (const child of children) node.append(child)
  return node
}

export function plural(n: number, forms: [string, string]): string {
  return `${n} ${n === 1 ? forms[0] : forms[1]}`
}
