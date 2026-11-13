import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

import { startAs } from "./helpers"

/** PROJ-15 Archiv im echten Browser (Demo PHUNGUN) */

const DEMO_SRC = join(__dirname, "..", "src", "data", "demo")

test("Archiv PHUNGUN: Austausch, byte-genauer Download, Anzeige REPLY, Verlauf", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await page.goto("/dmrl/dmrl-phungun")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Archiv" }).click()
  await expect(page).toHaveURL(/\/dmrl\/dmrl-phungun\/archiv/)
  await expect(page.getByLabel("Austauschkette")).toHaveText("SEND 00002-2026 → REPLY C1234 00001-2026 → SEND 00001-2026")

  // Download byte-genau (CRLF der Beispieldatei bleibt erhalten)
  const name = "DML-PHUNGUN-D0815-C-2026-00001_001-00.XML"
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: `${name} herunterladen` }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(name)
  expect(readFileSync((await download.path())!).equals(readFileSync(join(DEMO_SRC, name)))).toBe(true)

  // REPLY anzeigen
  await page.getByRole("link", { name: "REPLY 00001-2026 anzeigen" }).click()
  await expect(page.getByRole("heading", { name: /REPLY C1234 00001-2026/ })).toBeVisible()
  await expect(page.getByRole("columnheader", { name: "Antwort" })).toBeVisible()
  await page.getByRole("link", { name: "Zurück zum Archiv" }).click()

  // Verlauf (Registerkarte in der Adresse)
  await page.getByRole("tab", { name: "Verlauf" }).click()
  await expect(page).toHaveURL(/ansicht=verlauf/)
  await expect(page.getByRole("table", { name: "Verlauf" }).getByRole("row")).toHaveCount(4)
})

test("Archiv ohne Berechtigung: „Keine Berechtigung\"", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await page.goto("/dmrl/dmrl-thsdemo/archiv")
  await expect(page.getByText("Keine Berechtigung", { exact: true })).toBeVisible()
})
