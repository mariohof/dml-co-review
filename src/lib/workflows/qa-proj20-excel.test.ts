import { strFromU8, unzipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { ENTRY_FILE_COLUMNS, INFO_FIELD_NAMES, type Dataset, type Dmrl, type S1000dIssue, type User } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { NO_INFO_FIELDS_HINT } from "@/lib/rules/check/csv-reader"
import { errorCount } from "@/lib/rules/check/types"
import type { XsdResult } from "@/lib/xsd/types"
import { checkCheckinFile, executeCheckIn } from "./check-in"
import { executeCheckOut } from "./check-out"
import { exportXml } from "./export"
import { checkXmlText, XLSX_HAS_ERRORS, XLSX_INFO_FIELDS_EMPTY, xmlXlsxFileName } from "./xml-check"
import { readToolXlsx, toolXlsxHeader, toolXlsxInput, toolXlsxRows } from "./xml-check-xlsx.testutil"

/** PROJ-20 QA Refinement 2026-11-26 (3) — Excel mit 37 Spalten statt CSV */

const AT = "2026-11-26T15:00:00.000Z"
const valid = (issue: S1000dIssue): XsdResult => ({ state: "gueltig", issue })
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const vehicle = (data: Dataset) => data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)
const sheetXml = (xlsx: Uint8Array) => strFromU8(unzipSync(xlsx)["xl/worksheets/sheet1.xml"])

function checkedOut(base: Dataset): Dataset {
  const r = executeCheckOut(base, DEMO_IDS.dmrlVehicle, user(base, DEMO_IDS.editorBen), AT)
  if (!r.ok) throw new Error(r.message)
  return r.data
}
/** GTFDEMO (Issue 4.2) als XML exportieren und im Werkzeug konvertieren — wie ein Altbestand aus einer fremden XML */
function toolXlsxOfVehicle(data: Dataset) {
  const xml = exportXml(data, dmrl(data, DEMO_IDS.dmrlVehicle), AT).content
  return checkXmlText("gtfdemo.XML", "4.2", xml, valid("4.2"))
}

describe("PROJ-20 QA Refinement 3: Aufbau der Excel-Datei", () => {
  it("genau ein Blatt „Einträge“, Kopfzeile fett und fixiert, Autofilter, alle Spalten als Text, keine Formeln", () => {
    const result = checkXmlText("send.XML", "2.3", DEMO_XML_FILES[DEMO_FILES.send2], valid("2.3"))
    const files = unzipSync(result.xlsx!)
    expect(Object.keys(files).filter((n) => n.startsWith("xl/worksheets/"))).toEqual(["xl/worksheets/sheet1.xml"])
    expect(strFromU8(files["xl/workbook.xml"])).toContain('<sheet name="Einträge"')
    const sheet = sheetXml(result.xlsx!)
    expect(sheet).toContain('state="frozen"')
    expect(sheet).toMatch(/<autoFilter ref="A1:AK\d+"\/>/)
    // Kopfzeile mit fetter Textvorlage (2), Inhalt mit Textvorlage (1), alle 37 Spalten mit Textformat
    expect(sheet).toMatch(/<row r="1"><c r="A1" s="2"/)
    expect(sheet.match(/<col [^>]*style="1"/g)).toHaveLength(37)
    expect(sheet).not.toMatch(/<f[\s>]/)
    expect(toolXlsxHeader(result.xlsx!)).toEqual([...ENTRY_FILE_COLUMNS])
  })

  it.each([
    ["2.3", DEMO_XML_FILES[DEMO_FILES.send2]],
    ["4.2", exportXml(buildDemoDataset(), dmrl(buildDemoDataset(), DEMO_IDS.dmrlVehicle), AT).content],
  ] as const)("Issue %s: `dmc` je Zeile wie in der Anwendung, Informationsfelder und answer_timestamp leer, sortiert nach DMC", (issue, xml) => {
    const result = checkXmlText("x.XML", issue, xml, valid(issue))
    const rows = toolXlsxRows(result.xlsx!).slice(1)
    const read = readToolXlsx(result.xlsx!).candidates
    expect(rows).toHaveLength(result.candidates.length)
    const dmcCol = ENTRY_FILE_COLUMNS.indexOf("dmc")
    rows.forEach((row, i) => expect(row.cells[dmcCol]).toBe(formatDmc(read[i].fields)))
    expect(read.every((c) => [...INFO_FIELD_NAMES, "answer_timestamp" as const].every((n) => c.fields[n] === ""))).toBe(true)
    const dmcs = rows.map((row) => row.cells[dmcCol])
    expect(dmcs).toEqual([...dmcs].sort())
  })

  it("führende Nullen (security 01, issno 001, day 05) bleiben als Text erhalten", () => {
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<\/dmtitle>/, '</dmtitle><issno issno="001" type="new"></issno><issdate day="05" month="03" year="2027"></issdate>')
    const result = checkXmlText("x.XML", "2.3", xml, valid("2.3"))
    const sheet = sheetXml(result.xlsx!)
    expect(sheet).toMatch(/<t xml:space="preserve">001<\/t>/)
    expect(sheet).toMatch(/<t xml:space="preserve">05<\/t>/)
    const first = readToolXlsx(result.xlsx!).candidates.find((c) => c.fields.day === "05")!
    expect(first.fields).toMatchObject({ issno: "001", month: "03" })
    expect(result.candidates.every((c) => c.fields.security === "" || /^\d{2}$/.test(c.fields.security))).toBe(true)
  })

  it("Dateiname: XML-Name mit .xlsx; Hinweistexte wie in der Spezifikation", () => {
    expect(xmlXlsxFileName("DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")).toBe("DML-PHUNGUN-C1234-C-2026-00002_001-00.xlsx")
    expect(xmlXlsxFileName("ohne-endung")).toBe("ohne-endung.xlsx")
    expect(XLSX_INFO_FIELDS_EMPTY).toBe("Die Informationsfelder (orig bis io-pm) sind leer — beim Check-in werden gespeicherte Werte der DMRL dadurch geleert.")
    expect(XLSX_HAS_ERRORS).toBe("Die Excel-Datei enthält Fehler aus der Prüfung — ein Check-in wird abgewiesen, bis sie behoben sind.")
  })

  it("Sonderzeichen (< > & \" Umlaute) überstehen den Rundlauf Werkzeug → Check-in-Leser unverändert", () => {
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<techname>[^<]*<\/techname>/, "<techname>A&lt;b&gt;&amp;&quot;c&quot; Größe</techname>")
    const result = checkXmlText("x.XML", "2.3", xml, valid("2.3"))
    expect(result.candidates.some((c) => c.fields.techname === 'A<b>&"c" Größe')).toBe(true)
    expect(readToolXlsx(result.xlsx!).candidates.some((c) => c.fields.techname === 'A<b>&"c" Größe')).toBe(true)
  })

  // BUG-QA14-2 (Low, vorbestehend PROJ-9/10): Schreiber maskiert „_xHHHH_“ als „_x005F_xHHHH_“, der Leser hebt das nicht auf
  it("dokumentiert BUG-QA14-2: Text „_x0041_“ kommt nach Werkzeug → Check-in-Leser als „_x005F_x0041_“ an", () => {
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<techname>[^<]*<\/techname>/, "<techname>Teil_x0041_</techname>")
    const result = checkXmlText("x.XML", "2.3", xml, valid("2.3"))
    expect(result.candidates.some((c) => c.fields.techname === "Teil_x0041_")).toBe(true)
    const read = readToolXlsx(result.xlsx!).candidates.map((c) => c.fields.techname)
    expect(read).toContain("Teil_x005F_x0041_")
    expect(read).not.toContain("Teil_x0041_")
  })
})

