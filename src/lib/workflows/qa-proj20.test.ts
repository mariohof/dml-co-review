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
import { checkXmlText, runXmlCheck } from "./xml-check"

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

  it("Rundlauf mit Antworten: Check-in meldet keine Fehler, aber abweichende Partnerantworten zur Übernahme", () => {
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

  it("Pflichtfeld-Fehler betreffen bei REPLY ohne Ausgabedaten genau die Ausgabedaten", () => {
    const result = checkXmlText("reply.xml", "2.3", DEMO_XML_FILES[DEMO_FILES.reply1], VALID)
    const fields = new Set(result.report.findings.map((f) => f.field))
    expect([...fields].sort()).toEqual(["day", "issno", "month", "type", "year"])
    expect(emptyEntryFields().issno).toBe("")
  })
})
