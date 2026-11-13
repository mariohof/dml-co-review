import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { DmlParseError, readDml } from "./dml-reader"

const ROOT = join(__dirname, "..", "..", "..")
const example42 = readFileSync(join(ROOT, "docs/beispiele/issue-4.2/DML-S1000DBIKE-B6865-S-2016-00002_001-00.XML"), "utf8")
const example50 = readFileSync(join(ROOT, "docs/beispiele/issue-5.0/DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML"), "utf8")

describe("DML-Leser Issue 4.2 / 5.0", () => {
  it("liest Kopf und Einträge des 4.2-Beispiels", () => {
    const { header, entries } = readDml(example42, "4.2")
    expect(header).toMatchObject({
      direction: "send",
      dmlc: { modelic: "S1000DBIKE", sendid: "B6865", dmltype: "s", diyear: "2016", seqnum: "00002" },
      issno: { issno: "001", inwork: "00", type: "new" },
      issdate: { year: "2016", month: "12", day: "31" },
      security: "01",
    })
    expect(entries).toHaveLength(97)
    expect(entries[0]).toMatchObject({
      modelic: "BRAKE",
      sdc: "AAA",
      chapnum: "D00",
      section: "0",
      subsect: "0",
      subject: "00",
      discode: "00",
      discodev: "AA",
      incode: "00W",
      incodev: "A",
      itemloc: "D",
      techname: "Mountain bicycle",
      infoname: "Applicability cross-reference table",
      language: "en",
      country: "US",
      issno: "002",
      day: "31",
      month: "08",
      year: "2016",
      rpc: "B6865",
    })
  })

  it("liest das 5.0-Beispiel mit derselben Struktur", () => {
    const { header, entries } = readDml(example50, "5.0")
    expect(header.dmlc).toMatchObject({ modelic: "S1000DBIKE", sendid: "B6865", seqnum: "00001", diyear: "2019" })
    expect(entries).toHaveLength(95)
    expect(entries.every((e) => e.modelic !== "" && e.techname !== "")).toBe(true)
  })

  it("meldet nicht wohlgeformtes XML und falsche Struktur", () => {
    expect(() => readDml("<dml>", "4.2")).toThrow(DmlParseError)
    expect(() => readDml("<dml/>", "5.0")).toThrow(/identAndStatusSection/)
  })
})
