import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** PROJ-22: S1000D Issue 6.0 im echten Browser — echte XSD-Prüfung (xmllint über die Serverfunktion) */

const year = new Date().getFullYear()
const BEISPIELE = join(__dirname, "..", "docs", "beispiele")
const BIKE_60 = join(BEISPIELE, "issue-6.0", "DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML")
const BIKE_50 = join(BEISPIELE, "issue-5.0", "DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML")

async function checkInTool(page: Page, path: string, issue: string) {
  await page.goto("/xml-pruefung")
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: `Issue ${issue}` }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name: path.split("/").pop()!, mimeType: "application/xml", buffer: readFileSync(path) })
  await page.getByRole("button", { name: "Prüfen" }).click()
}

test("Systemformular bietet Issue 6.0; Demo-System „Fahrrad BIKE60“ mit Issue 6.0", async ({ page }) => {
  await startAs(page, "Administrator")
  await page.goto("/verwaltung/systeme")
  await expect(page.getByRole("row").filter({ hasText: "Fahrrad BIKE60" })).toContainText("6.0")
  await page.getByRole("button", { name: "System anlegen" }).click()
  await page.getByRole("dialog").getByRole("combobox", { name: "S1000D-Issue" }).click()
  await expect(page.getByRole("option")).toHaveText(["2.3", "4.2", "5.0", "6.0"])
})

test("SEND der DMRL BIKE60: 6.0-XML mit Schema-Angabe und BREX H, schemagültig gesendet und archiviert", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await page.goto("/dmrl/dmrl-bike60")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("combobox", { name: "Empfänger" }).click()
  await page.getByRole("option", { name: /C1234/ }).click()
  const downloadPromise = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "Senden" }).click()
  const download = await downloadPromise
  await expect(dialog).toBeHidden()
  expect(download.suggestedFilename()).toBe(`DML-S1000DBIKE-B6865-C-${year}-00001_001-00.XML`)
  const content = readFileSync((await download.path())!, "utf8")
  expect(content).toContain('xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd"')
  expect(content).toContain('systemDiffCode="H"')
  const data = await readDataset(page)
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-bike60").status).toBe("gesendet")
  expect(data.archive.filter((a: { dmrlId: string }) => a.dmrlId === "dmrl-bike60")).toHaveLength(1)
})

/** Zeilen des Prüfberichts der Gruppe „Schema (XSD)“ — ein XSD-Fehler stünde hier als „Fehler“ */
const xsdRows = (page: Page) => page.getByRole("region", { name: "Prüfergebnis" }).getByRole("row").filter({ hasText: "Schema (XSD)" })

test("Werkzeug: 6.0-Beispiel gegen Issue 6.0 — XSD bestanden, 79 Einträge, Regelverstöße im Bericht", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkInTool(page, BIKE_60, "6.0")
  const result = page.getByRole("region", { name: "Prüfergebnis" })
  await expect(result).toContainText("DML-S1000DBIKE-B6865-S-2024-00001")
  await expect(result).toContainText("79 ohne Antwort")
  await expect(result.getByRole("row").filter({ hasText: "Pflichtfeld ist leer." }).first()).toBeVisible()
  await expect(xsdRows(page)).toHaveCount(0)
})

test("Werkzeug: 5.0-Beispiel gegen Issue 6.0 — XSD bestanden, Hinweis zur Schema-Angabe", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkInTool(page, BIKE_50, "6.0")
  // einzige XSD-Zeile ist der Hinweis — also kein Schemafehler
  await expect(xsdRows(page)).toHaveCount(1)
  await expect(xsdRows(page)).toContainText("Hinweis")
  await expect(xsdRows(page)).toContainText("Die Schema-Angabe der Datei verweist auf S1000D Issue 5.0, gewählt ist Issue 6.0 — bitte Issue prüfen.")
})
