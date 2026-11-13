import '@testing-library/jest-dom'

/**
 * Neuere Node-Versionen (≥ 25) bringen ein eigenes, ohne Speicherdatei unbrauchbares `localStorage` mit,
 * das das jsdom-`localStorage` überdeckt. Für Tests wird dann ein einfacher Speicher im Arbeitsspeicher genutzt.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
  }
}

if (typeof window !== 'undefined') {
  let usable = false
  try {
    usable = typeof window.localStorage?.setItem === 'function'
  } catch {
    usable = false
  }
  if (!usable) {
    Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), configurable: true })
  }

  // jsdom kennt einige DOM-Funktionen nicht, die Radix-Auswahllisten (shadcn Select) aufrufen
  const proto = window.HTMLElement.prototype
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {}
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {}
}
