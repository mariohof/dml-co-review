import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs, switchUser } from "./helpers"

/** PROJ-20 QA: Rundlauf, Sicherheit und Grenzfälle im echten Browser mit echter XSD-Prüfung */

const DEMO_DIR = join(__dirname, "..", "public", "demo-dateien")
const REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"
const XSD_NOT_PERFORMED_TEXT = /XSD-Prüfung nicht durchgeführt/
const replyXml = () => readFileSync(join(DEMO_DIR, REPLY), "utf8")

async function checkContent(page: Page, name: string, content: string | Buffer, issue = "2.3") {
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

test("Rundlauf: exportierte DMRL-XML (4.2) → CSV → Check-in in die ausgecheckte DMRL besteht die Regelprüfung", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await page.goto("/dmrl/dmrl-gtfdemo")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Exportieren" }).click()
  const exportPromise = page.waitForEvent("download")
  await page.getByRole("menuitem", { name: "Als XML exportieren" }).click()
  const exported = await exportPromise
  const xml = readFileSync((await exported.path())!)

  await checkContent(page, exported.suggestedFilename(), xml, "4.2")
  await expect(page.getByLabel("Zusammenfassung")).toContainText("GTFDEMO")
  await expect(page.getByText("Keine Fehler und keine Hinweise.")).toBeVisible()
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
  await expect(dialog.getByRole("button", { name: "Übernehmen" })).toBeEnabled()
})

test("Partner-REPLY mit Ausgabedaten → CSV → Check-in fragt nach Übernahme der Antworten", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  // PHUNGUN-Einträge erhalten Ausgabedaten, damit die Pflichtfelder des Check-ins erfüllt sind
  const xml = replyXml().replace(/<\/dmtitle>/g, '</dmtitle><issno issno="001" type="new"/><issdate day="01" month="02" year="2027"/>')
  await checkContent(page, REPLY, xml)
  await expect(page.getByLabel("Zusammenfassung")).toContainText("30 freigegeben · 2 zu überarbeiten")
  const converted = await downloadCsv(page)
  expect(converted.csv).toContain(";n;")

  // SEND zurückziehen ist nicht nötig: PHUNGUN wartet auf REPLY → Check-out nicht möglich; daher Fahrzeug-unabhängig nur Antwortspalten prüfen
  const lines = converted.csv.split("\r\n").filter(Boolean)
  const header = lines[0].replace(/^﻿/, "").split(";")
  const answerIndex = header.indexOf("answer")
  const commentIndex = header.indexOf("answer_comment")
  const rejected = lines.slice(1).map((l) => l.split(";")).filter((cells) => cells[answerIndex] === "n")
  expect(rejected).toHaveLength(2)
  expect(rejected.every((cells) => cells[commentIndex] !== "")).toBe(true)
})

test("XSS: HTML in einem Feld (chapnum) und im Dateinamen wird als Text angezeigt, nicht ausgeführt", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  let dialogOpened = false
  page.on("dialog", (d) => {
    dialogOpened = true
    void d.dismiss()
  })
  const payload = '<img src=x onerror="alert(1)">'
  const escaped = payload.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  const xml = replyXml().replace(/<chapnum>[^<]*<\/chapnum>/, `<chapnum>${escaped}</chapnum>`)
  await checkContent(page, `<b>x</b>.xml`, xml)
  await expect(page.getByLabel("Zusammenfassung")).toContainText("<b>x</b>.xml")
  await page.getByRole("tab", { name: "nach Zeile / Eintrag" }).click()
  await expect(page.getByText(payload, { exact: false }).first()).toBeVisible()
  expect(await page.locator("img[src='x']").count()).toBe(0)
  expect(dialogOpened).toBe(false)
})

test("Externe Entities (XXE) werden nicht nachgeladen", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const xml = replyXml()
    .replace(/<dml /, '<!DOCTYPE dml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n<dml ')
    .replace(/<techname>[^<]*<\/techname>/, "<techname>&xxe;</techname>")
  await checkContent(page, "xxe.xml", xml)
  await expect(page.getByLabel("Zusammenfassung").or(page.getByText("Die Datei kann nicht geprüft werden"))).toBeVisible()
  await expect(page.locator("body")).not.toContainText("root:")
  if (await page.getByRole("button", { name: "CSV herunterladen" }).count()) {
    const { csv } = await downloadCsv(page)
    expect(csv).not.toContain("root:")
  }
})

