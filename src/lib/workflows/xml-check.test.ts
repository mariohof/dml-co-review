import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { DEMO_FILES } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { ENTRY_FIELD_NAMES } from "@/lib/data/schema"
import { runCheckinCheck } from "@/lib/rules/check/checkin"
import { readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { errorCount, hintCount } from "@/lib/rules/check/types"
import type { XsdResult } from "@/lib/xsd/types"
import {
  checkModelicUniform,
  checkXmlText,
  formatDmlCode,
  ISSUE_MISMATCH,
  deriveIssueType,
  fillIssueData,
  issueDataFilled,
  issueDataMissing,
  toCheckDate,
  MI_NOT_UNIFORM,
  runXmlCheck,
  XSD_NOT_PERFORMED,
  xmlCsvFileName,
} from "./xml-check"

/** Demo-Dateien enthalten keine Ausgabedaten (issno/type/Datum) — für fehlerfreie Fälle ergänzt */
const withIssueData = (xml: string) =>
  xml.replace(/<\/dmtitle>/g, '</dmtitle><issno issno="001" type="new"></issno><issdate day="01" month="02" year="2027"></issdate>')
const DEMO_SEND = DEMO_XML_FILES[DEMO_FILES.send2]
/** REPLY mit einer Ablehnung samt Begründung */
const REPLY = withIssueData(DEMO_XML_FILES[DEMO_FILES.reply1]).replace(
  /<answer answer="y">\s*<remarks><\/remarks>/,
  '<answer answer="n"><remarks>Bitte Infocode prüfen</remarks>'
)
const SEND = withIssueData(DEMO_SEND)
const BIKE_42 = readFileSync(join(process.cwd(), "docs/beispiele/issue-4.2/DML-S1000DBIKE-B6865-S-2016-00002_001-00.XML"), "utf8")
const VALID: XsdResult = { state: "gueltig", issue: "2.3" }
const NOW = new Date(2027, 2, 5, 10, 0)
const xmlFile = (content: BlobPart, name = "partner.xml") => new File([content], name, { type: "application/xml" })

describe("checkXmlText — gültige Datei", () => {
  it("SEND 2.3: keine Fehler, Kopfdaten, MI, CSV im Check-out-Format", () => {
    const result = checkXmlText("send.XML", "2.3", SEND, VALID)
    expect(errorCount(result.report)).toBe(0)
    expect(result.xsd).toBe("bestanden")
    expect(result.parsed?.header.direction).toBe("send")
    expect(formatDmlCode(result.parsed!.header.dmlc)).toBe("DML-PHUNGUN-D0815-C-2026-00002")
    expect(result.summary.modelic).toBe("PHUNGUN")
    expect(result.summary.entries).toBe(result.candidates.length)
    expect(result.summary.ohneAntwort).toBe(result.summary.entries)
    const csv = result.csv!
    expect(csv.startsWith("﻿dmentryType;modelic")).toBe(true)
    expect(csv.split("\r\n")[0].split(";")).toHaveLength(ENTRY_FIELD_NAMES.length)
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(result.candidates.length + 1)
  })

  it("REPLY: Antworten gezählt und in answer/answer_comment der CSV", () => {
    const result = checkXmlText("reply.XML", "2.3", REPLY, VALID)
    expect(result.parsed?.header.direction).toBe("reply")
    const { freigegeben, zuUeberarbeiten, ohneAntwort, entries } = result.summary
    expect(freigegeben).toBeGreaterThan(0)
    expect(zuUeberarbeiten).toBeGreaterThan(0)
    expect(freigegeben + zuUeberarbeiten + ohneAntwort).toBe(entries)
    const read = readCheckinCsv(result.csv!)
    expect(read.aborted).toBe(false)
    expect(read.candidates.filter((c) => c.fields.answer === "n").length).toBe(zuUeberarbeiten)
    expect(read.candidates.find((c) => c.fields.answer === "n")?.fields.answer_comment).toBe("Bitte Infocode prüfen")
  })

  it("Rundlauf: CSV einer fehlerfreien Datei besteht die Check-in-Regelprüfung", () => {
    const result = checkXmlText("send.XML", "2.3", SEND, VALID)
    const snapshot = result.candidates.map((c, i) => ({ id: `e${i}`, status: "gesendet" as const, fields: c.fields }))
    const checkin = runCheckinCheck(result.csv!, { systemModelic: "PHUNGUN", snapshot })
    expect(checkin.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
  })

  it("Issue 4.2 (Beispiel aus docs/beispiele) wird mit dem 4.x-Leser gelesen; MI uneinheitlich wird erkannt", () => {
    const result = checkXmlText("bike.XML", "4.2", BIKE_42, { state: "gueltig", issue: "4.2" })
    expect(result.csv).not.toBeNull()
    expect(result.candidates.length).toBeGreaterThan(50)
    expect(result.summary.modelic).toBe(MI_NOT_UNIFORM)
    expect(result.report.findings.filter((f) => f.group === "D").every((f) => f.message.includes("S1000DBIKE"))).toBe(true)
  })

  it("SEND ohne Ausgabedaten: keine Pflichtfeld-Fehler, ein Hinweis „ergänzt“, CSV mit allen Einträgen (Refinement 2)", () => {
    const result = checkXmlText("send.XML", "2.3", DEMO_SEND, VALID, NOW)
    expect(errorCount(result.report)).toBe(0)
    expect(result.report.findings).toEqual([{ severity: "hinweis", group: "B", message: issueDataFilled(result.candidates.length, toCheckDate(NOW)) }])
    expect(result.filledEntries).toBe(result.candidates.length)
    expect(result.csv!.split("\r\n").filter(Boolean)).toHaveLength(result.candidates.length + 1)
  })

  it("Ausgabedaten teilweise: kein Fehler für fehlende Ausgabenummer, aber unvollständiges Datum ist ein Fehler", () => {
    const xml = withIssueData(DEMO_SEND)
      .replace('<issno issno="001" type="new"></issno>', "")
      .replace(/<issdate day="01" month="02" year="2027"><\/issdate>/, '<issdate day="" month="" year="2027"></issdate>')
    const result = checkXmlText("send.XML", "2.3", xml, VALID)
    const errors = result.report.findings.filter((f) => f.severity === "fehler")
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ group: "B", field: "day", message: expect.stringContaining("Ausgabedatum ist unvollständig") })
    expect(hintCount(result.report)).toBe(1)
    expect(result.filledEntries).toBe(1)
    expect(checkXmlText("send.XML", "2.3", withIssueData(DEMO_SEND), VALID).report.findings).toEqual([])
  })

  it("Sammelhinweis: Einzahl", () => {
    expect(issueDataMissing(1)).toBe("Bei 1 Eintrag fehlen Ausgabedaten (Ausgabenummer, Ausgabetyp, Datum) — beim Check-in sind sie Pflicht.")
    expect(issueDataFilled(1, { day: "05", month: "03", year: "2027" })).toBe(
      "Bei 1 Eintrag fehlten Ausgabedaten — in der CSV ergänzt: Ausgabetyp aus dem Eintragstyp (n → new, c → changed, d → deleted; ohne Eintragstyp new und Eintragstyp n), Ausgabenummer 001 und Datum 05.03.2027 (nur wo leer)."
    )
  })
})

