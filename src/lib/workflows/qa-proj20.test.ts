import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { DEMO_FILES } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { emptyEntryFields } from "@/lib/data/schema"
import { answerDeviations, runCheckinCheck } from "@/lib/rules/check/checkin"
import { readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { errorCount } from "@/lib/rules/check/types"
import type { XsdResult } from "@/lib/xsd/types"
import { checkXmlText, issueDataFilled, issueDataMissing, runXmlCheck, toCheckDate } from "./xml-check"
import { unavailableDetail, validateXml } from "@/lib/xsd/client"

/** PROJ-20 QA — Grenzfälle des Prüfkerns */

const withIssueData = (xml: string) =>
  xml.replace(/<\/dmtitle>/g, '</dmtitle><issno issno="001" type="new"></issno><issdate day="01" month="02" year="2027"></issdate>')
const REPLY = withIssueData(DEMO_XML_FILES[DEMO_FILES.reply1])
const SEND = withIssueData(DEMO_XML_FILES[DEMO_FILES.send2])
const VALID: XsdResult = { state: "gueltig", issue: "2.3" }
const BIKE_50 = readFileSync(join(process.cwd(), "docs/beispiele/issue-5.0/DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML"), "utf8")

describe("PROJ-20 QA", () => {
  it("Formelschutz: Werte mit = + - @ werden in der CSV entschärft und beim Check-in wieder gelesen", () => {
    const xml = SEND.replace(/<techname>[^<]*<\/techname>/, "<techname>=1+1</techname>").replace(/<infoname>[^<]*<\/infoname>/, "<infoname>@SUMME(1)</infoname>")
    const result = checkXmlText("x.xml", "2.3", xml, VALID)
    expect(result.csv).toContain(";'=1+1;")
    expect(result.csv).toContain("'@SUMME(1)")
    const read = readCheckinCsv(result.csv!)
    expect(read.candidates.some((c) => c.fields.techname === "=1+1")).toBe(true)
  })

  // BUG-QA1-1 (behoben): UTF-16-Dateien werden gelesen
  it("UTF-16 laut Deklaration wird korrekt gelesen; die CSV ist UTF-8 mit BOM", async () => {
    const xml = SEND.replace(/encoding="[^"]*"/i, 'encoding="UTF-16"').replace(/<techname>[^<]*<\/techname>/, "<techname>Prüfgerät ÄÖÜß</techname>")
    const bytes = new Uint8Array(2 + xml.length * 2)
    bytes[0] = 0xff
    bytes[1] = 0xfe
    for (let i = 0; i < xml.length; i++) {
      bytes[2 + i * 2] = xml.charCodeAt(i) & 0xff
      bytes[3 + i * 2] = xml.charCodeAt(i) >> 8
    }
    const outcome = await runXmlCheck(new File([bytes], "utf16.xml"), "2.3", vi.fn().mockResolvedValue(VALID))
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.candidates.some((c) => c.fields.techname === "Prüfgerät ÄÖÜß")).toBe(true)
    expect(outcome.result.csv!.charCodeAt(0)).toBe(0xfeff)
  })

  it("Issue 5.0 (Beispiel) wird mit dem 4.x/5.0-Leser gelesen", () => {
    const result = checkXmlText("bike50.xml", "5.0", BIKE_50, { state: "gueltig", issue: "5.0" })
    expect(result.csv).not.toBeNull()
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it("DML ohne Einträge: CSV nur mit Kopfzeile, MI leer", () => {
    const empty = SEND.replace(/<dmentry[\s\S]*<\/dmentry>/, "")
    const result = checkXmlText("leer.xml", "2.3", empty, { state: "schemafehler", issue: "2.3", findings: [{ line: 5, message: "Missing child element(s)." }] })
    expect(result.candidates).toHaveLength(0)
    expect(result.csv!.split("\r\n").filter(Boolean)).toHaveLength(1)
    expect(result.summary.modelic).toBe("")
    expect(errorCount(result.report)).toBe(1)
  })

  it("Rundlauf mit Antworten: Check-in meldet keine Fehler, aber abweichende Empfängerantworten zur Übernahme", () => {
    const result = checkXmlText("reply.xml", "2.3", REPLY, VALID)
    expect(errorCount(result.report)).toBe(0)
    // Stand der DMRL: gleiche Einträge, aber ohne Antworten
    const snapshot = result.candidates.map((c, i) => ({ id: `e${i}`, status: "gesendet" as const, fields: { ...c.fields, answer: "", answer_comment: "" } }))
    const checkin = runCheckinCheck(result.csv!, { systemModelic: "PHUNGUN", snapshot })
    expect(checkin.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
    expect(answerDeviations(checkin.comparison!)).toHaveLength(result.candidates.length)
  })

  it("Regel D (MI des Systems) und Regel F/K laufen im Werkzeug nicht", () => {
    const result = checkXmlText("x.xml", "2.3", SEND.replace(/<dmentry type="n">/g, '<dmentry type="">'), VALID)
    expect(result.report.findings.filter((f) => ["F", "K"].includes(f.group))).toEqual([])
    expect(result.report.findings.filter((f) => f.group === "D")).toEqual([])
  })

  it("REPLY ohne Ausgabedaten: keine Fehler, nur der Sammelhinweis (Refinement 2026-11-16)", () => {
    const result = checkXmlText("reply.xml", "2.3", DEMO_XML_FILES[DEMO_FILES.reply1], VALID)
    expect(errorCount(result.report)).toBe(0)
    expect(result.report.findings.map((f) => f.severity)).toEqual(["hinweis"])
    expect(emptyEntryFields().issno).toBe("")
  })

  // ------------------------------------------------------------ Refinement 2026-11-16

  it("Ausgabedaten: Hinweis zählt nur ergänzte Einträge; vollständige Einträge zählen nicht (Refinement 2)", () => {
    let n = 0
    // nur bei den ersten 3 Einträgen Ausgabedaten ergänzen
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<\/dmtitle>/g, (m) =>
      ++n <= 3 ? `${m}<issno issno="001" type="new"></issno><issdate day="01" month="02" year="2027"></issdate>` : m
    )
    const now = new Date(2027, 2, 5)
    const result = checkXmlText("x.xml", "2.3", xml, VALID, now)
    expect(result.report.findings).toEqual([{ severity: "hinweis", group: "B", message: issueDataFilled(result.candidates.length - 3, toCheckDate(now)) }])
    expect(issueDataMissing(1)).toContain("beim Check-in sind sie Pflicht")
  })

  it("Ausgabedaten: Formatfehler bleiben Fehler (z. B. Ausgabenummer ‚1‘, Ausgabetyp ungültig, ungültiges Datum)", () => {
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<\/dmtitle>/, '</dmtitle><issno issno="1" type="neu"></issno><issdate day="31" month="02" year="2027"></issdate>')
    const result = checkXmlText("x.xml", "2.3", xml, VALID)
    const errors = result.report.findings.filter((f) => f.severity === "fehler")
    expect(errors.map((f) => f.field).sort()).toEqual(["day", "issno", "type"])
    expect(errors.every((f) => f.group === "A")).toBe(true)
  })

  it("Ausgabedaten: nur Ausgabenummer ohne Datum ist kein Fehler; nur Tag ohne Monat/Jahr ist ein Fehler", () => {
    const onlyIssno = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<\/dmtitle>/, '</dmtitle><issno issno="002" type="changed"></issno>')
    expect(errorCount(checkXmlText("x.xml", "2.3", onlyIssno, VALID).report)).toBe(0)
    const onlyDay = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<\/dmtitle>/, '</dmtitle><issdate day="05" month="" year=""></issdate>')
    const findings = checkXmlText("x.xml", "2.3", onlyDay, VALID).report.findings.filter((f) => f.severity === "fehler")
    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain("Ausgabedatum ist unvollständig")
  })

  it("Check-in bleibt streng: CSV mit Teil-Ausgabedaten (nicht ergänzt) wird beim Check-in mit Pflichtfeld-Fehlern abgewiesen", () => {
    // Ausgabetyp vorhanden, Datum fehlt → keine Ergänzung (Refinement 3)
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<\/dmtitle>/g, '</dmtitle><issno issno="001" type="new"></issno>')
    const result = checkXmlText("send.xml", "2.3", xml, VALID)
    expect(errorCount(result.report)).toBe(0)
    expect(result.filledEntries).toBe(0)
    const checkin = runCheckinCheck(result.csv!, { systemModelic: "PHUNGUN", snapshot: [] })
    const fields = new Set(checkin.report.findings.filter((f) => f.group === "B").map((f) => f.field))
    expect([...fields].sort()).toEqual(["day", "month", "year"])
  })

  it("XSD-Client: 403 → Zugriff abgelehnt, 500 / kaputte Antwort → unerwartet, Netzfehler → Server läuft nicht, 503 mit Grund → Grund", async () => {
    const respond = (body: string, status: number) => vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }))
    expect(await validateXml("<dml/>", "2.3", { fetchImpl: respond('{"error":"Anfrage nicht erlaubt."}', 403) })).toMatchObject({ reason: "zugriff_abgelehnt" })
    expect(await validateXml("<dml/>", "2.3", { fetchImpl: respond("<html>Internal Server Error</html>", 500) })).toMatchObject({ reason: "unerwartet" })
    expect(await validateXml("<dml/>", "2.3", { fetchImpl: respond("kein json", 200) })).toMatchObject({ reason: "unerwartet" })
    expect(await validateXml("<dml/>", "2.3", { fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")) })).toMatchObject({ reason: "nicht_erreichbar" })
    expect(await validateXml("<dml/>", "2.3", { fetchImpl: respond('{"state":"nicht_verfuegbar","reason":"schema_fehlt"}', 503) })).toMatchObject({ reason: "schema_fehlt" })
    // jede Meldung endet mit einem Punkt und enthält keinen Platzhalter mehr
    for (const reason of ["programm_fehlt", "schema_fehlt", "zeitlimit", "unerwartet", "nicht_erreichbar", "zugriff_abgelehnt"] as const) {
      expect(unavailableDetail(reason)).toMatch(/\.$/)
      expect(unavailableDetail(reason)).not.toContain("{")
    }
  })

  it("XSD nicht erreichbar: Ergebnis mit Hinweis, CSV vorhanden, Ausgabedaten-Hinweis zusätzlich", async () => {
    const outcome = await runXmlCheck(new File([DEMO_XML_FILES[DEMO_FILES.send2]], "s.xml"), "2.3", vi.fn().mockResolvedValue({ state: "nicht_verfuegbar", reason: "nicht_erreichbar" }))
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.xsd).toBe("nicht_durchgefuehrt")
    expect(outcome.result.csv).not.toBeNull()
    expect(outcome.result.report.findings.map((f) => f.severity)).toEqual(["hinweis", "hinweis"])
  })
})

