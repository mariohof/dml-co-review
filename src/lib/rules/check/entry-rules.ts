import type { EntryFields } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { ISSUE_TYPES } from "@/lib/dmrl/issue-type"
import { ISO_3166_1_ALPHA2, ISO_639_1 } from "../iso-codes"
import type { Candidate, Finding } from "./types"

/** Gemeinsame Regeln für Check-in und REPLY (PROJ-8 Gruppen A, B, C, D, E, I) */

type FieldName = keyof EntryFields

interface FormatRule {
  test: (value: string) => boolean
  description: string
}

const alnum = (min: number, max: number): FormatRule => ({
  test: (v) => new RegExp(`^[A-Za-z0-9]{${min},${max}}$`).test(v),
  description: min === max ? `${min} Stelle${min > 1 ? "n" : ""} alphanumerisch` : `${min}–${max} Stellen alphanumerisch`,
})
const digits = (n: number): FormatRule => ({ test: (v) => new RegExp(`^\\d{${n}}$`).test(v), description: `${n} Ziffern` })
const oneOf = (values: string[], description: string): FormatRule => ({ test: (v) => values.includes(v), description })

/** Feldformate laut Spec (Tabelle Gruppe A); leere Werte prüft Gruppe B */
export const FORMAT_RULES: Partial<Record<FieldName, FormatRule>> = {
  dmentryType: oneOf(["n", "c", "d"], "leer, n, c oder d"),
  modelic: alnum(2, 14),
  sdc: alnum(1, 4),
  chapnum: alnum(2, 3),
  section: alnum(1, 1),
  subsect: alnum(1, 1),
  subject: alnum(2, 4),
  discode: alnum(2, 2),
  discodev: alnum(1, 3),
  incode: alnum(3, 3),
  incodev: alnum(1, 1),
  itemloc: alnum(1, 1),
  language: { test: (v) => /^[a-z]{2}$/.test(v) && ISO_639_1.has(v), description: "Sprachcode nach ISO 639-1 (2 Kleinbuchstaben)" },
  country: { test: (v) => /^[A-Z]{2}$/.test(v) && ISO_3166_1_ALPHA2.has(v), description: "Ländercode nach ISO 3166 (2 Großbuchstaben)" },
  security: { test: (v) => /^(0[1-9]|1\d|20)$/.test(v), description: "2 Ziffern, 01–20" },
  issno: digits(3),
  type: oneOf([...ISSUE_TYPES], "new, changed, revised, deleted oder status"),
  day: digits(2),
  month: digits(2),
  year: digits(4),
  answer: oneOf(["y", "n"], "leer, y oder n"),
}

export const MANDATORY_CHECKIN: FieldName[] = [
  "modelic", "sdc", "chapnum", "section", "subsect", "subject", "discode", "discodev", "incode", "incodev", "itemloc",
  "techname", "infoname", "language", "country", "security", "rpc", "issno", "type", "day", "month", "year",
]
/** Im REPLY-XML dürfen Ausgabedaten fehlen (PROJ-8 B, Ausnahme REPLY) */
export const OPTIONAL_IN_REPLY: FieldName[] = ["issno", "type", "day", "month", "year"]
export const MANDATORY_REPLY = MANDATORY_CHECKIN.filter((f) => !OPTIONAL_IN_REPLY.includes(f))

const finding = (group: Finding["group"], c: Candidate, message: string, field?: string): Finding => ({
  severity: "fehler",
  group,
  line: c.line,
  dmc: formatDmc(c.fields),
  field,
  message,
})

/** Gruppe A — Feldformat */
export function checkFormats(candidates: Candidate[]): Finding[] {
  const findings: Finding[] = []
  for (const c of candidates) {
    for (const [name, rule] of Object.entries(FORMAT_RULES) as [FieldName, FormatRule][]) {
      const value = c.fields[name]
      if (value !== "" && !rule.test(value)) {
        findings.push(finding("A", c, `Format: ${rule.description}, gefunden ‚${value}'.`, name))
      }
    }
    const { day, month, year } = c.fields
    if ([day, month, year].every((v) => /^\d+$/.test(v)) && day.length === 2 && month.length === 2 && year.length === 4) {
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
      const valid =
        date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
      if (!valid) findings.push(finding("A", c, `Ungültiges Datum ${day}.${month}.${year}.`, "day"))
    }
  }
  return findings
}

