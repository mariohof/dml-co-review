import { readFileSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"
import { strToU8, zipSync } from "fflate"

import { writeXlsx } from "../src/lib/files/xlsx-writer"
import { checkOutXlsxToCsv, readDataset, startAs, switchUser } from "./helpers"

/** QA PROJ-9/PROJ-10 Refinement 2026-11-25 — Red Team und Kriterien im echten Browser (Chromium) */

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Aktionen" })
const bytesOf = (text: string) => new Uint8Array(strToU8(text))

/** Mappe mit frei vorgegebenem Blatt-XML (für manipulierte Dateien) */
function rawXlsx(sheetXml: string): Buffer {
  return Buffer.from(
    zipSync({
      "xl/workbook.xml": bytesOf(`<workbook ${NS}><sheets><sheet name="Einträge" sheetId="1" r:id="rId1"/></sheets></workbook>`),
      "xl/_rels/workbook.xml.rels": bytesOf(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
      ),
      "xl/worksheets/sheet1.xml": bytesOf(sheetXml),
    })
  )
}

async function checkOutVehicle(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await toolbar(page).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), bytes: readFileSync((await download.path())!) }
}

async function upload(page: Page, name: string, buffer: Buffer) {
  await toolbar(page).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name, mimeType: XLSX_MIME, buffer })
  return dialog
}

/** Tabelle der Check-out-Datei, eine Zelle der ersten Datenzeile geändert, als .xlsx */
function editedXlsx(bytes: Buffer, column: string, value: string) {
  const [head, ...lines] = checkOutXlsxToCsv(bytes).replace(/^﻿/, "").split("\r\n").filter(Boolean)
  const header = head.split(";")
  const rows = lines.map((l) => l.split(";"))
  rows[0][header.indexOf(column)] = value
  return Buffer.from(writeXlsx({ sheetName: "Einträge", header, rows }))
}

test("Sperre bleibt nach Benutzerwechsel und Neuladen; Sperrinhaber sieht „Excel-Datei erneut herunterladen“, andere nicht", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkOutVehicle(page)
  await page.reload()
  await expect(toolbar(page).getByRole("button", { name: "Excel-Datei erneut herunterladen" })).toBeVisible()
  await switchUser(page, "Administrator")
  await page.goto("/dmrl/dmrl-gtfdemo")
  await expect(toolbar(page).getByRole("button", { name: "Excel-Datei erneut herunterladen" })).toHaveCount(0)
  await expect(page.getByText(/Ausgecheckt von Ben Bearbeiter seit/)).toBeVisible()
})

test("XSS: HTML in einer Zelle der Excel-Datei wird in der Zusammenfassung als Text angezeigt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  const payload = '<img src=x onerror="window.__xss=1">'
  const dialog = await upload(page, file.name, editedXlsx(file.bytes, "remarks", payload))
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await dialog.getByRole("button", { name: /1 Feld\(er\)/ }).click()
  await expect(dialog.getByText(payload).first()).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})

test("Entity-Bombe im Blatt-XML: Browser bleibt bedienbar, Datei wird abgelehnt oder geprüft", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkOutVehicle(page)
  const levels = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
  const entities = levels.map((name, i) => (i === 0 ? '<!ENTITY a "aaaaaaaaaa">' : `<!ENTITY ${name} "${`&${levels[i - 1]};`.repeat(10)}">`)).join("")
  const sheet = `<!DOCTYPE worksheet [${entities}]><worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>&i;</t></is></c></row></sheetData></worksheet>`
  const start = Date.now()
  const dialog = await upload(page, "bombe.xlsx", rawXlsx(sheet))
  await expect(dialog.getByText("Excel-Datei kann nicht gelesen werden.").or(dialog.getByText("Check-in nicht möglich"))).toBeVisible({ timeout: 15_000 })
  console.log(`Entity-Bombe: ${Date.now() - start} ms`)
  expect(Date.now() - start).toBeLessThan(15_000)
})

test("XXE: externe Entity wird nicht nachgeladen", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkOutVehicle(page)
  const requests: string[] = []
  page.on("request", (r) => requests.push(r.url()))
  const sheet = `<!DOCTYPE worksheet [<!ENTITY x SYSTEM "http://angreifer.example/xxe">]><worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>&x;</t></is></c></row></sheetData></worksheet>`
  const dialog = await upload(page, "xxe.xlsx", rawXlsx(sheet))
  // Chrome lädt die externe Entity nicht; sie bleibt leer → Prüfbericht „keine Einträge“ (oder „nicht lesbar“)
  await expect(dialog.getByText("Excel-Datei kann nicht gelesen werden.").or(dialog.getByText("Check-in nicht möglich"))).toBeVisible()
  expect(requests.some((url) => url.includes("angreifer.example"))).toBe(false)
})

test("Prüfbericht einer fehlerhaften Excel-Datei nennt die Zeile des Blatts; Sperre bleibt, „Check-in abgelehnt“ im Verlauf", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  const dialog = await upload(page, file.name, editedXlsx(file.bytes, "dmentryType", "X"))
  await expect(dialog.getByRole("cell", { name: "2", exact: true }).first()).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Übernehmen" })).toHaveCount(0)
  const data = await readDataset(page)
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").lock).not.toBeNull()
  expect(data.history.at(-1).details).toMatch(/^Check-in abgelehnt — \d+ Fehler$/)
})
