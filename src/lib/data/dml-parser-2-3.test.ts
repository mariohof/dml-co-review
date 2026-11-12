import { describe, expect, it } from "vitest"

import { DEMO_FILES } from "./demo-data"
import { DEMO_XML_FILES } from "./demo-xml.generated"
import { DmlParseError, parseDml23 } from "./dml-parser-2-3"

describe("DML-Leser Issue 2.3", () => {
  it("liest Kopf und Einträge von SEND 00002", () => {
    const { header, entries } = parseDml23(DEMO_XML_FILES[DEMO_FILES.send2])
    expect(header).toMatchObject({
      direction: "send",
      dmlc: { modelic: "PHUNGUN", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00002" },
      issno: { issno: "001", inwork: "00", type: "new" },
      issdate: { day: "29", month: "09", year: "2026" },
      security: "01",
    })
    expect(header.dmlref?.dmlc).toMatchObject({ sendid: "C1234", seqnum: "00001" })
    expect(entries).toHaveLength(32)
    expect(entries[0]).toMatchObject({
      dmentryType: "d",
      modelic: "PHUNGUN",
      chapnum: "A00",
      techname: "Fristenarbeiten Fähigkeitsträger1 F1, monatlich",
      language: "de",
      country: "DE",
      security: "01",
      rpc: "D7177",
    })
  })

  it("liest Antworten und Firmennamen eines REPLY", () => {
    const { header, entries } = parseDml23(DEMO_XML_FILES[DEMO_FILES.reply1])
    expect(header.direction).toBe("reply")
    expect(entries).toHaveLength(11)
    expect(entries.every((e) => e.answer === "y")).toBe(true)
    expect(entries[0].rpcname).toBe("MUSTERFIRMA DEFENCE GMBH")
  })

  it("meldet nicht wohlgeformtes XML", () => {
    expect(() => parseDml23("<dml direction=\"send\">")).toThrow(DmlParseError)
  })

  it("meldet ein falsches Wurzelelement oder eine fehlende Richtung", () => {
    expect(() => parseDml23("<abc/>")).toThrow(/Wurzelelement/)
    expect(() => parseDml23("<dml/>")).toThrow(/direction/)
  })
})