describe("PROJ-20 QA Refinement 3: Rundlauf Werkzeug-Excel → Check-in", () => {
  it("DMRL mit gespeicherten Informationsfeldern: Check-in leert sie und meldet die Anzahl (gewollt)", () => {
    const demo = buildDemoDataset()
    const stored: Dataset = {
      ...demo,
      entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, fields: { ...e.fields, orig: "D0815", "io-pm": "IO-1" } } : e)),
    }
    const data = checkedOut(stored)
    const tool = toolXlsxOfVehicle(stored)
    expect(errorCount(tool.report)).toBe(0)
    const checked = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), toolXlsxInput(tool.xlsx!))
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.summary.informationsfelder).toBe(vehicle(data).length)
    expect(checked.report.findings.map((f) => f.message)).not.toContain(NO_INFO_FIELDS_HINT)
    const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), checked, AT, false)
    if (!result.ok) throw new Error(result.message)
    expect(vehicle(result.data).every((e) => e.fields.orig === "" && e.fields["io-pm"] === "")).toBe(true)
    expect(dmrl(result.data, DEMO_IDS.dmrlVehicle).lock).toBeFalsy()
  })

  it("DMRL ohne gespeicherte Informationsfelder: keine Informationsfeld-Änderung, Check-in ohne Fehler", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo)
    const tool = toolXlsxOfVehicle(demo)
    const checked = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), toolXlsxInput(tool.xlsx!))
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.summary.informationsfelder).toBe(0)
  })

  it("Werkzeug-Excel mit Regelfehler (doppelter DMC) wird beim Check-in abgewiesen", () => {
    const demo = buildDemoDataset()
    const data = checkedOut(demo)
    const xml = exportXml(demo, dmrl(demo, DEMO_IDS.dmrlVehicle), AT).content.replace(/(<dmlEntry\b[\s\S]*?<\/dmlEntry>)/, "$1$1")
    const tool = checkXmlText("dup.XML", "4.2", xml, valid("4.2"))
    expect(tool.report.findings.some((f) => f.group === "C")).toBe(true)
    expect(tool.xlsx).not.toBeNull()
    const checked = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), toolXlsxInput(tool.xlsx!))
    expect(checked.report.findings.some((f) => f.severity === "fehler" && f.group === "C")).toBe(true)
  })
})

describe("PROJ-20 QA Refinement 3: Grenzfälle", () => {
  it("DML ohne Einträge (Schemafehler): Excel-Datei nur mit Kopfzeile", () => {
    const empty = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<dmentry[\s\S]*<\/dmentry>/, "")
    const result = checkXmlText("leer.xml", "2.3", empty, { state: "schemafehler", issue: "2.3", findings: [{ line: 5, message: "Missing child element(s)." }] })
    expect(toolXlsxRows(result.xlsx!)).toHaveLength(1)
    expect(toolXlsxHeader(result.xlsx!)).toHaveLength(37)
  })

  // BUG-QA14-1 (Low): Excel erlaubt höchstens 32 767 Zeichen je Zelle — das Werkzeug schreibt längere Werte ungekürzt
  it("dokumentiert BUG-QA14-1: Wert über 32 767 Zeichen landet ungekürzt in einer Zelle, ohne Befund im Prüfbericht", () => {
    const xml = DEMO_XML_FILES[DEMO_FILES.send2].replace(/<techname>[^<]*<\/techname>/, `<techname>${"A".repeat(40_000)}</techname>`)
    const result = checkXmlText("lang.xml", "2.3", xml, valid("2.3"))
    expect(result.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
    const longest = Math.max(...[...sheetXml(result.xlsx!).matchAll(/<t xml:space="preserve">([^<]*)<\/t>/g)].map((m) => m[1].length))
    expect(longest).toBeGreaterThan(32_767)
  })
})
