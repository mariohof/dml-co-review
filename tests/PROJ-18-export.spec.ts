import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs, switchUser } from "./helpers"

/** PROJ-18 DMRL-Export im echten Browser — XML mit echter XSD-Prüfung */

const year = new Date().getFullYear()

async function exportAs(page: Page, format: "CSV" | "XML") {
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Exportieren" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("menuitem", { name: `Als ${format} exportieren` }).click()
  const download = await downloadPromise
  return { fileName: download.suggestedFilename(), content: readFileSync((await download.path())!, "utf8") }
}

test("Export jederzeit: PHUNGUN gesendet (CSV + XML), Fahrzeug bei fremder Sperre (XML, nie gesendet)", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await page.goto("/dmrl/dmrl-phungun")
  const before = await readDataset(page)

  const csv = await exportAs(page, "CSV")
  expect(csv.fileName).toMatch(/^DML-PHUNGUN-D0815-C-Export-\d{4}-\d\d-\d\d\.csv$/)
  const xml = await exportAs(page, "XML")
  expect(xml.fileName).toBe("DML-PHUNGUN-D0815-C-2026-00002_000-01.XML")
  expect(xml.content).toContain('<issno issno="000" inwork="01" type="new"/>')
  expect(xml.content).toContain("kein offizieller Austauschstand")
  expect(xml.content).not.toContain("<answer")
  // keine Wirkung auf den Datenbestand
  expect(await readDataset(page)).toEqual(before)

  // Fahrzeug: Ben checkt aus, Administrator exportiert trotzdem
  await switchUser(page, "Ben Bearbeiter")
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const checkoutDownload = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  await checkoutDownload
  await switchUser(page, "Administrator")
  await page.goto("/dmrl/dmrl-gtfdemo")
  const vehicle = await exportAs(page, "XML")
  expect(vehicle.fileName).toBe(`DML-GTFDEMO-D0815-C-${year}-00001_000-01.XML`)
  expect(vehicle.content).toContain('listDirection="send"')
})