/** Gruppe B — Pflichtfelder */
export function checkMandatory(candidates: Candidate[], source: "checkin" | "reply"): Finding[] {
  const mandatory = source === "checkin" ? MANDATORY_CHECKIN : MANDATORY_REPLY
  const findings: Finding[] = []
  for (const c of candidates) {
    for (const name of mandatory) {
      if (c.fields[name] === "") findings.push(finding("B", c, "Pflichtfeld ist leer.", name))
    }
    if (source === "reply") {
      // Ausgabedatum vollständig oder gar nicht
      const parts = [c.fields.day, c.fields.month, c.fields.year]
      if (parts.some((v) => v !== "") && parts.some((v) => v === "")) {
        findings.push(finding("B", c, "Ausgabedatum ist unvollständig (Tag, Monat und Jahr angeben oder alle leer lassen).", "day"))
      }
    }
  }
  return findings
}

/** Gruppe C — DMC eindeutig */
export function checkUniqueDmc(candidates: Candidate[]): Finding[] {
  const byDmc = new Map<string, Candidate[]>()
  for (const c of candidates) {
    const dmc = formatDmc(c.fields)
    byDmc.set(dmc, [...(byDmc.get(dmc) ?? []), c])
  }
  const findings: Finding[] = []
  for (const list of byDmc.values()) {
    if (list.length < 2) continue
    const lines = list.map((c) => c.line).join(", ")
    for (const c of list) findings.push(finding("C", c, `DMC kommt mehrfach vor (Zeilen/Positionen ${lines}).`))
  }
  return findings
}

/** Gruppe D — MI des Eintrags = MI des Systems */
export function checkModelic(candidates: Candidate[], systemModelic: string): Finding[] {
  return candidates
    .filter((c) => c.fields.modelic !== "" && c.fields.modelic !== systemModelic)
    .map((c) => finding("D", c, `MI ‚${c.fields.modelic}' passt nicht zum System ‚${systemModelic}'.`, "modelic"))
}

function checkConsistency(
  candidates: Candidate[],
  group: "E" | "I",
  key: (f: EntryFields) => string,
  valueField: "techname" | "infoname",
  describe: (f: EntryFields) => string
): Finding[] {
  const values = new Map<string, Map<string, Candidate[]>>()
  for (const c of candidates) {
    const k = key(c.fields)
    const inner = values.get(k) ?? new Map<string, Candidate[]>()
    const value = c.fields[valueField]
    inner.set(value, [...(inner.get(value) ?? []), c])
    values.set(k, inner)
  }
  const findings: Finding[] = []
  for (const inner of values.values()) {
    if (inner.size < 2) continue
    const variants = [...inner.keys()].map((v) => `‚${v}'`).join(", ")
    for (const list of inner.values()) {
      for (const c of list) {
        findings.push(finding(group, c, `${describe(c.fields)} hat unterschiedliche ${valueField === "techname" ? "Tech Names" : "Info Names"}: ${variants}.`, valueField))
      }
    }
  }
  return findings
}

/** Gruppe E — gleiche SNS + Discode + Discodev ⇒ gleicher Tech Name */
export const checkSnsTechname = (candidates: Candidate[]) =>
  checkConsistency(
    candidates,
    "E",
    (f) => [f.modelic, f.sdc, f.chapnum, f.section, f.subsect, f.subject, f.discode, f.discodev].join("|"),
    "techname",
    (f) => `SNS ${f.sdc}-${f.chapnum}-${f.section}${f.subsect}-${f.subject}, Discode ${f.discode}${f.discodev}`
  )

/** Gruppe I — gleicher Infocode (incode + incodev) ⇒ gleicher Info Name */
export const checkInfocodeInfoname = (candidates: Candidate[]) =>
  checkConsistency(candidates, "I", (f) => f.incode + f.incodev, "infoname", (f) => `Infocode ${f.incode}${f.incodev}`)

/** Gruppen A, B, C, D, E, I zusammen */
export function checkCommon(candidates: Candidate[], source: "checkin" | "reply", systemModelic: string): Finding[] {
  return [
    ...checkFormats(candidates),
    ...checkMandatory(candidates, source),
    ...checkUniqueDmc(candidates),
    ...checkModelic(candidates, systemModelic),
    ...checkSnsTechname(candidates),
    ...checkInfocodeInfoname(candidates),
  ]
}
