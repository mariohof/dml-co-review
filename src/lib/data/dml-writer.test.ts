import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "./demo-data"
import { DEMO_XML_FILES } from "./demo-xml.generated"
import { parseDml23 } from "./dml-parser-2-3"
import { readDml } from "./dml-reader"
import { escapeXml, writeDml, type DmlDocument } from "./dml-writer"
import { S1000D_ISSUES, type DmlHeader, type EntryFields } from "./schema"

const demo = buildDemoDataset()
const vehicleEntries = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle).map((e) => e.fields)

const header: DmlHeader = {
  direction: "send",
  dmlc: { modelic: "GTFDEMO", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00003" },
  issno: { issno: "001", inwork: "00", type: "new" },
  issdate: { day: "13", month: "11", year: "2026" },
  security: "01",
  dmlref: {
    dmlc: { modelic: "GTFDEMO", sendid: "C1234", dmltype: "c", diyear: "2026", seqnum: "00002" },
    issno: { issno: "001", inwork: "00", type: "" },
  },
  remarks: "Bitte prüfen & bestätigen <bis Ende November>.",
}

const special: EntryFields = {
  ...vehicleEntries[0],
  techname: 'Bremse "vorne" & hinten <links>',
  rpcname: "Müller & Söhne",
  remarks: "Erste Zeile\nZweite Zeile",
  answer: "n",
  answer_comment: "Bitte überarbeiten",
  dmentryType: "c",
}

describe("DML-Schreiber", () => {
  it("maskiert Sonderzeichen und entfernt unzulässige Steuerzeichen", () => {
    expect(escapeXml(`a&b<c>"d"'e'\u0001`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;")
  })

  it.each(S1000D_ISSUES)("Rundlauf Schreiben → Lesen (Issue %s): Kopf und Einträge unverändert", (issue) => {
    const doc: DmlDocument = { header, entries: [special, ...vehicleEntries.slice(1)] }
    const parsed = readDml(writeDml(doc, issue, { answers: true }), issue)
    expect(parsed.header.dmlc).toEqual(header.dmlc)
    expect(parsed.header.remarks).toBe(header.remarks)
    expect(parsed.header.dmlref?.dmlc).toEqual(header.dmlref?.dmlc)
    expect(parsed.header.dmlref?.issno?.issno).toBe("001")
    expect(parsed.entries).toEqual(doc.entries)
  })

  it("ohne Antworten: kein answer-Element", () => {
    const xml23 = writeDml({ header, entries: [special] }, "2.3", { answers: false })
    expect(xml23).not.toContain("<answer")
    const xml42 = writeDml({ header, entries: [special] }, "4.2", { answers: false })
    expect(xml42).not.toContain("<answer")
  })

  it("Eintrag ohne Eintragstyp hat kein Typ-Attribut", () => {
    const untyped = { ...vehicleEntries[0], dmentryType: "" }
    expect(writeDml({ header, entries: [untyped] }, "2.3", { answers: false })).toContain("<dmentry>")
    expect(writeDml({ header, entries: [untyped] }, "5.0", { answers: false })).toContain('<dmlEntry issueType="new">')
  })

  it("Ausgabedaten: 2.3 addresdm/issno + issdate; 4.2/5.0 issueInfo, @issueType, issueDate", () => {
    const entry = { ...vehicleEntries[0], issno: "002", type: "changed", day: "05", month: "10", year: "2026" }
    const xml23 = writeDml({ header, entries: [entry] }, "2.3", { answers: false })
    expect(xml23).toContain('<issno issno="002" type="changed"/>')
    expect(xml23).toContain('<issdate day="05" month="10" year="2026"/>')
    const xml42 = writeDml({ header, entries: [entry] }, "4.2", { answers: false })
    expect(xml42).toContain('<issueInfo issueNumber="002" inWork="00"/>')
    expect(xml42).toContain('issueType="changed"')
    expect(xml42).toContain('<issueDate year="2026" month="10" day="05"/>')
  })

  it("Standard-BREX: 4.2 S1000D-F-…, 5.0 S1000D-G-…; 2.3 ohne BREX", () => {
    expect(writeDml({ header, entries: vehicleEntries }, "4.2", { answers: false })).toMatch(/modelIdentCode="S1000D" systemDiffCode="F" systemCode="04"/)
    expect(writeDml({ header, entries: vehicleEntries }, "5.0", { answers: false })).toMatch(/modelIdentCode="S1000D" systemDiffCode="G"/)
    expect(writeDml({ header, entries: vehicleEntries }, "2.3", { answers: false })).not.toContain("brex")
  })

  it("bildet den Demo-SEND 00002-2026 (2.3) inhaltlich nach", () => {
    const original = parseDml23(DEMO_XML_FILES[DEMO_FILES.send2])
    // Das Original enthält keine Ausgabedaten je Eintrag; der Schreiber übernimmt, was vorhanden ist
    const reread = parseDml23(writeDml(original, "2.3", { answers: false }))
    expect(reread.header).toEqual(original.header)
    expect(reread.entries).toEqual(original.entries)
  })
})
