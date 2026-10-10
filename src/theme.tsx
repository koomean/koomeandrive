import { useSyncExternalStore } from 'react'

type ThemePreference = 'auto' | 'light' | 'dark'
const key = 'koomean_drive_theme_v1'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()
function read(): ThemePreference {
  try {
    const value = localStorage.getItem(key)
    if (value === 'light' || value === 'dark') return value
  } catch { /* Follow the system when storage is unavailable. */ }
  return 'auto'
}
let preference = read()
function apply() {
  const theme = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.themePreference = preference
  document.documentElement.style.colorScheme = theme
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#101723' : '#f8fafd'
  listeners.forEach(listener => listener())
}
function setPreference(value: ThemePreference) {
  preference = value
  try { localStorage.setItem(key, value) } catch { /* Preserve the choice for this visit. */ }
  apply()
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
media.addEventListener('change', () => { if (preference === 'auto') apply() })
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) { preference = read(); apply() }
})
apply()

export function ThemeSelect() {
  const value = useSyncExternalStore(subscribe, () => preference)
  return <select className="koo-theme-select" aria-label="ธีมการแสดงผล" value={value} onChange={event => setPreference(event.target.value as ThemePreference)}><option value="auto">ตามระบบ</option><option value="light">สว่าง</option><option value="dark">มืด</option></select>
}
