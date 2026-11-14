import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** PROJ-10 Refinement 2026-11-14: abweichende Partnerantworten beim Check-in optional übernehmen */

const COLUMNS = 27
const ANSWER_COMMENT = 25 // Spalte answer_comment (0-basiert)

/** Fahrzeug-DMRL auschecken und die heruntergeladene CSV zurückgeben */
async function checkOut(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), csv: readFileSync((await download.path())!, "utf8") }
}

/** Begründung der Partnerantwort in der ersten Datenzeile setzen */
function withAnswerComment(csv: string, comment: string) {
  const lines = csv.split("\r\n")
  const cells = lines[1].split(";")
  expect(cells).toHaveLength(COLUMNS)
  cells[ANSWER_COMMENT] = comment
  lines[1] = cells.join(";")
  return lines.join("\r\n")
}

async function upload(page: Page, file: { name: string; csv: string }) {
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("CSV-Datei für den Check-in").setInputFiles({ name: file.name, mimeType: "text/csv", buffer: Buffer.from(file.csv) })
  return dialog
}

test("abweichende Partnerantwort: Abschnitt mit Häkchen (aus), Übernahme mit Häkchen, Eintrag in Bearbeitung, Verlauf", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withAnswerComment(file.csv, "Begründung aus Altbestand") })

  await expect(dialog.getByText("Abweichende Partnerantworten (1 Eintrag)")).toBeVisible()
  const checkbox = dialog.getByRole("checkbox", { name: "Antworten aus der Datei übernehmen" })
  await expect(checkbox).not.toBeChecked()
  const summary = dialog.getByLabel("Zusammenfassung")
  await expect(summary.getByText("unverändert").locator("xpath=following-sibling::dd")).toHaveText("10")
  await checkbox.click()
  await expect(summary.getByText("geändert", { exact: true }).locator("xpath=following-sibling::dd")).toHaveText("1")

  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  const entry = data.entries.find((e: { fields: { answer_comment: string } }) => e.fields.answer_comment === "Begründung aus Altbestand")
  expect(entry?.status).toBe("in_bearbeitung")
  expect(data.history.at(-1).details).toBe("Check-in — 0 neu, 1 geändert, 9 unverändert; 1 Antworten aus der Datei übernommen")
})

test("ohne Häkchen: bisherige Antwort bleibt, Check-in ohne Änderung", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withAnswerComment(file.csv, "nicht übernehmen") })
  await expect(dialog.getByText("Abweichende Partnerantworten (1 Eintrag)")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.entries.some((e: { fields: { answer_comment: string } }) => e.fields.answer_comment === "nicht übernehmen")).toBe(false)
  expect(data.history.at(-1).details).toBe("Check-in — 0 neu, 0 geändert, 10 unverändert")
})

test("375 px: Abschnitt mit Häkchen ohne waagerechtes Scrollen der Seite", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withAnswerComment(file.csv, "Sehr lange Begründung ".repeat(10)) })
  await dialog.getByRole("checkbox", { name: "Antworten aus der Datei übernehmen" }).click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test("XSS: HTML in der Begründung wird im Abschnitt als Text angezeigt, nicht ausgeführt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  let dialogOpened = false
  page.on("dialog", (d) => {
    dialogOpened = true
    void d.dismiss()
  })
  const payload = '<img src=x onerror="alert(1)">'
  const file = await checkOut(page)
  // Wert mit Anführungszeichen CSV-gerecht quoten
  const dialog = await upload(page, { ...file, csv: withAnswerComment(file.csv, `"${payload.replace(/"/g, '""')}"`) })
  await dialog.getByRole("button", { name: /GTFDEMO-/ }).first().click()
  await expect(dialog.getByText(payload)).toBeVisible()
  expect(await page.locator("img[src='x']").count()).toBe(0)
  expect(dialogOpened).toBe(false)
})

test("768 px: Abschnitt aufgeklappt mit Häkchen ohne waagerechtes Scrollen der Seite", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 })
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withAnswerComment(file.csv, "Begründung ".repeat(30)) })
  await dialog.getByRole("button", { name: /GTFDEMO-/ }).first().click()
  await dialog.getByRole("checkbox", { name: "Antworten aus der Datei übernehmen" }).click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test("BUG-QA4-1: entfernter Eintragstyp → Prüfbericht „Eintrag in Bearbeitung braucht einen Eintragstyp“, keine Übernahme", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const lines = file.csv.split("\r\n")
  const cells = lines[1].split(";")
  cells[0] = "" // dmentryType n → leer
  lines[1] = cells.join(";")
  const dialog = await upload(page, { ...file, csv: lines.join("\r\n") })
  await expect(dialog.getByText("Check-in nicht möglich")).toBeVisible()
  await expect(dialog.getByText(/Eintrag in Bearbeitung braucht einen Eintragstyp \(n, c oder d\)/)).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Übernehmen" })).toHaveCount(0)
})