describe("Ausgabedaten ergänzen (Refinement 2, 2026-11-16)", () => {
  const csvRows = (csv: string) => readCheckinCsv(csv).candidates
  const date = toCheckDate(NOW)

  it("Prüfdatum: lokales Datum mit führenden Nullen", () => {
    expect(toCheckDate(new Date(2027, 0, 5, 23, 59))).toEqual({ day: "05", month: "01", year: "2027" })
  })

  it("issno fehlt ganz: CSV erhält 001/new/Prüfdatum/n; Bericht und Einträge bleiben auf den Originaldaten", () => {
    const xml = DEMO_SEND.replace(/<dmentry type="[nd]">/g, '<dmentry type="">')
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    expect(result.candidates.every((c) => c.fields.issno === "" && c.fields.dmentryType === "")).toBe(true)
    const rows = csvRows(result.csv!)
    expect(rows).toHaveLength(result.candidates.length)
    for (const row of rows) {
      expect(row.fields).toMatchObject({ issno: "001", type: "new", day: date.day, month: date.month, year: date.year, dmentryType: "n" })
    }
  })

  it("vorhandenes Datum und vorhandener Eintragstyp c/d bleiben erhalten; Ausgabetyp abgeleitet (Refinement 3)", () => {
    let n = 0
    const xml = DEMO_SEND.replace(/<dmentry type="[nd]">/g, () => (++n === 1 ? '<dmentry type="c">' : n === 2 ? '<dmentry type="d">' : '<dmentry type="n">')).replace(
      /<\/dmtitle>/g,
      '</dmtitle><issdate day="01" month="02" year="2025"></issdate>'
    )
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    const rows = csvRows(result.csv!)
    expect(rows.every((r) => r.fields.issno === "001" && r.fields.year === "2025" && r.fields.day === "01")).toBe(true)
    expect(rows.filter((r) => r.fields.dmentryType === "c").map((r) => r.fields.type)).toEqual(["changed"])
    expect(rows.filter((r) => r.fields.dmentryType === "d").map((r) => r.fields.type)).toEqual(["deleted"])
    expect(rows.filter((r) => r.fields.dmentryType === "n").every((r) => r.fields.type === "new")).toBe(true)
  })

  it("nur @issno ohne Ausgabetyp → ergänzt (Nummer bleibt); Ausgabetyp ohne Datum → Sammelhinweis; Mischfall → beide Hinweise", () => {
    let n = 0
    const xml = DEMO_SEND.replace(/<\/dmtitle>/g, (m) =>
      ++n === 1 ? `${m}<issno issno="002" type=""></issno>` : n === 2 ? `${m}<issno issno="003" type="changed"></issno>` : m
    )
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    const total = result.candidates.length
    expect(result.filledEntries).toBe(total - 1)
    expect(result.report.findings).toEqual([
      { severity: "hinweis", group: "B", message: issueDataFilled(total - 1, date) },
      { severity: "hinweis", group: "B", message: issueDataMissing(1) },
    ])
    const rows = csvRows(result.csv!)
    const kept = rows.find((r) => r.fields.issno === "002")!.fields
    expect(kept).toMatchObject({ type: deriveIssueType(kept.dmentryType), day: date.day, month: date.month, year: date.year })
    expect(rows.find((r) => r.fields.issno === "003")!.fields).toMatchObject({ type: "changed", day: "" })
  })

  it("unvollständiges Datum ohne issno: issno/type ergänzt, Datum nicht, Fehler bleibt", () => {
    const xml = DEMO_SEND.replace(/<\/dmtitle>/, '</dmtitle><issdate day="" month="" year="2027"></issdate>')
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    expect(result.report.findings.filter((f) => f.severity === "fehler").map((f) => f.message)).toEqual([expect.stringContaining("Ausgabedatum ist unvollständig")])
    const row = csvRows(result.csv!).find((r) => r.fields.year === "2027" && r.fields.day === "")!
    expect(row.fields).toMatchObject({ issno: "001", type: deriveIssueType(row.fields.dmentryType), month: "" })
  })

  it("Ableitungstabelle: n → new, c → changed, d → deleted, leer/unbekannt → new (Refinement 3)", () => {
    expect(["n", "c", "d", "", "x"].map(deriveIssueType)).toEqual(["new", "changed", "deleted", "new", "new"])
  })

  it("Eintragstyp je Fall: n/c/d bleiben, leer → n, unbekannt bleibt und Regel A meldet ihn (Refinement 3)", () => {
    const types = ["n", "c", "d", "", "x"]
    let i = 0
    const xml = DEMO_SEND.replace(/<dmentry type="[nd]">/g, () => `<dmentry type="${types[i++ % types.length]}">`)
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    const expected: Record<string, [string, string]> = { n: ["n", "new"], c: ["c", "changed"], d: ["d", "deleted"], "": ["n", "new"], x: ["x", "new"] }
    const filled = fillIssueData(result.candidates, date).candidates
    result.candidates.forEach((c, k) => {
      const [entryType, issueType] = expected[c.fields.dmentryType]
      expect(filled[k].fields).toMatchObject({ dmentryType: entryType, type: issueType, issno: "001", ...date })
    })
    expect(result.report.findings.some((f) => f.severity === "fehler" && f.group === "A" && f.field === "dmentryType")).toBe(true)
  })

  it("vorhandene Ausgabenummer 002 mit leerem Ausgabetyp: 002 bleibt, Typ abgeleitet, Prüfdatum ergänzt; vorhandenes Datum bleibt", () => {
    const xml = DEMO_SEND.replace(/<dmentry type="[nd]">/, '<dmentry type="c">').replace(
      /<\/dmtitle>/,
      '</dmtitle><issno issno="002" type=""></issno>'
    )
    const rows = csvRows(checkXmlText("send.XML", "2.3", xml, VALID, NOW).csv!)
    expect(rows.find((r) => r.fields.issno === "002")!.fields).toMatchObject({ dmentryType: "c", type: "changed", ...date })
    const withDate = xml.replace('type=""></issno>', 'type=""></issno><issdate day="09" month="09" year="2024"></issdate>')
    const row = csvRows(checkXmlText("send.XML", "2.3", withDate, VALID, NOW).csv!).find((r) => r.fields.issno === "002")!
    expect(row.fields).toMatchObject({ type: "changed", day: "09", month: "09", year: "2024" })
  })

  it("Ausgabetyp vorhanden, Ausgabenummer oder Datum fehlen: keine Ergänzung, Sammelhinweis zählt den Eintrag", () => {
    let n = 0
    const xml = DEMO_SEND.replace(/<\/dmtitle>/g, (m) =>
      ++n === 1 ? `${m}<issno issno="" type="deleted"></issno><issdate day="01" month="01" year="2026"></issdate>` : n === 2 ? `${m}<issno issno="004" type="changed"></issno>` : m
    )
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    expect(result.filledEntries).toBe(result.candidates.length - 2)
    expect(result.report.findings.map((f) => f.message)).toContain(issueDataMissing(2))
    const rows = csvRows(result.csv!)
    expect(rows.find((r) => r.fields.type === "deleted" && r.fields.year === "2026")!.fields.issno).toBe("")
    expect(rows.find((r) => r.fields.issno === "004")!.fields).toMatchObject({ type: "changed", day: "" })
  })

  it("Issue 4.2: Ausgabetyp leer → aus dmlEntryType abgeleitet", () => {
    let n = 0
    const stripped = BIKE_42.replace(/\s+issueType="[^"]*"/g, "").replace(/<dmlEntry>/g, () => `<dmlEntry dmlEntryType="${["c", "d", "n"][n++ % 3]}">`)
    const result = checkXmlText("bike.XML", "4.2", stripped, { state: "gueltig", issue: "4.2" }, NOW)
    expect(result.filledEntries).toBe(result.candidates.length)
    const filled = fillIssueData(result.candidates, date).candidates
    result.candidates.forEach((c, k) => expect(filled[k].fields.type).toBe(deriveIssueType(c.fields.dmentryType)))
    expect(new Set(filled.map((c) => c.fields.type))).toEqual(new Set(["new", "changed", "deleted"]))
  })

  it("Rundlauf: CSV mit c/changed und d/deleted besteht die Check-in-Regelprüfung ohne Fehler zu Ausgabedaten", () => {
    const result = checkXmlText("send.XML", "2.3", DEMO_SEND, VALID, NOW)
    const rows = csvRows(result.csv!)
    expect(rows.some((r) => r.fields.dmentryType === "d" && r.fields.type === "deleted")).toBe(true)
    // bestehende DMRL mit allen Einträgen → c/d-Einträge sind vorhanden
    const snapshot = result.candidates.map((c, i) => ({ id: `e${i}`, status: "gesendet" as const, fields: c.fields }))
    const checkin = runCheckinCheck(result.csv!, { systemModelic: "PHUNGUN", snapshot })
    const issueFields = ["issno", "type", "day", "month", "year"]
    expect(checkin.report.findings.filter((f) => f.severity === "fehler" && issueFields.includes(f.field ?? ""))).toEqual([])
  })

  it("fillIssueData verändert die Originaleinträge nicht", () => {
    const original = checkXmlText("send.XML", "2.3", DEMO_SEND, VALID, NOW).candidates
    const copy = structuredClone(original)
    fillIssueData(original, date)
    expect(original).toEqual(copy)
  })

  it("Rundlauf: CSV aus einer Datei ohne Ausgabedaten besteht die Check-in-Regelprüfung ohne Pflichtfeld-Fehler", () => {
    // neue DMRL: alle Einträge neu, Eintragstyp leer → ergänztes ‚n' erfüllt Regel F
    const xml = DEMO_SEND.replace(/<dmentry type="[nd]">/g, '<dmentry type="">')
    const result = checkXmlText("send.XML", "2.3", xml, VALID, NOW)
    const checkin = runCheckinCheck(result.csv!, { systemModelic: "PHUNGUN", snapshot: [] })
    expect(checkin.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
  })
})

describe("checkXmlText — Fehlerfälle", () => {
  it("nicht wohlgeformt: Bericht laut xmllint, keine CSV", () => {
    const result = checkXmlText("x.xml", "2.3", "", { state: "nicht_wohlgeformt", issue: "2.3", findings: [{ line: 3, message: "Opening and ending tag mismatch" }] })
    expect(result.csv).toBeNull()
    expect(result.parsed).toBeNull()
    expect(result.report.findings[0]).toMatchObject({ severity: "fehler", group: "XSD", line: 3 })
  })

  it("Schemafehler: XSD-Befunde im Bericht, CSV trotzdem vorhanden", () => {
    const result = checkXmlText("x.xml", "2.3", SEND, { state: "schemafehler", issue: "2.3", findings: [{ line: 12, message: "Element 'foo': This element is not expected." }] })
    expect(result.xsd).toBe("schemafehler")
    expect(result.report.findings.filter((f) => f.group === "XSD")).toHaveLength(1)
    expect(result.csv).not.toBeNull()
  })

  it("falsche Issue (2.3-Datei als 4.2): „passt nicht zur gewählten Issue“, keine CSV", () => {
    const result = checkXmlText("x.xml", "4.2", SEND, { state: "schemafehler", issue: "4.2", findings: [{ line: 2, message: "No matching global declaration" }] })
    expect(result.csv).toBeNull()
    const s = result.report.findings.find((f) => f.group === "S")
    expect(s?.message).toContain(ISSUE_MISMATCH)
  })

  it("falsche Issue (4.2-Datei als 2.3): ebenfalls nicht lesbar", () => {
    const result = checkXmlText("x.xml", "2.3", BIKE_42, { state: "schemafehler", issue: "2.3", findings: [{ message: "x" }] })
    expect(result.csv).toBeNull()
  })

  it("XSD nicht verfügbar: Hinweis „XSD-Prüfung nicht durchgeführt“, Regelprüfung läuft, CSV vorhanden", () => {
    const result = checkXmlText("x.xml", "2.3", SEND, { state: "nicht_verfuegbar", reason: "programm_fehlt" })
    expect(result.xsd).toBe("nicht_durchgefuehrt")
    expect(result.xsdUnavailableDetail).toBeTruthy()
    expect(hintCount(result.report)).toBe(1)
    expect(result.report.findings[0].message).toContain(XSD_NOT_PERFORMED)
    expect(errorCount(result.report)).toBe(0)
    expect(result.csv).not.toBeNull()
  })

  it("XSD nicht verfügbar und kein gültiges XML: nicht lesbar, keine CSV", () => {
    const result = checkXmlText("x.xml", "2.3", "<dml><kaputt></dml>", { state: "nicht_verfuegbar", reason: "programm_fehlt" })
    expect(result.csv).toBeNull()
    expect(result.report.findings.some((f) => f.group === "S" && f.message.includes("kein gültiges XML"))).toBe(true)
  })

  it("Regelverstöße (doppelter DMC, Pflichtfeld, Benennung): Befunde je Eintrag, CSV enthält alle Einträge", () => {
    const parsedOnce = checkXmlText("x.xml", "2.3", SEND, VALID)
    // ersten Eintrag verdoppeln
    const dup = SEND.replace(/(<dmentry[\s\S]*?<\/dmentry>)/, "$1$1")
    const result = checkXmlText("x.xml", "2.3", dup, VALID)
    expect(result.report.findings.some((f) => f.group === "C")).toBe(true)
    expect(result.candidates).toHaveLength(parsedOnce.candidates.length + 1)
    expect(result.csv!.split("\r\n").filter(Boolean)).toHaveLength(result.candidates.length + 1)
  })
})

describe("checkModelicUniform", () => {
  const cand = (line: number, modelic: string) => ({ line, fields: { ...checkXmlText("x", "2.3", SEND, VALID).candidates[0].fields, modelic } })

  it("einheitlich: MI, keine Befunde", () => {
    expect(checkModelicUniform([cand(1, "AAA"), cand(2, "AAA")])).toEqual({ modelic: "AAA", findings: [] })
  })

  it("uneinheitlich: häufigster MI gilt, nur abweichende Einträge gemeldet", () => {
    const { modelic, findings } = checkModelicUniform([cand(1, "AAA"), cand(2, "BBB"), cand(3, "AAA")])
    expect(modelic).toBe(MI_NOT_UNIFORM)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ group: "D", line: 2, field: "modelic" })
    expect(findings[0].message).toContain("MI uneinheitlich")
  })

  it("keine Einträge: leer", () => {
    expect(checkModelicUniform([])).toEqual({ modelic: "", findings: [] })
  })
})

