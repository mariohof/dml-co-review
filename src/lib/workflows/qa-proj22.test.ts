import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { readDml } from "@/lib/data/dml-reader"
import { writeDml } from "@/lib/data/dml-writer"
import { datasetSchema, type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { runCheckinCheck } from "@/lib/rules/check/checkin"
import { runReplyCheck } from "@/lib/rules/check/reply"
import { errorCount } from "@/lib/rules/check/types"
import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { updateSystem } from "@/lib/rules/systems"
import { exportXml } from "./export"
import { releaseSnapshots, releaseXml } from "./release"
import { checkReplyFile, executeReplyImport } from "./reply"
import { executeSend, prepareSend } from "./send"
import { checkXmlText } from "./xml-check"

/** QA PROJ-22 (S1000D Issue 6.0) und PROJ-8 Refinement 2026-11-26 (security optional) — Lücken der bisherigen Tests */

const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0
const AT = "2026-11-26T10:00:00.000Z"
const BIKE_60 = readFileSync(join(process.cwd(), "docs/beispiele/issue-6.0/DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML"), "utf8")
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const encode = (xml: string) => new TextEncoder().encode(xml)

/** SEND der DMRL BIKE60 an C1234 und passender REPLY (alle y oder erster n) */
function bikeSendAndReply(demo: Dataset, answers: "alle-y" | "erster-n" = "alle-y") {
  const prepared = prepareSend(demo, dmrl(demo, DEMO_IDS.dmrlBike), "org-c1234", "", AT)
  const sent = executeSend(demo, DEMO_IDS.dmrlBike, user(demo, DEMO_IDS.editorAnna), prepared)
  if (!sent.ok) throw new Error(sent.message)
  const parsed = readDml(prepared.xml, "6.0")
  const replyXml = writeDml(
    {
      header: { ...parsed.header, direction: "reply", dmlc: { ...parsed.header.dmlc, sendid: "C1234", seqnum: "00001" }, dmlref: { dmlc: prepared.dmlc, issno: null }, remarks: "" },
      entries: parsed.entries.map((f, i) => ({ ...f, answer: answers === "erster-n" && i === 0 ? "n" : "y", answer_comment: answers === "erster-n" && i === 0 ? "prüfen" : "" })),
    },
    "6.0",
    { answers: true }
  )
  return { prepared, data: sent.data, replyXml }
}

describe("PROJ-22 F — Demo BIKE60", () => {
  it("Check-out und unveränderter Check-in: fehlerfrei, alle 12 unverändert", () => {
    const demo = buildDemoDataset()
    const snapshot: EntrySnapshot[] = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlBike).map(({ id, status, fields }) => ({ id, status, fields }))
    const result = runCheckinCheck(writeEntriesCsv(snapshot), { systemModelic: "S1000DBIKE", snapshot })
    expect(result.report.findings).toEqual([])
    expect(result.summary).toMatchObject({ geprueft: 12, neu: 0, geaendert: 0, unveraendert: 12 })
  })

  it("Daten aus einem Stand vor PROJ-22 (ohne B6865/BIKE60) bleiben gültig", () => {
    const demo = buildDemoDataset()
    const old: Dataset = {
      ...demo,
      organisations: demo.organisations.filter((o) => o.id !== DEMO_IDS.orgAsd),
      systems: demo.systems.filter((s) => s.id !== DEMO_IDS.sysBike),
      dmrls: demo.dmrls.filter((d) => d.id !== DEMO_IDS.dmrlBike),
      entries: demo.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlBike),
    }
    expect(datasetSchema.safeParse(old).success).toBe(true)
  })
})

describe("PROJ-22 A — Systemverwaltung", () => {
  it("Issue eines Systems ohne Workflow 4.2 → 6.0 → 4.2 änderbar; PHUNGUN (im Workflow) gesperrt", () => {
    const demo = buildDemoDataset()
    const vehicle = demo.systems.find((s) => s.id === DEMO_IDS.sysVehicle)!
    const values = { name: vehicle.name, s1000dIssue: "6.0", modelic: vehicle.modelic, description: vehicle.description }
    const to60 = updateSystem(demo, vehicle.id, values)
    if (!to60.ok) throw new Error(to60.message)
    expect(to60.data.systems.find((s) => s.id === vehicle.id)?.s1000dIssue).toBe("6.0")
    const back = updateSystem(to60.data, vehicle.id, { ...values, s1000dIssue: "4.2" })
    expect(back.ok).toBe(true)
    const phungun = demo.systems.find((s) => s.id === DEMO_IDS.sysPhungun)!
    expect(updateSystem(demo, phungun.id, { name: phungun.name, s1000dIssue: "6.0", modelic: phungun.modelic, description: phungun.description }).ok).toBe(false)
  })
})

