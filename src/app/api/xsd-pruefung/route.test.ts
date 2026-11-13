// @vitest-environment node
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { xsdResultSchema } from "@/lib/xsd/types"
import { POST } from "./route"

const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0
const ROOT = join(__dirname, "..", "..", "..", "..")
const demoReply = readFileSync(join(ROOT, "public/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"))

function request(query: string, body: BodyInit, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000/api/xsd-pruefung${query}`, {
    method: "POST",
    body,
    headers: { host: "localhost:3000", "content-type": "application/xml", ...headers },
  })
}

describe("POST /api/xsd-pruefung — Eingaben", () => {
  it("400 bei fehlendem oder unbekanntem Issue (keine Pfade aus Benutzereingaben)", async () => {
    for (const query of ["", "?issue=4.0", "?issue=../../etc"]) {
      const response = await POST(request(query, "<dml/>"))
      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain("Unbekanntes S1000D-Issue")
    }
  })

  it("400 bei leerer Datei, 413 über 5 MB", async () => {
    expect((await POST(request("?issue=2.3", ""))).status).toBe(400)
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    expect((await POST(request("?issue=2.3", big))).status).toBe(413)
  })

  it("403 bei Anfragen fremder Webseiten", async () => {
    const response = await POST(request("?issue=2.3", "<dml/>", { origin: "https://fremd.example" }))
    expect(response.status).toBe(403)
  })
})

describe.skipIf(!hasXmllint)("POST /api/xsd-pruefung — Prüfung", () => {
  it("200 mit gültigem Ergebnis für die Demo-REPLY (Vertrag erfüllt)", async () => {
    const response = await POST(request("?issue=2.3", demoReply, { origin: "http://localhost:3000" }))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(xsdResultSchema.parse(json)).toEqual({ state: "gueltig", issue: "2.3" })
  })

  it("200 mit Schemafehlern bei falschem Issue", async () => {
    const response = await POST(request("?issue=5.0", demoReply))
    expect(response.status).toBe(200)
    expect(xsdResultSchema.parse(await response.json()).state).toBe("schemafehler")
  })
})