describe("runXmlCheck", () => {
  it("lehnt Nicht-XML und zu große Dateien ab, ohne den Server zu fragen", async () => {
    const validate = vi.fn()
    expect(await runXmlCheck(xmlFile("a", "a.csv"), "2.3", validate)).toEqual({ ok: false, message: "Bitte eine XML-Datei auswählen." })
    expect(await runXmlCheck(xmlFile(new Uint8Array(5 * 1024 * 1024 + 1), "big.xml"), "2.3", validate)).toMatchObject({ ok: false })
    expect(validate).not.toHaveBeenCalled()
  })

  it("prüft eine Datei vollständig mit der gewählten Issue", async () => {
    const validate = vi.fn().mockResolvedValue(VALID)
    const outcome = await runXmlCheck(xmlFile(SEND, "DML-PHUNGUN-D0815-C-2026-00002_001-00.XML"), "2.3", validate)
    expect(validate).toHaveBeenCalledWith(expect.any(File), "2.3")
    expect(outcome.ok && outcome.result.csv).toBeTruthy()
  })

  it("liest ISO-8859-1 laut XML-Deklaration korrekt", async () => {
    const latin = SEND.replace(/encoding="[^"]*"/i, 'encoding="ISO-8859-1"').replace(/<techname>[^<]*<\/techname>/, "<techname>Größe</techname>")
    const bytes = Uint8Array.from(latin, (ch) => ch.charCodeAt(0))
    const outcome = await runXmlCheck(xmlFile(bytes), "2.3", vi.fn().mockResolvedValue(VALID))
    expect(outcome.ok && outcome.result.candidates.some((c) => c.fields.techname === "Größe")).toBe(true)
  })
})

describe("xmlCsvFileName", () => {
  it("ersetzt die Endung .xml/.XML durch .csv", () => {
    expect(xmlCsvFileName("DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")).toBe("DML-PHUNGUN-C1234-C-2026-00002_001-00.csv")
    expect(xmlCsvFileName("partner.xml")).toBe("partner.csv")
  })
})
