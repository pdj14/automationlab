const STORAGE_KEY = 'sdf-theme'

export type ThemeMode = 'dark' | 'light'

function ensureOverridesStyle(): HTMLStyleElement {
  let el = document.getElementById('sdf-theme-overrides') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'sdf-theme-overrides'
    document.head.appendChild(el)
  }
  return el
}

function lightOverridesCss(): string {
  // Minimal light palette mapped to our Linear token names
  return `:root[data-theme="light"] {
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f8f9fb;
    --color-bg-tertiary: #f3f4f6;
    --color-bg-quaternary: #eef0f3;
    --color-bg-level-0: #ffffff;
    --color-bg-level-1: #ffffff;
    --color-bg-level-2: #f7f8fa;
    --color-bg-level-3: #f1f2f5;
    --color-bg-marketing: #ffffff;
    --color-bg-tint: #f7f8fa;

    --color-fg-primary: #0b0c0d;
    --color-fg-secondary: #1f2937;
    --color-fg-tertiary: #4b5563;
    --color-text-primary: #0b0c0d;
    --color-text-secondary: #374151;
    --color-text-tertiary: #6b7280;
    --color-text-quaternary: #9ca3af;

    --color-border-primary: #e5e7eb;
    --color-border-secondary: #e2e5ea;
    --color-border-tertiary: #d6dae0;
    --color-line-primary: #e5e7eb;
    --color-line-secondary: #eceff3;

    --header-bg: rgba(255, 255, 255, 0.7);
    --header-border: rgba(0,0,0,0.08);
    --scrollbar-color: rgba(0,0,0,.12);
    --scrollbar-color-hover: rgba(0,0,0,.2);
    --scrollbar-color-active: rgba(0,0,0,.35);
    --color-overlay-primary: rgba(255,255,255,0.9);
  }`;
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  localStorage.setItem(STORAGE_KEY, mode)

  const styleEl = ensureOverridesStyle()
  if (mode === 'light') {
    styleEl.textContent = lightOverridesCss()
  } else {
    styleEl.textContent = ''
  }
}

export function initTheme(): ThemeMode {
  const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null)
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const mode: ThemeMode = saved ?? (prefersDark ? 'dark' : 'dark')
  applyTheme(mode)
  return mode
}



