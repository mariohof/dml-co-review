import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** PROJ-13 REPLY-Import im echten Browser — mit echter XSD-Prüfung (xmllint über die Serverfunktion) */

const DEMO = join(__dirname, "..", "public", "demo-dateien")
const DEMO_REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"

async function upload(page: Page, file: string | { name: string; buffer: Buffer }) {
  await page.goto("/dmrl/dmrl-phungun")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "REPLY", exact: true }).click()
  const dialog = page.getByRole("dialog")
  const input = dialog.getByLabel("XML-Datei für den REPLY-Import")
  if (typeof file === "string") await input.setInputFiles(join(DEMO, file))
  else await input.setInputFiles({ name: file.name, mimeType: "application/xml", buffer: file.buffer })
  return dialog
}

test.describe("REPLY-Import (PROJ-13)", () => {
  test("Demo-REPLY: XSD + Regelwerk bestanden, 30/2 übernommen, byte-genau archiviert", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    const dialog = await upload(page, DEMO_REPLY)
    await expect(dialog.getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeVisible()
    await expect(dialog.getByLabel("REPLY")).toContainText("REPLY C1234 00002-2026 auf SEND 00002-2026")
    await expect(dialog.getByText("Abgelehnte Einträge (2)")).toBeVisible()
    await dialog.getByRole("button", { name: "Übernehmen" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText("Bitte abgelehnte Einträge überarbeiten.")).toBeVisible()

    const data = await readDataset(page)
    const reply = data.archive.at(-1)
    expect(reply.direction).toBe("reply")
    expect(reply.content).toBe(readFileSync(join(DEMO, DEMO_REPLY), "utf8"))
    expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-phungun").status).toBe("in_bearbeitung")

    // answer_timestamp (Refinement 2026-11-21): alle 32 geprüften Einträge, Format JJJJ-MM-TTThh:mm:ss, Anzeige TT.MM.JJJJ hh:mm
    const stamps = data.entries
      .filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-phungun")
      .map((e: { fields: { answer_timestamp: string } }) => e.fields.answer_timestamp)
    expect(stamps).toHaveLength(32)
    expect(new Set(stamps).size).toBe(1)
    expect(stamps[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    const [, y, m, d, hh, mm] = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(stamps[0])!
    await expect(page.getByRole("columnheader", { name: "Antwort übernommen" })).toBeVisible()
    await expect(page.getByRole("cell", { name: `${d}.${m}.${y} ${hh}:${mm}` }).first()).toBeVisible()
  })

  test("alle genehmigt → DMRL freigegeben", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    const buffer = Buffer.from(readFileSync(join(DEMO, DEMO_REPLY), "utf8").replace(/answer="n"/g, 'answer="y"'))
    const dialog = await upload(page, { name: DEMO_REPLY, buffer })
    await expect(dialog.getByText("Alle Einträge sind freigegeben.")).toBeVisible()
    await dialog.getByRole("button", { name: "Übernehmen" }).click()
    await expect(page.getByText(/Freigegeben am/)).toBeVisible()
    await expect(page.getByText("Nicht freigegeben")).toBeHidden()
  })

  test("Testdateien 1–4: XSD-Fehler (1, 2), kein gültiges XML (3), Regelwerk (4)", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    for (const [file, expected] of [
      ["TEST-1_Pflichtelement-fehlt.XML", /Die Datei entspricht nicht dem Schema S1000D Issue 2\.3 \(dml\.xsd\)/],
      ["TEST-2_Falsches-Issue.XML", /Die Datei entspricht nicht dem Schema S1000D Issue 2\.3 \(dml\.xsd\)/],
      ["TEST-3_Kein-gueltiges-XML.XML", /Die Datei ist kein gültiges XML/],
      ["TEST-4_Falscher-Absender.XML", /REPLY stammt nicht vom Empfänger C1234/],
    ] as const) {
      const dialog = await upload(page, file)
      await expect(dialog.getByText(expected).first()).toBeVisible()
      await expect(dialog.getByRole("button", { name: "Übernehmen" })).toHaveCount(0)
      await dialog.getByRole("button", { name: "Schließen" }).click()
    }
    const data = await readDataset(page)
    expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-phungun").status).toBe("gesendet")
    expect(data.history.filter((h: { action: string }) => h.action === "reply_abgelehnt")).toHaveLength(4)
  })
})
