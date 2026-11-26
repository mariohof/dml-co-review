import { readFileSync } from "node:fs"

import { expect, test, type Page } from "@playwright/test"
import { strFromU8, unzipSync } from "fflate"

import { writeXlsx } from "../src/lib/files/xlsx-writer"
import { checkOutXlsxToCsv, readDataset, startAs } from "./helpers"

/** PROJ-9/PROJ-10 Refinement 2026-11-25 — Check-out als MS-Excel, Check-in von Excel und CSV */

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Aktionen" })

async function checkOutVehicle(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await toolbar(page).getByRole("button", { name: "Check-out" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog.getByText(/^DML-GTFDEMO-D0815-C-\d{4}\.xlsx$/)).toBeVisible()
  const downloadPromise = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), bytes: readFileSync((await download.path())!) }
}

async function upload(page: Page, file: { name: string; bytes: Buffer | Uint8Array; mimeType?: string }) {
  await toolbar(page).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: file.name, mimeType: file.mimeType ?? XLSX_MIME, buffer: Buffer.from(file.bytes) })
  return dialog
}

test("Check-out liefert .xlsx (Blatt „Einträge“, Text, fixierte Kopfzeile); erneuter Download gleicher Name", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  expect(file.name).toMatch(/^DML-GTFDEMO-D0815-C-\d{4}\.xlsx$/)
  const files = unzipSync(new Uint8Array(file.bytes))
  expect(strFromU8(files["xl/workbook.xml"])).toContain('<sheet name="Einträge"')
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"])
  expect(sheet).toContain('state="frozen"')
  expect(sheet).toMatch(/<autoFilter ref="A1:AK11"\/>/)
  expect(sheet).toContain(">GTFDEMO<")
  expect(checkOutXlsxToCsv(file.bytes).split("\r\n").filter(Boolean)).toHaveLength(11)

  const again = page.waitForEvent("download")
  await toolbar(page).getByRole("button", { name: "Excel-Datei erneut herunterladen" }).click()
  expect((await again).suggestedFilename()).toBe(file.name)
})

test("ausgecheckte Excel-Datei unverändert einchecken → keine Änderungen, Sperre aufgehoben", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  const dialog = await upload(page, file)
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await expect(dialog.getByText(/Keine Änderungen/)).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").lock).toBeNull()
  expect(data.history.at(-1).details).toBe("Check-in — 0 neu, 0 geändert, 10 unverändert")
})

test("in Excel ergänzte Zeile mit Eintragstyp n → 1 neu, nach Übernahme 11 Einträge", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  const [headerLine, firstLine, ...rest] = checkOutXlsxToCsv(file.bytes).replace(/^﻿/, "").split("\r\n").filter(Boolean)
  const header = headerLine.split(";")
  const added = firstLine.split(";")
  const set = (name: string, value: string) => (added[header.indexOf(name)] = value)
  set("itemloc", "Q")
  set("dmentryType", "n")
  set("type", "new")
  set("answer", "")
  set("answer_comment", "")
  set("answer_timestamp", "")
  const rows = [firstLine, ...rest].map((line) => line.split(";"))
  const edited = writeXlsx({ sheetName: "Einträge", header, rows: [...rows, added] })

  const dialog = await upload(page, { name: file.name, bytes: edited })
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.entries.filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-gtfdemo")).toHaveLength(11)
  expect(data.history.at(-1).details).toBe("Check-in — 1 neu, 0 geändert, 10 unverändert")
})

test("Dateitypen: .xls abgelehnt, beschädigte .xlsx nicht lesbar, Sperre bleibt; CSV weiterhin möglich", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  const dialog = await upload(page, { name: "liste.xls", bytes: file.bytes, mimeType: "application/vnd.ms-excel" })
  await expect(dialog.getByText("Bitte eine Excel- (.xlsx) oder CSV-Datei auswählen.")).toBeVisible()
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: "kaputt.xlsx", mimeType: XLSX_MIME, buffer: Buffer.from("kein zip") })
  await expect(dialog.getByText("Excel-Datei kann nicht gelesen werden.")).toBeVisible()
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: "liste.csv", mimeType: "text/csv", buffer: Buffer.from(checkOutXlsxToCsv(file.bytes)) })
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await expect(dialog.getByText(/Keine Änderungen/)).toBeVisible()
  const data = await readDataset(page)
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").lock).not.toBeNull()
})

test("Informationsfelder (Refinement 2026-11-26): 37 Spalten mit dmc; nur orig geändert → Status bleibt, Wert beim nächsten Check-out da", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const file = await checkOutVehicle(page)
  const lines = checkOutXlsxToCsv(file.bytes).split("\r\n")
  const header = lines[0].replace(/^﻿/, "").split(";")
  expect(header).toHaveLength(37)
  expect(header.slice(27)).toEqual(["remarks", "dmc", "orig", "applic_type", "applic_model", "applic_version", "rfu", "dtd-schema", "spec", "io-pm"])
  const cells = lines[1].split(";")
  expect(cells[header.indexOf("dmc")]).toMatch(/^GTFDEMO-/)
  cells[header.indexOf("orig")] = "D0815"
  lines[1] = cells.join(";")
  const statusBefore = (await readDataset(page)).dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").status

  const dialog = await upload(page, { name: "DML-GTFDEMO-D0815-C-2026.csv", bytes: Buffer.from(lines.join("\r\n")), mimeType: "text/csv" })
  await expect(dialog.getByText("Informationsfelder bei 1 Einträgen aktualisiert")).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").status).toBe(statusBefore)
  expect(data.history.at(-1).details).toBe("Check-in — 0 neu, 0 geändert, 10 unverändert; Informationsfelder bei 1 Einträgen aktualisiert")

  const again = await checkOutVehicle(page)
  const origValues = checkOutXlsxToCsv(again.bytes).split("\r\n").slice(1).filter(Boolean).map((line) => line.split(";")[header.indexOf("orig")])
  expect(origValues.filter((v) => v === "D0815")).toHaveLength(1)
})