describe.skipIf(!hasXmllint)("PROJ-22 B/C — XSD mit xmllint", () => {
  it("6.0-Datei mit Schemafehler (fehlendes techName): Schemafehler mit Zeile", async () => {
    const broken = BIKE_60.replace(/<techName>Bicycle<\/techName>/, "")
    const result = await validateWithXmllint(encode(broken), "6.0")
    expect(result).toMatchObject({ state: "schemafehler", issue: "6.0" })
    if (result.state === "schemafehler") expect(result.findings[0].line).toBeGreaterThan(0)
  })

  it("XML-Export der DMRL BIKE60: 6.0-Schema-Angabe, BREX H, XSD-gültig", async () => {
    const demo = buildDemoDataset()
    const out = exportXml(demo, dmrl(demo, DEMO_IDS.dmrlBike), AT)
    expect(out.issue).toBe("6.0")
    expect(out.content).toContain("S1000D_6/xml_schema_flat/dml.xsd")
    expect(out.content).toContain('systemDiffCode="H"')
    expect(await validateWithXmllint(encode(out.content), "6.0")).toEqual({ state: "gueltig", issue: "6.0" })
  })

  it("Freigabestand XML nach vollständiger Freigabe (6.0): XSD-gültig mit 6.0-Schema-Angabe", async () => {
    const { data, replyXml } = bikeSendAndReply(buildDemoDataset())
    const result = checkReplyFile(data, dmrl(data, DEMO_IDS.dmrlBike), replyXml)
    expect(errorCount(result.report)).toBe(0)
    const done = executeReplyImport(data, DEMO_IDS.dmrlBike, user(data, DEMO_IDS.editorAnna), {
      fileName: "reply.XML",
      text: replyXml,
      result,
      sendArchiveId: data.archive.at(-1)!.id,
    })
    if (!done.ok) throw new Error(done.message)
    expect(dmrl(done.data, DEMO_IDS.dmrlBike).status).toBe("freigegeben")
    const [snapshot] = releaseSnapshots(done.data, DEMO_IDS.dmrlBike)
    const xml = releaseXml(done.data, dmrl(done.data, DEMO_IDS.dmrlBike), snapshot, AT)
    expect(xml.content).toContain("S1000D_6/xml_schema_flat/dml.xsd")
    expect(await validateWithXmllint(encode(xml.content), "6.0")).toEqual({ state: "gueltig", issue: "6.0" })
  })

  it("PROJ-8: SEND mit Einträgen ohne security ist in 2.3 und 6.0 XSD-gültig und enthält je Eintrag kein security", async () => {
    const demo = buildDemoDataset()
    const fields = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlBike).map((e) => ({ ...e.fields, security: "" }))
    for (const issue of ["2.3", "6.0"] as const) {
      const xml = writeDml(
        {
          header: { direction: "send", dmlc: { modelic: "S1000DBIKE", sendid: "B6865", dmltype: "c", diyear: "2026", seqnum: "00001" }, issno: { issno: "001", inwork: "00", type: "new" }, issdate: { day: "26", month: "11", year: "2026" }, security: "01", dmlref: null, remarks: "" },
          entries: fields,
        },
        issue,
        { answers: false }
      )
      expect(xml.match(/<security /g), issue).toHaveLength(1) // nur der Kopf
      expect(await validateWithXmllint(encode(xml), issue), issue).toEqual({ state: "gueltig", issue })
    }
  })
})

