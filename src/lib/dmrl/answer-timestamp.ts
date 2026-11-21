/**
 * Zeitpunkt der Übernahme einer Antwort (`answer_timestamp`, PROJ-13 Refinement 2026-11-21):
 * ISO 8601 in Ortszeit ohne Zeitzone, z. B. `2026-11-21T14:30:05`.
 */
const pad = (value: number) => String(value).padStart(2, "0")

/** ISO-Zeitpunkt (z. B. `new Date().toISOString()`) → `JJJJ-MM-TTThh:mm:ss` in Ortszeit */
export function toAnswerTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/

/** Anzeige „21.11.2026 14:30"; leer bleibt leer, unbekanntes Format wird unverändert angezeigt */
export function formatAnswerTimestamp(value: string): string {
  const match = PATTERN.exec(value)
  if (!match) return value
  const [, year, month, day, hour, minute] = match
  return `${day}.${month}.${year} ${hour}:${minute}`
}
