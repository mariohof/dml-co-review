import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { checkOutXlsxToCsv, patchDataset, readDataset, startAs } from "./helpers"

/**
 * PROJ-20 QA Refinement 2/3 (2026-11-16): fehlende Ausgabedaten werden in der Excel-Datei ergänzt
 * (Ausgabetyp aus dem Eintragstyp, issno 001, Prüfdatum, Eintragstyp n — nur wo leer) — im echten Browser mit echter XSD-Prüfung.
 */

const ISSUE_TYPE: Record<string, string> = { n: "new", c: "changed", d: "deleted" }
const derivedIssueType = (entryType: string) => ISSUE_TYPE[entryType] ?? "new"

const today = () => {
  const now = new Date()
  return { day: String(now.getDate()).padStart(2, "0"), month: String(now.getMonth() + 1).padStart(2, "0"), year: String(now.getFullYear()) }
}

async function checkContent(page: Page, name: string, content: string | Buffer, issue: string) {
  await page.goto("/xml-pruefung")
  await page.getByRole("combobox", { name: "S1000D-Issue" }).click()
  await page.getByRole("option", { name: `Issue ${issue}` }).click()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name, mimeType: "application/xml", buffer: Buffer.isBuffer(content) ? content : Buffer.from(content) })
  await page.getByRole("button", { name: "Prüfen" }).click()
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** Excel-Datei des Werkzeugs (PROJ-20 Refinement 2026-11-26 (3)); `csv` = Inhalt als Text für Inhaltsprüfungen */
async function downloadXlsx(page: Page) {
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Excel-Datei herunterladen" }).click()
  const download = await downloadPromise
  const bytes = readFileSync((await download.path())!)
  return { name: download.suggestedFilename(), bytes, csv: checkOutXlsxToCsv(bytes) }
}

/** Inhalt (als CSV-Text) → Zeilen als Objekte (Spaltenname → Wert); Werte enthalten in den Testdaten kein Semikolon */
function csvRecords(csv: string) {
  const [head, ...rows] = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean)
  const header = head.split(";")
  return rows.map((row) => Object.fromEntries(row.split(";").map((cell, i) => [header[i], cell])))
}

/** DMRL GTFDEMO (Issue 4.2) als XML exportieren */
async function exportGtfdemoXml(page: Page) {
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Exportieren" }).click()
  const exportPromise = page.waitForEvent("download")
  await page.getByRole("menuitem", { name: "Als XML exportieren" }).click()
  const exported = await exportPromise
  return { name: exported.suggestedFilename(), xml: readFileSync((await exported.path())!, "utf8") }
}

/** Ausgabedaten (4.2) entfernen: issueInfo, issueDate und dmlEntry/@issueType */
const stripIssueData42 = (xml: string) =>
  xml
    .replace(/<issueInfo\b[^>]*\/>/g, "")
    .replace(/<issueInfo\b[^>]*>\s*<\/issueInfo>/g, "")
    .replace(/<issueDate\b[^>]*\/>/g, "")
    .replace(/<issueDate\b[^>]*>\s*<\/issueDate>/g, "")
    .replace(/\s+issueType="[^"]*"/g, "")

test("4.2 ohne Ausgabedaten: Hinweis „ergänzt“ mit Tagesdatum, Excel-Datei mit 001/abgeleitetem Ausgabetyp/Datum, Eintragstyp n nur wo leer", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  // entfernt auch die issueInfo/issueDate im Kopf (dort optional); betroffen sind für die Excel-Datei nur die Einträge
  const xml = stripIssueData42(exported.xml)
  const original = csvRecords((await (async () => {
    await checkContent(page, exported.name, exported.xml, "4.2")
    return downloadXlsx(page)
  })()).csv)

  await checkContent(page, exported.name, xml, "4.2")
  const d = today()
  await expect(page.getByText(new RegExp(`Einträgen fehlten Ausgabedaten — in der Excel-Datei ergänzt: Ausgabetyp aus dem Eintragstyp .* Ausgabenummer 001 und Datum ${d.day}\\.${d.month}\\.${d.year}`)).first()).toBeVisible()
  await expect(page.getByText(/beim Check-in sind sie Pflicht/)).toHaveCount(0)
  const filled = csvRecords((await downloadXlsx(page)).csv)
  expect(filled).toHaveLength(original.length)
  for (const [i, row] of filled.entries()) {
    expect(row).toMatchObject({ issno: "001", type: derivedIssueType(original[i].dmentryType), day: d.day, month: d.month, year: d.year })
    // Eintragstyp: vorhandener Wert bleibt, leerer wird n
    expect(row.dmentryType).toBe(original[i].dmentryType === "" ? "n" : original[i].dmentryType)
  }
})

