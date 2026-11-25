import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/**
 * PROJ-20 QA Refinement 2/3 (2026-11-16): fehlende Ausgabedaten werden in der CSV ergänzt
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

test("4.2 ohne Ausgabedaten: Hinweis „ergänzt“ mit Tagesdatum, CSV mit 001/abgeleitetem Ausgabetyp/Datum, Eintragstyp n nur wo leer", async ({ page }) => {
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
  await expect(page.getByText(new RegExp(`Einträgen fehlten Ausgabedaten — in der CSV ergänzt: Ausgabetyp aus dem Eintragstyp .* Ausgabenummer 001 und Datum ${d.day}\\.${d.month}\\.${d.year}`)).first()).toBeVisible()
  await expect(page.getByText(/beim Check-in sind sie Pflicht/)).toHaveCount(0)
  const filled = csvRecords((await downloadCsv(page)).csv)
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
  const original = csvRecords((await downloadCsv(page)).csv)
  const xml = exported.xml.replace(/\s+issueType="[^"]*"/g, "")
  await checkContent(page, exported.name, xml, "4.2")
  await expect(page.getByText(/in der CSV ergänzt/).first()).toBeVisible()
  await expect(page.getByText(/beim Check-in sind sie Pflicht/)).toHaveCount(0)
  const rows = csvRecords((await downloadCsv(page)).csv)
  expect(rows).toHaveLength(original.length)
  for (const [i, row] of rows.entries()) {
    expect(row).toMatchObject({ issno: original[i].issno, day: original[i].day, month: original[i].month, year: original[i].year })
    expect(row.type).toBe(derivedIssueType(original[i].dmentryType))
  }
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
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: converted.name, mimeType: "text/csv", buffer: Buffer.from(converted.csv) })
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
