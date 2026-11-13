import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** PROJ-14 im echten Browser: Freigabe durch REPLY (nur „y"), Freigabestand anzeigen, Export CSV/XML mit echter XSD-Prüfung */

const DEMO_REPLY = join(__dirname, "..", "public", "demo-dateien", "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")

test("Freigabe, Freigabestand anzeigen und exportieren", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await page.goto("/dmrl/dmrl-phungun")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "REPLY importieren" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("XML-Datei für den REPLY-Import").setInputFiles({
    name: "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML",
    mimeType: "application/xml",
    buffer: Buffer.from(readFileSync(DEMO_REPLY, "utf8").replace(/answer="n"/g, 'answer="y"')),
  })
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(page.getByText(/Freigegeben am .* durch REPLY C1234 00002-2026 — übernommen von Anna Bearbeitung/)).toBeVisible()

  await page.getByRole("link", { name: "Freigabestand anzeigen" }).click()
  await expect(page).toHaveURL(/\/dmrl\/dmrl-phungun\/freigabestand\//)
  await expect(page.getByText(/^Freigabestand vom .* \(REPLY C1234 00002-2026\)$/)).toBeVisible()

  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const base = `DML-PHUNGUN-D0815-C-Freigabe-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const csvDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: "Als CSV exportieren" }).click()
  expect((await csvDownload).suggestedFilename()).toBe(`${base}.csv`)

  const xmlDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: "Als XML exportieren" }).click()
  const xml = await xmlDownload
  expect(xml.suggestedFilename()).toBe(`${base}.XML`)
  const content = readFileSync((await xml.path())!, "utf8")
  expect(content).toContain('<issno issno="000" inwork="01" type="new"/>')
  expect(content).not.toContain("<answer")

  // Export ändert nichts: keine Sperre, Status freigegeben, kein neuer Archivstand
  const data = await readDataset(page)
  const dmrl = data.dmrls.find((d: { id: string }) => d.id === "dmrl-phungun")
  expect(dmrl.lock).toBeNull()
  expect(dmrl.status).toBe("freigegeben")
  expect(data.archive).toHaveLength(4)
})
