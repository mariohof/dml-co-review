import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/**
 * PROJ-20 QA Refinement 2 (2026-11-16): fehlende Ausgabedaten werden in der CSV ergänzt
 * (issno 001, type new, Prüfdatum, Eintragstyp n) — im echten Browser mit echter XSD-Prüfung.
 */

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

async function downloadCsv(page: Page) {
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "CSV herunterladen" }).click()
  const download = await downloadPromise
  return { name: download.suggestedFilename(), csv: readFileSync((await download.path())!, "utf8") }
}

/** CSV → Zeilen als Objekte (Spaltenname → Wert); Werte enthalten in den Testdaten kein Semikolon */
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

test("4.2 ohne Ausgabedaten: Hinweis „ergänzt“ mit Tagesdatum, CSV mit 001/new/Datum, Eintragstyp n nur wo leer", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  // entfernt auch die issueInfo/issueDate im Kopf (dort optional); betroffen sind für die CSV nur die Einträge
  const xml = stripIssueData42(exported.xml)
  const original = csvRecords((await (async () => {
    await checkContent(page, exported.name, exported.xml, "4.2")
    return downloadCsv(page)
  })()).csv)

  await checkContent(page, exported.name, xml, "4.2")
  const d = today()
  await expect(page.getByText(new RegExp(`Einträgen fehlten Ausgabedaten — in der CSV ergänzt: Ausgabenummer 001, Ausgabetyp new, Datum ${d.day}\\.${d.month}\\.${d.year}`)).first()).toBeVisible()
  await expect(page.getByText(/beim Check-in sind sie Pflicht/)).toHaveCount(0)
  const filled = csvRecords((await downloadCsv(page)).csv)
  expect(filled).toHaveLength(original.length)
  for (const [i, row] of filled.entries()) {
    expect(row).toMatchObject({ issno: "001", type: "new", day: d.day, month: d.month, year: d.year })
    // Eintragstyp: vorhandener Wert bleibt, leerer wird n
    expect(row.dmentryType).toBe(original[i].dmentryType === "" ? "n" : original[i].dmentryType)
  }
})

test("4.2 mit issueInfo, aber ohne issueType (Teildaten): keine Ergänzung, Sammelhinweis „beim Check-in Pflicht“", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  const xml = exported.xml.replace(/\s+issueType="[^"]*"/g, "")
  await checkContent(page, exported.name, xml, "4.2")
  await expect(page.getByText(/Einträgen fehlen Ausgabedaten .* beim Check-in sind sie Pflicht/).first()).toBeVisible()
  await expect(page.getByText(/in der CSV ergänzt/)).toHaveCount(0)
  const rows = csvRecords((await downloadCsv(page)).csv)
  expect(rows.every((r) => r.type === "" && r.issno !== "")).toBe(true)
})

test("Rundlauf in bestehende DMRL: 4.2-Export ohne Ausgabedaten → CSV → Check-in in GTFDEMO besteht; Datum der Einträge als Änderung gemeldet", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  await checkContent(page, exported.name, stripIssueData42(exported.xml), "4.2")
  await expect(page.getByText(/in der CSV ergänzt/).first()).toBeVisible()
  const converted = await downloadCsv(page)

  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const checkoutPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  await checkoutPromise
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("CSV-Datei für den Check-in").setInputFiles({ name: converted.name, mimeType: "text/csv", buffer: Buffer.from(converted.csv) })
  await expect(dialog.getByText("Prüfung bestanden")).toBeVisible()
  await expect(dialog.getByText("Keine Fehler und keine Hinweise.")).toBeVisible()
  // GTFDEMO hat bereits 001/new mit anderem Datum → das Prüfdatum erscheint als Änderung (gewollt laut Tech Design K)
  await expect(dialog.getByText("Geänderte Einträge (10)")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Übernehmen" })).toBeEnabled()
})

test("Nichts gespeichert: Datenbestand vor und nach Prüfung mit Ergänzung identisch", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const exported = await exportGtfdemoXml(page)
  const before = await readDataset(page)
  await checkContent(page, exported.name, stripIssueData42(exported.xml), "4.2")
  await expect(page.getByText(/in der CSV ergänzt/).first()).toBeVisible()
  await downloadCsv(page)
  expect(await readDataset(page)).toEqual(before)
})
