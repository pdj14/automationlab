export type LinearTheme = {
  source: string
  timestamp: string
  cssVariables: Record<string, string>
  fonts: {
    fontFamilies: string[]
    fontFaces: Array<{ fontFamily: string | null; src: string | null; fontStyle: string | null; fontWeight: string | null; fontDisplay: string | null }>
  }
  colors: string[]
}

function ensureStyleElement(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }
  return el
}

export async function applyLinearTheme(jsonUrl: string = '/linearTheme.json'): Promise<void> {
  const res = await fetch(jsonUrl, { cache: 'no-cache' })
  if (!res.ok) return
  const theme: LinearTheme = await res.json()

  // Ensure we start in dark mode unless already set, so styles apply without FOUC
  const root = document.documentElement
  if (!root.getAttribute('data-theme')) {
    root.setAttribute('data-theme', 'dark')
  }

  // Write variables into a stylesheet under [data-theme="dark"] rather than inline styles
  // so that [data-theme="light"] overrides can take effect.
  const varsEl = ensureStyleElement('linear-vars')
  const declarations = Object.entries(theme.cssVariables || {})
    .filter(([key]) => key.startsWith('--'))
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n')
  varsEl.textContent = `:root[data-theme="dark"] {\n${declarations}\n}`

  // Inject @font-face rules
  if (theme.fonts?.fontFaces?.length) {
    const styleEl = ensureStyleElement('linear-fonts')
    const rules: string[] = []
    for (const f of theme.fonts.fontFaces) {
      if (!f.src || !f.fontFamily) continue
      rules.push(`@font-face { font-family: ${f.fontFamily}; src: ${f.src}; ${f.fontStyle ? `font-style: ${f.fontStyle};` : ''} ${f.fontWeight ? `font-weight: ${f.fontWeight};` : ''} ${f.fontDisplay ? `font-display: ${f.fontDisplay};` : ''} }`)
    }
    styleEl.textContent = rules.join('\n')
  }
}


