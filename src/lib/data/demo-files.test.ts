import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { DEMO_FILES } from "./demo-data"
import { DEMO_XML_FILES } from "./demo-xml.generated"
import { parseDml23 } from "./dml-parser-2-3"

/**
 * Prüft die Demo-Dateien in public/demo-dateien/ (PROJ-1, Abschnitt E).
 * XSD-Prüfungen werden übersprungen, wenn xmllint auf dem Rechner nicht installiert ist.
 */

const ROOT = join(__dirname, "..", "..", "..")
const DIR = join(ROOT, "public", "demo-dateien")
const SCHEMA_23 = join(ROOT, "schemas", "s1000d", "issue-2.3", "dml.xsd")
const REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"

const xmllintAvailable = (() => {
  try {
    execFileSync("xmllint", ["--version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
})()

/** "valid" | "invalid" (Schemafehler) | "malformed" (kein wohlgeformtes XML) */
function xsdResult(file: string): "valid" | "invalid" | "malformed" {
  try {
    execFileSync("xmllint", ["--noout", "--nonet", "--schema", SCHEMA_23, join(DIR, file)], { stdio: "pipe" })
    return "valid"
  } catch (error) {
    const stderr = String((error as { stderr?: Buffer }).stderr ?? "")
    return stderr.includes("parser error") ? "malformed" : "invalid"
  }
}

const read = (file: string) => readFileSync(join(DIR, file), "utf8")

describe.skipIf(!xmllintAvailable)("Demo-Dateien: XSD-Prüfung mit xmllint (Issue 2.3)", () => {
  it.each([
    [REPLY, "valid"],
    ["TEST-1_Pflichtelement-fehlt.XML", "invalid"],
    ["TEST-2_Falsches-Issue.XML", "invalid"],
    ["TEST-3_Kein-gueltiges-XML.XML", "malformed"],
    ["TEST-4_Falscher-Absender.XML", "valid"],
  ])("%s → %s", (file, expected) => {
    expect(xsdResult(file)).toBe(expected)
  })
})

describe("Demo-REPLY auf SEND 00002-2026", () => {
  const send = parseDml23(DEMO_XML_FILES[DEMO_FILES.send2])
  const reply = parseDml23(read(REPLY))

  it("kommt von C1234 und verweist auf SEND D0815 00002-2026", () => {
    expect(reply.header.direction).toBe("reply")
    expect(reply.header.dmlc).toMatchObject({ modelic: "PHUNGUN", sendid: "C1234", seqnum: "00002", diyear: "2026" })
    expect(reply.header.dmlref?.dmlc).toEqual(send.header.dmlc)
    expect(reply.header.dmlref?.issno?.issno).toBe("001")
    expect(reply.header.remarks).toBe("Bitte abgelehnte Einträge überarbeiten.")
  })

  it("enthält 30 Genehmigungen und 2 Ablehnungen mit Begründung", () => {
    expect(reply.entries.filter((e) => e.answer === "y")).toHaveLength(30)
    const rejected = reply.entries.filter((e) => e.answer === "n")
    expect(rejected.map((e) => e.answer_comment)).toEqual([
      "Tech Name entspricht nicht der SNS – bitte prüfen",
      "Infocode nicht im beauftragten Leistungsumfang",
    ])
    expect(rejected.every((e) => e.dmentryType === "n")).toBe(true)
  })

  it("ändert gegenüber dem SEND nur Antworten und Antwort-Kommentare", () => {
    const ANSWER_FIELDS = new Set(["answer", "answer_comment", "remarks"])
    const strip = (fields: Record<string, string>) =>
      Object.fromEntries(Object.entries(fields).filter(([name]) => !ANSWER_FIELDS.has(name)))
    expect(reply.entries.map(strip)).toEqual(send.entries.map(strip))
  })

  it("Testdatei 4 unterscheidet sich nur im Absender", () => {
    const wrong = parseDml23(read("TEST-4_Falscher-Absender.XML"))
    expect(wrong.header.dmlc.sendid).toBe("C9999")
    expect(wrong.entries).toEqual(reply.entries)
  })
})
