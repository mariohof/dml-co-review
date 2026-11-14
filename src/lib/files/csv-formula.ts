/**
 * Schutz vor CSV-Formel-Injection (BUG-QA2-1, OWASP „CSV Injection").
 *
 * Excel führt Zellen, die mit = + - @ (bzw. Tab/Wagenrücklauf) beginnen, als Formel aus. Beim Schreiben wird solchen Werten
 * ein Apostroph vorangestellt (auch Werten, die bereits mit Apostrophen davor beginnen — sonst wäre der Rundlauf nicht
 * eindeutig). Beim Lesen (Check-in) wird genau ein Apostroph wieder entfernt — so bleibt Check-out → Check-in verlustfrei.
 */

const GUARDED = /^'*[=+\-@\t\r]/

/** Wert für eine CSV-Zelle entschärfen */
export const guardCsvCell = (value: string): string => (GUARDED.test(value) ? `'${value}` : value)

/** Entschärfung beim Lesen rückgängig machen (nur wenn der Wert dem Schutzmuster entspricht) */
export const unguardCsvCell = (value: string): string => (value.startsWith("'") && GUARDED.test(value.slice(1)) ? value.slice(1) : value)
