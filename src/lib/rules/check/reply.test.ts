import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import { parseDml23 } from "@/lib/data/dml-parser-2-3"
import { runReplyCheck, type ReplyContext } from "./reply"
import { errorCount } from "./types"

const ROOT = join(__dirname, "..", "..", "..", "..")
const demoFile = (name: string) => readFileSync(join(ROOT, "public/demo-dateien", name), "utf8")
const demoReply = demoFile("DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")

const demo = buildDemoDataset()
const send2 = parseDml23(DEMO_XML_FILES[DEMO_FILES.send2])

/** Prüfkontext der Demo-DMRL PHUNGUN (wartet auf REPLY zu SEND 00002-2026) */
const context: ReplyContext = {
  issue: "2.3",
  systemModelic: "PHUNGUN",
  dmlType: "c",
  dmrlStatus: "gesendet",
  lastSend: { dmlc: send2.header.dmlc, partnerCode: "C1234", entries: send2.entries },
  archivedReplies: demo.archive.filter((a) => a.direction === "reply" && a.dmrlId === DEMO_IDS.dmrlPhungun).map((a) => a.dmlc),
}

const messages = (xml: string, ctx: ReplyContext = context) => runReplyCheck(xml, ctx).report.findings.map((f) => `${f.group}: ${f.message}`)

describe("REPLY-Prüfung", () => {
  it("Demo-REPLY auf SEND 00002-2026 ist fehlerfrei: 30 freigegeben, 2 zu überarbeiten", () => {
    const result = runReplyCheck(demoReply, context)
    expect(result.report.findings).toEqual([])
    expect(result.summary).toEqual({ geprueft: 32, freigegeben: 30, zuUeberarbeiten: 2 })
  })

  it("Beispieldatei 02 (REPLY auf SEND 00001) wird im Demo-Stand abgelehnt", () => {
    const m = messages(DEMO_XML_FILES[DEMO_FILES.reply1])
    expect(m).toContain("G: REPLY bezieht sich nicht auf den letzten SEND 00002-2026.")
    expect(m).toContain("G: REPLY wurde bereits importiert.")
  })

  it("Testdatei 4: falscher Absender", () => {
    expect(messages(demoFile("TEST-4_Falscher-Absender.XML"))).toContain("G: REPLY stammt nicht vom Partner C1234 (Absender ‚C9999').")
  })

  it("lehnt eine Datei mit Richtung send ab", () => {
    expect(messages(demoReply.replace('direction="reply"', 'direction="send"'))).toContain(
      "G: Die Datei ist keine Antwort (Richtung ‚send' statt ‚reply')."
    )
  })

  it("lehnt ab, wenn die DMRL nicht auf eine Antwort wartet", () => {
    expect(messages(demoReply, { ...context, dmrlStatus: "in_bearbeitung" })).toContain("G: Für diese DMRL wird keine Antwort erwartet.")
  })

  it("meldet fehlende und zusätzliche DMCs sowie veränderte Felder", () => {
    const changed = demoReply
      .replace("<chapnum>A00</chapnum>", "<chapnum>Z99</chapnum>")
      .replace("Fristenarbeiten Gerätesatz F1", "Anderer Name")
    const m = messages(changed)
    expect(m).toContain("G: DMC war nicht im SEND enthalten.")
    expect(m).toContain("G: DMC aus dem SEND fehlt im REPLY.")
    expect(m.some((x) => x.startsWith("G: Feld techname wurde gegenüber dem SEND verändert"))).toBe(true)
  })

  it("Gruppe H: Antwort fehlt, Antwort ohne Eintragstyp, Begründung fehlt", () => {
    const withoutAnswer = demoReply.replace(/<answer answer="y">\s*<remarks><\/remarks>\s*<\/answer>/, "")
    expect(messages(withoutAnswer)).toContain("H: Antwort fehlt.")
    const noComment = demoReply.replace("Infocode nicht im beauftragten Leistungsumfang", "")
    expect(messages(noComment)).toContain("H: Begründung fehlt.")
    const untyped = demoReply.replace('<dmentry type="d">', "<dmentry>")
    expect(messages(untyped)).toContain("H: Antwort nur bei Eintragstyp n/c/d zulässig.")
  })

  it("erlaubt fehlende Ausgabedaten im REPLY und die Gesamtbemerkung des Partners", () => {
    const result = runReplyCheck(demoReply, context)
    expect(result.parsed?.header.remarks).toBe("Bitte abgelehnte Einträge überarbeiten.")
    expect(result.candidates.every((c) => c.fields.issno === "")).toBe(true)
    expect(errorCount(result.report)).toBe(0)
  })

  it("meldet nicht lesbare Dateien", () => {
    expect(messages(demoFile("TEST-3_Kein-gueltiges-XML.XML"))).toEqual(["G: XML ist nicht wohlgeformt"])
  })
})