describe("PROJ-22 E — Schema-Angabe, weitere Fälle", () => {
  it("nicht wohlgeformte Datei: kein Schema-Hinweis", () => {
    const result = checkXmlText("x.xml", "6.0", BIKE_60.replace("S1000D_6", "S1000D_5-0").slice(0, 2000), {
      state: "nicht_wohlgeformt",
      issue: "6.0",
      findings: [{ line: 1, message: "kaputt" }],
    })
    expect(result.report.findings.some((f) => f.message.includes("Schema-Angabe"))).toBe(false)
  })

  it("Datei ohne Schema-Angabe: kein Hinweis; 6.0-Datei bei 4.2: Hinweis (Lesen scheitert nicht)", () => {
    const without = BIKE_60.replace(/\s*xsi:noNamespaceSchemaLocation="[^"]*"/, "")
    expect(checkXmlText("x.xml", "6.0", without, { state: "gueltig", issue: "6.0" }).report.findings.some((f) => f.group === "XSD")).toBe(false)
    const as42 = checkXmlText("x.xml", "4.2", BIKE_60, { state: "gueltig", issue: "4.2" })
    expect(as42.report.findings.filter((f) => f.group === "XSD").map((f) => f.message)).toEqual([
      "Die Schema-Angabe der Datei verweist auf S1000D Issue 6.0, gewählt ist Issue 4.2 — bitte Issue prüfen.",
    ])
  })
})

describe("PROJ-8 Refinement — security optional, Grenzfälle", () => {
  it("security beim Check-in geleert bei einem Eintrag ohne Eintragstyp → Fehler F (Änderung braucht Eintragstyp), kein Pflichtfeldfehler", () => {
    const demo = buildDemoDataset()
    const snapshot: EntrySnapshot[] = demo.entries
      .filter((e) => e.dmrlId === DEMO_IDS.dmrlBike)
      .map(({ id, fields }) => ({ id, status: "freigegeben", fields: { ...fields, dmentryType: "", answer: "y" } }))
    const changed = structuredClone(snapshot)
    changed[0].fields.security = ""
    const result = runCheckinCheck(writeEntriesCsv(changed), { systemModelic: "S1000DBIKE", snapshot })
    const messages = result.report.findings.map((f) => `${f.group}: ${f.message}`)
    expect(messages).toEqual(["F: Geänderter Eintrag ohne Eintragstyp (n, c oder d setzen)."])
  })

  it("SEND ohne security, REPLY mit security → Fehler G", () => {
    const demo = buildDemoDataset()
    demo.entries = demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlBike ? { ...e, fields: { ...e.fields, security: "" } } : e))
    const { data, replyXml, prepared } = bikeSendAndReply(demo)
    expect(prepared.xml.match(/<security /g)).toHaveLength(1)
    const withSecurity = replyXml.replace("</dmRef>\n         <responsiblePartnerCompany", '</dmRef>\n         <security securityClassification="01"/>\n         <responsiblePartnerCompany')
    expect(withSecurity).not.toBe(replyXml)
    const result = checkReplyFile(data, dmrl(data, DEMO_IDS.dmrlBike), withSecurity)
    expect(result.report.findings.map((f) => `${f.group}: ${f.message}`)).toEqual([
      "G: Feld security wurde gegenüber dem SEND verändert (SEND ‚', REPLY ‚01').",
    ])
  })

  it("REPLY 6.0 ohne security je Eintrag (SEND hatte 01): fehlerfrei; nach Übernahme bleibt security 01", () => {
    const { data, replyXml } = bikeSendAndReply(buildDemoDataset(), "erster-n")
    const stripped = replyXml.replace(/\s*<security securityClassification="01"\/>/g, (m, offset: number) => (offset < replyXml.indexOf("<dmlContent") ? m : ""))
    expect(stripped.match(/<security /g)).toHaveLength(1)
    const context = runReplyCheck(stripped, {
      issue: "6.0",
      systemModelic: "S1000DBIKE",
      dmlType: "c",
      dmrlStatus: "gesendet",
      lastSend: { dmlc: data.archive.at(-1)!.dmlc, partnerCode: "C1234", entries: readDml(data.archive.at(-1)!.content, "6.0").entries },
      archivedReplies: [],
    })
    expect(context.report.findings).toEqual([])
    const result = checkReplyFile(data, dmrl(data, DEMO_IDS.dmrlBike), stripped)
    const done = executeReplyImport(data, DEMO_IDS.dmrlBike, user(data, DEMO_IDS.editorAnna), { fileName: "r.XML", text: stripped, result, sendArchiveId: data.archive.at(-1)!.id })
    if (!done.ok) throw new Error(done.message)
    expect(done.data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlBike).every((e) => e.fields.security === "01")).toBe(true)
  })
})