test("4.2 mit issueInfo, aber ohne issueType: ergänzt — Ausgabenummer und Datum bleiben, Ausgabetyp abgeleitet (Refinement 3)", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  await checkContent(page, exported.name, exported.xml, "4.2")
  const original = csvRecords((await downloadXlsx(page)).csv)
  const xml = exported.xml.replace(/\s+issueType="[^"]*"/g, "")
  await checkContent(page, exported.name, xml, "4.2")
  await expect(page.getByText(/in der Excel-Datei ergänzt/).first()).toBeVisible()
  await expect(page.getByText(/beim Check-in sind sie Pflicht/)).toHaveCount(0)
  const rows = csvRecords((await downloadXlsx(page)).csv)
  expect(rows).toHaveLength(original.length)
  for (const [i, row] of rows.entries()) {
    expect(row).toMatchObject({ issno: original[i].issno, day: original[i].day, month: original[i].month, year: original[i].year })
    expect(row.type).toBe(derivedIssueType(original[i].dmentryType))
  }
})

test("Rundlauf in bestehende DMRL: 4.2-Export ohne Ausgabedaten → Excel → Check-in in GTFDEMO besteht; Datum der Einträge als Änderung gemeldet", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  await checkContent(page, exported.name, stripIssueData42(exported.xml), "4.2")
  await expect(page.getByText(/in der Excel-Datei ergänzt/).first()).toBeVisible()
  const converted = await downloadXlsx(page)

  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const checkoutPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  await checkoutPromise
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: converted.name, mimeType: XLSX_MIME, buffer: converted.bytes })
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  // Werkzeug-Excel hat 37 Spalten wie der Check-out (Refinement 2026-11-26 (3)) → kein Hinweis „Datei ohne Informationsfelder“
  await expect(dialog.getByText("Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten.")).toHaveCount(0)
  // GTFDEMO hat bereits 001/new mit anderem Datum → das Prüfdatum erscheint als Änderung (gewollt laut Tech Design K)
  await expect(dialog.getByText("Geänderte Einträge (10)")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Übernehmen" })).toBeEnabled()
})

test("Nichts gespeichert: Datenbestand vor und nach Prüfung mit Ergänzung identisch", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  const before = await readDataset(page)
  await checkContent(page, exported.name, stripIssueData42(exported.xml), "4.2")
  await expect(page.getByText(/in der Excel-Datei ergänzt/).first()).toBeVisible()
  await downloadXlsx(page)
  expect(await readDataset(page)).toEqual(before)
})

test("Refinement 2026-11-26 (3): Werkzeug-Excel hat 37 Spalten wie der Check-out; Check-in leert gespeicherte Informationsfelder (gewollt)", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await patchDataset(page, `for (const e of data.entries) if (e.dmrlId === "dmrl-gtfdemo") e.fields.orig = "ALT01"`)
  const exported = await exportGtfdemoXml(page)
  await checkContent(page, exported.name, stripIssueData42(exported.xml), "4.2")
  const converted = await downloadXlsx(page)
  expect(converted.name).toMatch(/\.xlsx$/)
  const header = converted.csv.replace(/^﻿/, "").split("\r\n")[0].split(";")
  expect(header).toHaveLength(37)
  expect(header.slice(-9)).toEqual(["dmc", "orig", "applic_type", "applic_model", "applic_version", "rfu", "dtd-schema", "spec", "io-pm"])
  await expect(page.getByText(/Die Informationsfelder \(orig bis io-pm\) sind leer — beim Check-in werden gespeicherte Werte der DMRL dadurch geleert/)).toBeVisible()

  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const checkoutPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  await checkoutPromise
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: converted.name, mimeType: XLSX_MIME, buffer: converted.bytes })
  await expect(dialog.getByText(/Informationsfelder bei \d+ Einträgen aktualisiert/).first()).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  const entries = data.entries.filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-gtfdemo")
  expect(entries.every((e: { fields: { orig: string } }) => e.fields.orig === "")).toBe(true)
})
