import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** PROJ-10 Refinement 2026-11-16: Eintragstyp ↔ DM-Ausgabetyp beim Check-in */

async function checkOut(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), csv: readFileSync((await download.path())!, "utf8") }
}

/** Felder der ersten Datenzeile per Spaltenname setzen */
function withFirstRow(csv: string, values: Record<string, string>) {
  const lines = csv.split("\r\n")
  const header = lines[0].replace(/^﻿/, "").split(";")
  const cells = lines[1].split(";")
  for (const [name, value] of Object.entries(values)) {
    const index = header.indexOf(name)
    expect(index).toBeGreaterThanOrEqual(0)
    cells[index] = value
  }
  lines[1] = cells.join(";")
  return lines.join("\r\n")
}

async function upload(page: Page, file: { name: string; csv: string }) {
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("CSV-Datei für den Check-in").setInputFiles({ name: file.name, mimeType: "text/csv", buffer: Buffer.from(file.csv) })
  return dialog
}

test("Eintragstyp d mit Ausgabetyp new: Prüfbericht mit Typ-Meldung, kein Übernehmen, Sperre bleibt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withFirstRow(file.csv, { dmentryType: "d", type: "new" }) })

  await expect(dialog.getByText("Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Übernehmen" })).toHaveCount(0)
  await dialog.getByRole("button", { name: "Schließen" }).first().click()
  const data = await readDataset(page)
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").lock).not.toBeNull()
  expect(data.history.at(-1).details).toBe("Check-in abgelehnt — 1 Fehler")
})

test("Eintragstyp c mit Ausgabetyp status: Check-in möglich, Eintrag in Bearbeitung mit status", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withFirstRow(file.csv, { dmentryType: "c", type: "status", issno: "002" }) })

  await expect(dialog.getByLabel("Zusammenfassung")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  const entry = data.entries.find((e: { dmrlId: string; fields: { type: string } }) => e.dmrlId === "dmrl-gtfdemo" && e.fields.type === "status")
  expect(entry).toMatchObject({ status: "in_bearbeitung", fields: { dmentryType: "c", issno: "002" } })
})

test("1440 px: Typ-Meldung im Prüfbericht vollständig sichtbar, kein waagerechtes Scrollen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withFirstRow(file.csv, { dmentryType: "c", type: "deleted" }) })
  const message = dialog.getByText("Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚deleted‘")
  await expect(message).toBeVisible()
  const box = (await message.boundingBox())!
  const dialogBox = (await dialog.boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

// BUG-QA7-1: Die Prüfung stürzt bei diesen Eintragstypen ab; der Dialog bleibt bei „Prüfung läuft“ stehen. Nach der Behebung aktivieren.
test.fixme("BUG-QA7-1: Eintragstyp ‚constructor‘ → Formatfehler im Prüfbericht statt hängender Prüfung", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOut(page)
  const dialog = await upload(page, { ...file, csv: withFirstRow(file.csv, { dmentryType: "constructor" }) })
  await expect(dialog.getByRole("cell", { name: "dmentryType" })).toBeVisible()
})
