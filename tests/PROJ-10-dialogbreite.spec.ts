import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"

import { checkOutXlsxToCsv, csvName, startAs } from "./helpers"

/**
 * UI-Fix 2026-11-16 (PROJ-10, PROJ-12, PROJ-13): Dialoge mit Prüfbericht sind breit genug,
 * damit die komplette Tabelle (Art, Zeile, DMC, Feld, Regel, Meldung) ohne waagerechtes Scrollen sichtbar ist.
 */

const DEMO = join(__dirname, "..", "public", "demo-dateien")

/** Fahrzeug-DMRL auschecken und die CSV mit ungültigem Eintragstyp in jeder Datenzeile zurückgeben */
async function faultyCheckinCsv(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  const lines = checkOutXlsxToCsv(readFileSync((await download.path())!)).split("\r\n")
  const column = lines[0].replace(/^\uFEFF/, "").split(";").indexOf("dmentryType")
  expect(column).toBeGreaterThanOrEqual(0)
  const faulty = lines.map((line, index) => {
    if (index === 0 || !line) return line
    const cells = line.split(";")
    cells[column] = "X"
    return cells.join(";")
  })
  return { name: csvName(download.suggestedFilename()), csv: faulty.join("\r\n") }
}

async function openCheckinReport(page: Page) {
  const file = await faultyCheckinCsv(page)
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: file.name, mimeType: "text/csv", buffer: Buffer.from(file.csv) })
  await expect(dialog.getByText("Check-in nicht möglich")).toBeVisible()
  await expect(dialog.getByRole("columnheader", { name: "Meldung" })).toBeVisible()
  return dialog
}

/** Waagerechter Überlauf (px) des Dialogs und aller Container zwischen Dialog und Prüfbericht-Tabelle */
async function overflows(dialog: Locator) {
  return dialog.locator("table").first().evaluate((table) => {
    const result: { dialog: number; table: number } = { dialog: 0, table: 0 }
    let node: HTMLElement | null = table.parentElement
    while (node) {
      const overflow = node.scrollWidth - node.clientWidth
      if (node.getAttribute("role") === "dialog") {
        result.dialog = overflow
        break
      }
      result.table = Math.max(result.table, overflow)
      node = node.parentElement
    }
    return result
  })
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe("Dialogbreite Prüfbericht (UI-Fix 2026-11-16)", () => {
  test("Check-in 1440 px: komplette Tabelle sichtbar, weder Dialog noch Tabelle scrollen waagerecht", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await startAs(page, "Ben Bearbeiter")
    const dialog = await openCheckinReport(page)
    const { dialog: dialogOverflow, table } = await overflows(dialog)
    expect(dialogOverflow).toBeLessThanOrEqual(1)
    expect(table).toBeLessThanOrEqual(1)
    // Spalte „Meldung“ liegt vollständig innerhalb des Dialogs
    const dialogBox = (await dialog.boundingBox())!
    const header = (await dialog.getByRole("columnheader", { name: "Meldung" }).boundingBox())!
    expect(header.x + header.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width)
    expect(dialogBox.width).toBeGreaterThan(1000)
  })

  for (const width of [768, 375]) {
    test(`Check-in ${width} px: Dialog passt ins Fenster, nur die Tabelle selbst darf scrollen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await startAs(page, "Ben Bearbeiter")
      const dialog = await openCheckinReport(page)
      expect((await overflows(dialog)).dialog).toBeLessThanOrEqual(1)
      expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
      const box = (await dialog.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
    })
  }

  test("REPLY 1440 px: Prüfbericht (XSD und Regelwerk) ohne waagerechtes Scrollen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await startAs(page, "Anna Bearbeitung")
    for (const file of ["TEST-1_Pflichtelement-fehlt.XML", "TEST-4_Falscher-Absender.XML"]) {
      await page.goto("/dmrl/dmrl-phungun")
      await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "REPLY", exact: true }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("XML-Datei für den REPLY-Import").setInputFiles(join(DEMO, file))
      await expect(dialog.getByRole("columnheader", { name: "Meldung" })).toBeVisible()
      const { dialog: dialogOverflow, table } = await overflows(dialog)
      expect(dialogOverflow, file).toBeLessThanOrEqual(1)
      expect(table, file).toBeLessThanOrEqual(1)
      await dialog.getByRole("button", { name: "Schließen" }).click()
    }
  })

  for (const width of [1440, 375]) {
    test(`SEND ${width} px: Dialog breit genug bzw. passt ins Fenster`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await startAs(page, "Ben Bearbeiter")
      await page.goto("/dmrl/dmrl-gtfdemo")
      await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      await expect(dialog).not.toHaveAttribute("data-state", "closed")
      await page.waitForTimeout(300) // Einblend-Animation (zoom-in) abwarten
      const box = (await dialog.boundingBox())!
      if (width === 1440) expect(box.width).toBeGreaterThan(1000)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await pageOverflow(page)).toBeLessThanOrEqual(1)
    })
  }
})
