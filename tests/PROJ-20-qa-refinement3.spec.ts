import { readFileSync } from "node:fs"
import { join } from "node:path"
import { strFromU8, unzipSync } from "fflate"
import { expect, test, type Page } from "@playwright/test"

import { checkOutXlsxToCsv, readDataset, startAs } from "./helpers"

/** PROJ-20 QA Refinement 2026-11-26 (3): MS-Excel mit 37 Spalten statt CSV — im echten Browser mit echter XSD-Prüfung */

const DEMO_DIR = join(__dirname, "..", "public", "demo-dateien")
const BIKE_60 = join(__dirname, "..", "docs", "beispiele", "issue-6.0", "DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML")
const INFO_HINT = "Die Informationsfelder (orig bis io-pm) sind leer — beim Check-in werden gespeicherte Werte der DMRL dadurch geleert."

async function checkContent(page: Page, name: string, content: Buffer, issue: string) {
  await page.goto("/xml-pruefung")
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: `Issue ${issue}` }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name, mimeType: "application/xml", buffer: content })
  await page.getByRole("button", { name: "Prüfen" }).click()
}

async function downloadXlsx(page: Page) {
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Excel-Datei herunterladen" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), bytes: readFileSync((await download.path())!) }
}

test("Schemafehler: Fehlerwarnung mit neuem Text und Dauerhinweis zu den Informationsfeldern; keine CSV-Schaltfläche", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  await checkContent(page, "TEST-1_Pflichtelement-fehlt.XML", readFileSync(join(DEMO_DIR, "TEST-1_Pflichtelement-fehlt.XML")), "2.3")
  await expect(page.getByText("Die Excel-Datei enthält Fehler aus der Prüfung — ein Check-in wird abgewiesen, bis sie behoben sind.")).toBeVisible()
  await expect(page.getByText(INFO_HINT)).toBeVisible()
  await expect(page.getByText("Die Excel-Datei kann mit Warnung heruntergeladen werden.")).toBeVisible()
  await expect(page.getByRole("button", { name: "CSV herunterladen" })).toHaveCount(0)
  await expect(page.getByText(/Die CSV/)).toHaveCount(0)
})

test("Issue 6.0 (Beispiel BIKE): Excel-Datei mit Blatt „Einträge“, 37 Spalten, 79 Zeilen, dmc gefüllt; nichts gespeichert", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const before = await readDataset(page)
  await checkContent(page, "DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML", readFileSync(BIKE_60), "6.0")
  await expect(page.getByLabel("Zusammenfassung")).toContainText("S1000DBIKE")
  await expect(page.getByText(INFO_HINT)).toBeVisible()
  const { name, bytes } = await downloadXlsx(page)
  expect(name).toBe("DML-S1000DBIKE-B6865-S-2024-00001_001-00.xlsx")
  const files = unzipSync(new Uint8Array(bytes))
  expect(strFromU8(files["xl/workbook.xml"])).toContain('<sheet name="Einträge"')
  const lines = checkOutXlsxToCsv(bytes).replace(/^﻿/, "").split("\r\n").filter(Boolean)
  const header = lines[0].split(";")
  expect(header).toHaveLength(37)
  expect(lines).toHaveLength(80)
  const dmc = header.indexOf("dmc")
  const orig = header.indexOf("orig")
  for (const line of lines.slice(1)) {
    const cells = line.split(";")
    expect(cells[dmc]).toMatch(/^S1000DBIKE-/)
    expect(cells[orig]).toBe("")
  }
  expect(await readDataset(page)).toEqual(before)
})
