// @vitest-environment node
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { parseXmllintOutput, validateWithXmllint } from "./xmllint"

/** Integrationstests mit dem echten xmllint (PROJ-11 Tech Design I); übersprungen, wenn es fehlt */
const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0
if (!hasXmllint) console.warn("xmllint nicht installiert — XSD-Integrationstests werden übersprungen.")

const ROOT = join(__dirname, "..", "..", "..", "..")
const file = (path: string) => new Uint8Array(readFileSync(join(ROOT, path)))
const demo = (name: string) => file(join("public/demo-dateien", name))
const text = (value: string) => new TextEncoder().encode(value)

describe("parseXmllintOutput", () => {
  it("liest Schemafehler (libxml2 2.9 und 2.13+) und übergeht Kontextzeilen", () => {
    const output = [
      "-:28: element dmtitle: Schemas validity error : Element 'dmtitle': This element is not expected.",
      "-:30: Schemas validity error : Element 'x': Missing child element(s).",
      "- fails to validate",
    ].join("\n")
    expect(parseXmllintOutput(output)).toEqual({
      wellFormednessError: false,
      findings: [
        { line: 28, message: "Element 'dmtitle': This element is not expected." },
        { line: 30, message: "Element 'x': Missing child element(s)." },
      ],
    })
  })

  it("erkennt Wohlgeformtheitsfehler", () => {
    const output = "-:987: parser error : Premature end of data in tag dml line 2\n\n^\n"
    expect(parseXmllintOutput(output)).toEqual({
      wellFormednessError: true,
      findings: [{ line: 987, message: "Premature end of data in tag dml line 2" }],
    })
  })
})

describe.skipIf(!hasXmllint)("XSD-Prüfung mit xmllint", () => {
  it("Demo-REPLY (2.3) und Testdatei 4 sind gültig", async () => {
    expect(await validateWithXmllint(demo("DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"), "2.3")).toEqual({ state: "gueltig", issue: "2.3" })
    expect(await validateWithXmllint(demo("TEST-4_Falscher-Absender.XML"), "2.3")).toEqual({ state: "gueltig", issue: "2.3" })
  })

  it("S1000DBIKE-Beispiele sind gültig gegen 4.2 bzw. 5.0 (5.0 offline mit lokaler xml.xsd)", async () => {
    expect(await validateWithXmllint(file("docs/beispiele/issue-4.2/DML-S1000DBIKE-B6865-S-2016-00002_001-00.XML"), "4.2")).toMatchObject({
      state: "gueltig",
    })
    expect(await validateWithXmllint(file("docs/beispiele/issue-5.0/DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML"), "5.0")).toMatchObject({
      state: "gueltig",
    })
  })

  it("S1000DBIKE-Beispiel 6.0 ist gültig gegen 6.0 (offline mit lokaler xml.xsd, PROJ-22)", async () => {
    expect(await validateWithXmllint(file("docs/beispiele/issue-6.0/DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML"), "6.0")).toEqual({
      state: "gueltig",
      issue: "6.0",
    })
  })

  it("5.0 und 6.0 akzeptieren sich gegenseitig — Grund für den Hinweis über die Schema-Angabe (PROJ-22 E)", async () => {
    expect(await validateWithXmllint(file("docs/beispiele/issue-5.0/DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML"), "6.0")).toMatchObject({ state: "gueltig" })
    expect(await validateWithXmllint(file("docs/beispiele/issue-6.0/DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML"), "5.0")).toMatchObject({ state: "gueltig" })
  })

  it("Testdatei 1 (Pflichtelement fehlt): Schemafehler mit Zeile und Originalmeldung", async () => {
    const result = await validateWithXmllint(demo("TEST-1_Pflichtelement-fehlt.XML"), "2.3")
    expect(result).toMatchObject({ state: "schemafehler", issue: "2.3" })
    if (result.state !== "schemafehler") throw new Error()
    expect(result.findings[0]).toMatchObject({ line: 28 })
    expect(result.findings[0].message).toMatch(/^Element 'dmtitle': This element is not expected/)
  })

  it("Testdatei 2 (falsches Issue) und eine 4.2-Datei gegen das 2.3-Schema: Schemafehler", async () => {
    expect(await validateWithXmllint(demo("TEST-2_Falsches-Issue.XML"), "2.3")).toMatchObject({ state: "schemafehler" })
    const bike42 = file("docs/beispiele/issue-4.2/DML-S1000DBIKE-B6865-S-2016-00002_001-00.XML")
    expect(await validateWithXmllint(bike42, "2.3")).toMatchObject({ state: "schemafehler" })
  })

  it("Testdatei 3 und leere Eingabe: nicht wohlgeformt mit Zeile", async () => {
    const result = await validateWithXmllint(demo("TEST-3_Kein-gueltiges-XML.XML"), "2.3")
    expect(result).toMatchObject({ state: "nicht_wohlgeformt", findings: [{ line: 987 }] })
    expect(await validateWithXmllint(text("<a>\n<b></a>"), "2.3")).toMatchObject({ state: "nicht_wohlgeformt" })
  })

  it("lädt keine externen Entities (keine Ersetzung, kein Netz)", async () => {
    const xxe = '<?xml version="1.0"?>\n<!DOCTYPE dml [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<dml>&x;</dml>'
    const result = await validateWithXmllint(text(xxe), "2.3")
    expect(result.state).toBe("schemafehler")
    expect(JSON.stringify(result)).not.toContain("root:")
  })

  it("nicht verfügbar: Programm fehlt, Schema fehlt, Zeitlimit", async () => {
    const xml = demo("TEST-4_Falscher-Absender.XML")
    expect(await validateWithXmllint(xml, "2.3", { xmllintPath: "/gibt/es/nicht/xmllint" })).toEqual({
      state: "nicht_verfuegbar",
      reason: "programm_fehlt",
    })
    expect(await validateWithXmllint(xml, "2.3", { schemaRoot: join(ROOT, "gibt-es-nicht") })).toEqual({
      state: "nicht_verfuegbar",
      reason: "schema_fehlt",
    })
    expect(await validateWithXmllint(xml, "2.3", { timeoutMs: 1 })).toEqual({ state: "nicht_verfuegbar", reason: "zeitlimit" })
  })
})