/** PROJ-20 QA Refinement 2 (2026-11-16) — Ausgabedaten in der CSV ergänzen */
describe("PROJ-20 QA Refinement 2: Ausgabedaten ergänzen", () => {
  const SEND_RAW = DEMO_XML_FILES[DEMO_FILES.send2]
  const NOW = new Date(2027, 2, 5, 9, 0)
  const rows = (csv: string) => readCheckinCsv(csv).candidates.map((c) => c.fields)

  it("Issue 5.0 (Beispiel S1000DBIKE) ohne Ausgabedaten: alle Einträge ergänzt", () => {
    const stripped = BIKE_50.replace(/<issueInfo\b[^>]*\/>/g, "").replace(/<issueDate\b[^>]*\/>/g, "").replace(/\s+issueType="[^"]*"/g, "")
    const result = checkXmlText("bike50.xml", "5.0", stripped, { state: "gueltig", issue: "5.0" }, NOW)
    expect(result.filledEntries).toBe(result.candidates.length)
    expect(rows(result.csv!).every((f) => f.issno === "001" && f.type === "new" && f.day === "05" && f.month === "03" && f.year === "2027")).toBe(true)
  })

  it("Issue 5.0: Ausgabetyp leer → aus dmlEntryType abgeleitet (c → changed, d → deleted, n → new) (Refinement 3)", () => {
    let n = 0
    const stripped = BIKE_50.replace(/\s+issueType="[^"]*"/g, "").replace(/<dmlEntry>/g, () => `<dmlEntry dmlEntryType="${["c", "d", "n"][n++ % 3]}">`)
    const result = checkXmlText("bike50.xml", "5.0", stripped, { state: "gueltig", issue: "5.0" }, NOW)
    expect(result.filledEntries).toBe(result.candidates.length)
    const pairs = new Set(rows(result.csv!).map((f) => `${f.dmentryType}/${f.type}`))
    expect(pairs).toEqual(new Set(["c/changed", "d/deleted", "n/new"]))
  })

  it("nur Ausgabetyp ohne Ausgabenummer: keine Ergänzung, Sammelhinweis", () => {
    const xml = SEND_RAW.replace(/<\/dmtitle>/, '</dmtitle><issno issno="" type="changed"></issno>')
    const result = checkXmlText("x.xml", "2.3", xml, VALID, NOW)
    expect(result.filledEntries).toBe(result.candidates.length - 1)
    expect(result.report.findings.map((f) => f.message)).toContain(issueDataMissing(1))
    expect(rows(result.csv!).filter((f) => f.type === "changed")).toEqual([expect.objectContaining({ issno: "", day: "" })])
  })

  it("Ausgabenummer nur aus Leerzeichen gilt nicht als fehlend: wird nicht ersetzt, Formatfehler (Regel A)", () => {
    const xml = SEND_RAW.replace(/<\/dmtitle>/, '</dmtitle><issno issno=" " type=""></issno>')
    const result = checkXmlText("x.xml", "2.3", xml, VALID, NOW)
    // Refinement 3: Auslöser ist der leere Ausgabetyp → Eintrag wird ergänzt, die Ausgabenummer bleibt
    expect(result.filledEntries).toBe(result.candidates.length)
    expect(rows(result.csv!).some((f) => f.issno === " " || f.issno === "")).toBe(true)
    expect(result.report.findings.some((f) => f.severity === "fehler" && f.group === "A" && f.field === "issno")).toBe(true)
  })

  it("Jahreswechsel: Prüfdatum 31.12. kurz vor Mitternacht bleibt für alle Einträge gleich", () => {
    const result = checkXmlText("x.xml", "2.3", SEND_RAW, VALID, new Date(2026, 11, 31, 23, 59, 59))
    expect(new Set(rows(result.csv!).map((f) => `${f.day}.${f.month}.${f.year}`))).toEqual(new Set(["31.12.2026"]))
    expect(result.checkDate).toEqual({ day: "31", month: "12", year: "2026" })
  })

  it("Bericht und Zusammenfassung beruhen auf den Originaldaten (keine Ausgabedaten in result.candidates)", () => {
    const result = checkXmlText("reply.xml", "2.3", DEMO_XML_FILES[DEMO_FILES.reply1], VALID, NOW)
    expect(result.candidates.every((c) => c.fields.issno === "" && c.fields.type === "")).toBe(true)
    const { entries, freigegeben, zuUeberarbeiten, ohneAntwort } = result.summary
    expect(entries).toBe(result.candidates.length)
    expect(freigegeben + zuUeberarbeiten + ohneAntwort).toBe(entries)
    expect(errorCount(result.report)).toBe(0)
  })

  it("Ergänzung hält Formelschutz und Sortierung der CSV ein (Werte unverändert bis auf Ausgabedaten)", () => {
    const xml = SEND_RAW.replace(/<techname>[^<]*<\/techname>/, "<techname>=SUMME(A1)</techname>")
    const result = checkXmlText("x.xml", "2.3", xml, VALID, NOW)
    expect(result.csv).toContain("'=SUMME(A1)")
    const read = rows(result.csv!)
    expect(read.some((f) => f.techname === "=SUMME(A1)")).toBe(true)
    const dmcs = read.map((f) => [f.modelic, f.sdc, f.chapnum, f.section, f.subsect, f.subject, f.discode, f.discodev, f.incode, f.incodev, f.itemloc].join("-"))
    expect(dmcs).toEqual([...dmcs].sort())
  })

  it("Rundlauf: konvertierte REPLY ohne Ausgabedaten → Check-in gegen bestehende Einträge (mit Ausgabedaten) ohne Fehler", () => {
    const result = checkXmlText("reply.xml", "2.3", DEMO_XML_FILES[DEMO_FILES.reply1], VALID, NOW)
    const snapshot = result.candidates.map((c, i) => ({
      id: `e${i}`,
      status: "gesendet" as const,
      fields: { ...c.fields, issno: "002", type: "changed", day: "01", month: "01", year: "2026", answer: "", answer_comment: "" },
    }))
    const checkin = runCheckinCheck(result.csv!, { systemModelic: "PHUNGUN", snapshot })
    expect(checkin.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
  })
})