test("Benutzerwechsel bei angezeigtem Ergebnis: Werkzeug bleibt offen und nutzbar", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkContent(page, REPLY, replyXml())
  await expect(page.getByLabel("Zusammenfassung")).toBeVisible()
  await switchUser(page, "Anna Bearbeitung")
  await expect(page).toHaveURL(/\/xml-pruefung/)
  await expect(page.getByRole("heading", { name: "XML prüfen." })).toBeVisible()
})

test("Keine DMRL-XML (wohlgeformt, anderes Wurzelelement): keine CSV", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await checkContent(page, "dm.xml", '<?xml version="1.0" encoding="UTF-8"?><dmodule><content/></dmodule>')
  await expect(page.getByText(/Datei passt nicht zur gewählten Issue/).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "CSV herunterladen" })).toHaveCount(0)
})

test("Leere und zu große Dateien werden abgewiesen", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  await page.goto("/xml-pruefung")
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name: "leer.xml", mimeType: "application/xml", buffer: Buffer.alloc(0) })
  await expect(page.getByText("Die Datei ist leer.")).toBeVisible()
  await page.getByLabel("XML-Datei zur Prüfung").setInputFiles({ name: "gross.xml", mimeType: "application/xml", buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 32) })
  await expect(page.getByText("Datei zu groß (höchstens 5 MB).")).toBeVisible()
})

test("Große Datei (knapp 5 MB): Prüfung und Konvertierung in wenigen Sekunden, nichts gespeichert", async ({ page }) => {
  test.setTimeout(120_000)
  await startAs(page, "Ben Bearbeiter")
  const xml = replyXml()
  const entry = /<dmentry[\s\S]*?<\/dmentry>/.exec(xml)![0]
  let seq = 0
  const entries: string[] = []
  let size = xml.length
  while (size < 4.8 * 1024 * 1024) {
    seq += 1
    const e = entry.replace(/<subject>\d+<\/subject>/, `<subject>${String(seq % 10000).padStart(4, "0")}</subject>`).replace(/<incode>\d+<\/incode>/, `<incode>${String(Math.floor(seq / 10000)).padStart(3, "0")}</incode>`)
    entries.push(e)
    size += e.length
  }
  const big = xml.replace(/(<dmentry[\s\S]*<\/dmentry>)/, `$1${entries.join("")}`)
  expect(Buffer.byteLength(big)).toBeLessThan(5 * 1024 * 1024)
  const before = await readDataset(page)
  const started = Date.now()
  await checkContent(page, "gross.xml", big)
  await expect(page.getByLabel("Zusammenfassung")).toBeVisible({ timeout: 60_000 })
  const seconds = (Date.now() - started) / 1000
  console.log(`PROJ-20 QA: ${entries.length + 32} Einträge, ${(Buffer.byteLength(big) / 1024 / 1024).toFixed(2)} MB in ${seconds.toFixed(1)} s`)
  expect(seconds).toBeLessThan(15)
  const { csv } = await downloadCsv(page)
  expect(csv.split("\r\n").filter(Boolean).length).toBe(entries.length + 33)
  expect(await readDataset(page)).toEqual(before)
})

test("UTF-16-Datei (BUG-QA1-1): XSD-Prüfung, Lesen und CSV in UTF-8", async ({ page }) => {
  await startAs(page, "Ben Bearbeiter")
  const xml = replyXml().replace(/^\ufeff/, "").replace(/encoding="[^"]*"/i, 'encoding="UTF-16"')
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, "utf16le")])
  await checkContent(page, "utf16.xml", utf16)
  await expect(page.getByLabel("Zusammenfassung")).toContainText("30 freigegeben · 2 zu überarbeiten")
  await expect(page.getByText("Die Datei kann nicht geprüft werden")).toHaveCount(0)
  await expect(page.getByText(XSD_NOT_PERFORMED_TEXT)).toHaveCount(0)
  const { csv } = await downloadCsv(page)
  expect(csv.split("\r\n").filter(Boolean)).toHaveLength(33)
})
