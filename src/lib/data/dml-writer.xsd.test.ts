import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { buildDemoDataset, DEMO_IDS } from "./demo-data"
import { writeDml } from "./dml-writer"
import { S1000D_ISSUES, type DmlHeader } from "./schema"

/** Integration: erzeugte DML-Dateien sind gegen dml.xsd 2.3 / 4.2 / 5.0 gültig (PROJ-12 Tech Design G) */
const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0

const demo = buildDemoDataset()
const entries = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun).map((e) => e.fields)
const variants = [
  { ...entries[0], dmentryType: "", answer: "y", answer_comment: "", rpcname: "Firma & Co", remarks: "Zeile 1\nZeile 2" },
  { ...entries[1], dmentryType: "n", answer: "n", answer_comment: "Bitte <prüfen>", issno: "002", type: "changed" },
  { ...entries[2], issno: "", type: "", day: "", month: "", year: "", infoname: "" },
  ...entries.slice(3),
]

const header = (dmlref: boolean, remarks: string): DmlHeader => ({
  direction: "send",
  dmlc: { modelic: "PHUNGUN", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00003" },
  issno: { issno: "001", inwork: "00", type: "new" },
  issdate: { day: "13", month: "11", year: "2026" },
  security: "01",
  dmlref: dmlref
    ? { dmlc: { modelic: "PHUNGUN", sendid: "C1234", dmltype: "c", diyear: "2026", seqnum: "00002" }, issno: { issno: "001", inwork: "00", type: "" } }
    : null,
  remarks,
})

describe.skipIf(!hasXmllint)("DML-Schreiber gegen XSD", () => {
  it.each(S1000D_ISSUES)("Issue %s: SEND (ohne Antworten) und Export (mit Antworten) sind schemagültig", async (issue) => {
    for (const [answers, ref, remarks] of [
      [false, true, "Bemerkung & Hinweis"],
      [true, true, ""],
      [false, false, ""],
    ] as const) {
      const xml = writeDml({ header: header(ref, remarks), entries: variants }, issue, { answers })
      const result = await validateWithXmllint(new TextEncoder().encode(xml), issue)
      expect(result, `${issue} answers=${answers} ref=${ref}`).toEqual({ state: "gueltig", issue })
    }
  })
})
