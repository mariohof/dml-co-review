import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"

import { patchDataset, readDataset, startAs } from "./helpers"

/**
 * QA 2026-11-21 — Refinements PROJ-12 (Empfänger statt Partner, Bezug SEND ↔ REPLY, 2026-11-20)
 * und PROJ-13 / PROJ-10 (answer_timestamp, 2026-11-21). Echte XSD-Prüfung über die Serverfunktion.
 */

const DEMO = join(__dirname, "..", "public", "demo-dateien")
const DEMO_REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"
const demoReply = readFileSync(join(DEMO, DEMO_REPLY), "utf8")
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
/** „Partner" nur noch im Firmennamen der Demo-Organisation */
const OLD_TERM = /Partner(?! Systemtechnik)/

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Aktionen" })

async function uploadReply(page: Page, xml: string, name = DEMO_REPLY) {
  await page.goto("/dmrl/dmrl-phungun")
  await toolbar(page).getByRole("button", { name: "REPLY importieren" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("XML-Datei für den REPLY-Import").setInputFiles({ name, mimeType: "application/xml", buffer: Buffer.from(xml) })
  return dialog
}

/** ändert nur den Block /dml/dmlref, nicht /dml/dmlc des REPLY */
const withDmlref = (change: (block: string) => string) => demoReply.replace(/<dmlref>[\s\S]*?<\/dmlref>/, change)

async function download(page: Page, trigger: () => Promise<void>) {
  const promise = page.waitForEvent("download")
  await trigger()
  const file = await promise
  return { name: file.suggestedFilename(), content: readFileSync((await file.path())!, "utf8") }
}

async function exportAs(page: Page, format: "CSV" | "XML") {
  await toolbar(page).getByRole("button", { name: "Exportieren" }).click()
  return download(page, () => page.getByRole("menuitem", { name: `Als ${format} exportieren` }).click())
}

const csvColumn = (csv: string, name: string) => {
  const lines = csv.replace(/^﻿/, "").split("\r\n").filter((l) => l !== "")
  const index = lines[0].split(";").indexOf(name)
  return { header: lines[0].split(";"), values: lines.slice(1).map((l) => l.split(";")[index]) }
}

test.describe("PROJ-12 — Empfänger statt Partner", () => {
  test("SEND-Dialog: Feld „Empfänger“, Pflichtfehler und Hinweis „Abweichend vom letzten Empfänger“", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    // dritte Organisation, damit ein anderer als der letzte Empfänger wählbar ist
    await patchDataset(page, `data.organisations.push({ id: "org-qa", code: "Q0001", name: "QA Empfänger GmbH" })`)
    // Fahrzeug: noch nie gesendet → keine Vorbelegung → Pflichtfehler
    await page.goto("/dmrl/dmrl-gtfdemo")
    await toolbar(page).getByRole("button", { name: "SEND" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("combobox", { name: "Empfänger" })).toBeVisible()
    await dialog.getByRole("button", { name: "Senden" }).click()
    await expect(dialog.getByText("Bitte einen Empfänger auswählen.")).toBeVisible()
    await expect(dialog).not.toContainText(OLD_TERM)
    await dialog.getByRole("button", { name: "Abbrechen" }).click()

    // PHUNGUN: SEND zurückziehen (Admin) → Vorbelegung C1234 → anderer Empfänger → Hinweis
    await page.getByRole("button", { name: /^Benutzer: / }).click()
    await page.getByRole("menuitemradio", { name: /Administrator/ }).click()
    await page.goto("/dmrl/dmrl-phungun")
    await toolbar(page).getByRole("button", { name: "SEND zurückziehen" }).click()
    const withdraw = page.getByRole("dialog")
    await expect(withdraw).not.toContainText(OLD_TERM)
    await withdraw.getByLabel("Begründung").fill("QA: anderer Empfänger")
    await withdraw.getByRole("button", { name: "Zurückziehen" }).click()
    await expect(withdraw).toBeHidden()
    await toolbar(page).getByRole("button", { name: "SEND" }).click()
    const send = page.getByRole("dialog")
    await expect(send.getByRole("combobox", { name: "Empfänger" })).toContainText("C1234")
    await send.getByRole("combobox", { name: "Empfänger" }).click()
    await page.getByRole("option", { name: /Q0001/ }).click()
    await expect(send.getByText(/Abweichend vom letzten Empfänger C1234/)).toBeVisible()
  })

  test("keine sichtbaren „Partner“-Texte in Ansicht, REPLY-Dialog, Archiv und Verwaltung", async ({ page }) => {
    await startAs(page, "Administrator")
    for (const path of ["/dmrl/dmrl-phungun", "/dmrl/dmrl-phungun/archiv", "/verwaltung/organisationen", "/verwaltung/dmrl"]) {
      await page.goto(path)
      await expect(page.locator("main")).toBeVisible()
      await expect(page.locator("main")).not.toContainText(OLD_TERM)
    }
    const dialog = await uploadReply(page, demoReply)
    await expect(dialog.getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeVisible()
    await expect(dialog).not.toContainText(OLD_TERM)
    await dialog.getByRole("button", { name: "Übernehmen" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator("main")).not.toContainText(OLD_TERM)
    await expect(page.getByText("Bemerkung des Empfängers (letzter REPLY)").or(page.getByRole("columnheader", { name: "Empfänger-Kommentar" }))).not.toHaveCount(0)
  })
})

test.describe("PROJ-12 — Bezug SEND ↔ REPLY", () => {
  for (const [field, change] of [
    ["modelic", (b: string) => b.replace("<modelic>PHUNGUN</modelic>", "<modelic>ANDERES</modelic>")],
    ["sendid", (b: string) => b.replace("<sendid>D0815</sendid>", "<sendid>D0816</sendid>")],
    ["dmltype", (b: string) => b.replace('<dmltype type="c"/>', '<dmltype type="s"/>')],
    ["diyear", (b: string) => b.replace("<diyear>2026</diyear>", "<diyear>2025</diyear>")],
    ["seqnum", (b: string) => b.replace("<seqnum>00002</seqnum>", "<seqnum>00003</seqnum>")],
  ] as const) {
    test(`abweichendes ${field} im dmlref → „REPLY bezieht sich nicht auf den letzten SEND 00002-2026“, keine Übernahme`, async ({ page }) => {
      await startAs(page, "Anna Bearbeitung")
      const xml = withDmlref(change)
      expect(xml).not.toBe(demoReply)
      const dialog = await uploadReply(page, xml)
      await expect(dialog.getByText("REPLY bezieht sich nicht auf den letzten SEND 00002-2026.").first()).toBeVisible()
      await expect(dialog.getByRole("button", { name: "Übernehmen" })).toHaveCount(0)
      const data = await readDataset(page)
      expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-phungun").status).toBe("gesendet")
    })
  }

  test("eigene seqnum des REPLY (00007) ist unabhängig: übernommen, eigener Versionsindex, dem SEND zugeordnet", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    const xml = demoReply.replace(/(<dmlc>[\s\S]*?<seqnum>)00002(<\/seqnum>)/, "$100007$2")
    expect(xml).not.toBe(demoReply)
    const dialog = await uploadReply(page, xml, "DML-PHUNGUN-C1234-C-2026-00007_001-00.XML")
    await expect(dialog.getByLabel("REPLY")).toContainText("REPLY C1234 00007-2026 auf SEND 00002-2026")
    await dialog.getByRole("button", { name: "Übernehmen" }).click()
    await expect(dialog).toBeHidden()
    const data = await readDataset(page)
    const reply = data.archive.at(-1)
    const send2 = data.archive.filter((a: { direction: string }) => a.direction === "send").at(-1)
    expect(reply).toMatchObject({ direction: "reply", versionIndex: "00007-2026", sendArchiveId: send2.id })
    expect(reply.dmlref.dmlc).toEqual(send2.dmlc)
    expect(data.history.at(-1).details).toMatch(/^REPLY 00007-2026 von C1234 Partner Systemtechnik GmbH übernommen/)
    await page.goto("/dmrl/dmrl-phungun/archiv")
    await expect(page.getByText("00007-2026").first()).toBeVisible()
  })
})

test.describe("PROJ-13 — answer_timestamp", () => {
  test("nach dem REPLY: Spalte in Ansicht, CSV-Export und Check-out mit Zeitpunkt; XML-Export ohne Zeitpunkt (XSD gültig)", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    const before = Date.now()
    const dialog = await uploadReply(page, demoReply)
    await dialog.getByRole("button", { name: "Übernehmen" }).click()
    await expect(dialog).toBeHidden()

    const data = await readDataset(page)
    const stamp: string = data.entries.find((e: { dmrlId: string }) => e.dmrlId === "dmrl-phungun").fields.answer_timestamp
    expect(stamp).toMatch(STAMP)
    // Ortszeit des Browsers = Ortszeit dieses Rechners → innerhalb von 2 Minuten um den Klick
    expect(Math.abs(new Date(stamp).getTime() - before)).toBeLessThan(120_000)

    const csv = await exportAs(page, "CSV")
    const { header, values } = csvColumn(csv.content, "answer_timestamp")
    expect(header).toHaveLength(28)
    expect(header[header.indexOf("answer_comment") + 1]).toBe("answer_timestamp")
    expect(values).toHaveLength(32)
    expect(new Set(values)).toEqual(new Set([stamp]))

    const xml = await exportAs(page, "XML")
    expect(xml.content).not.toContain("answer_timestamp")
    expect(xml.content).not.toContain(stamp.slice(11))

    await toolbar(page).getByRole("button", { name: "Check-out" }).click()
    const checkout = await download(page, () => page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click())
    expect(new Set(csvColumn(checkout.content, "answer_timestamp").values)).toEqual(new Set([stamp]))
  })

  test("abgebrochener REPLY setzt keinen Zeitpunkt", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    const dialog = await uploadReply(page, demoReply)
    await dialog.getByRole("button", { name: "Abbrechen" }).click()
    await expect(dialog).toBeHidden()
    const data = await readDataset(page)
    expect(data.entries.filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-phungun").every((e: { fields: { answer_timestamp?: string } }) => !e.fields.answer_timestamp)).toBe(true)
    await expect(page.getByRole("columnheader", { name: "Antwort übernommen" })).toBeVisible()
  })
})

test.describe("PROJ-10 — answer_timestamp beim Check-in", () => {
  async function checkOutVehicle(page: Page) {
    await page.goto("/dmrl/dmrl-gtfdemo")
    await toolbar(page).getByRole("button", { name: "Check-out" }).click()
    return download(page, () => page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click())
  }
  async function checkIn(page: Page, name: string, csv: string, takeAnswers: boolean) {
    await toolbar(page).getByRole("button", { name: "Check-in" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("CSV-Datei für den Check-in").setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(csv) })
    if (takeAnswers) await dialog.getByRole("checkbox", { name: "Antworten aus der Datei übernehmen" }).click()
    await dialog.getByRole("button", { name: "Übernehmen" }).click()
    await expect(dialog).toBeHidden()
  }
  /** Zelle der ersten Datenzeile setzen */
  const setCell = (csv: string, column: string, value: string) => {
    const lines = csv.split("\r\n")
    const index = lines[0].replace(/^﻿/, "").split(";").indexOf(column)
    const cells = lines[1].split(";")
    cells[index] = value
    lines[1] = cells.join(";")
    return lines.join("\r\n")
  }

  test("Antworten übernehmen → Zeitpunkt des Check-ins; Wert aus der Datei wird ignoriert", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    const file = await checkOutVehicle(page)
    const csv = setCell(setCell(file.content, "answer", "y"), "answer_timestamp", "1999-01-01T00:00:00")
    const before = Date.now()
    await checkIn(page, file.name, csv, true)
    const data = await readDataset(page)
    const taken = data.entries.find((e: { dmrlId: string; fields: { answer: string } }) => e.dmrlId === "dmrl-gtfdemo" && e.fields.answer === "y")
    expect(taken.fields.answer_timestamp).toMatch(STAMP)
    expect(taken.fields.answer_timestamp).not.toBe("1999-01-01T00:00:00")
    expect(Math.abs(new Date(taken.fields.answer_timestamp).getTime() - before)).toBeLessThan(120_000)
    const [, y, m, d, hh, mm] = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(taken.fields.answer_timestamp)!
    await expect(page.getByRole("cell", { name: `${d}.${m}.${y} ${hh}:${mm}` })).toHaveCount(1)
  })

  test("nur answer_timestamp geändert, ohne Übernahme → Check-in ohne Änderung, Wert bleibt leer", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    const file = await checkOutVehicle(page)
    await checkIn(page, file.name, setCell(file.content, "answer_timestamp", "1999-01-01T00:00:00"), false)
    const data = await readDataset(page)
    expect(data.history.at(-1).details).toBe("Check-in — 0 neu, 0 geändert, 10 unverändert")
    expect(data.entries.filter((e: { dmrlId: string }) => e.dmrlId === "dmrl-gtfdemo").every((e: { fields: { answer_timestamp: string } }) => e.fields.answer_timestamp === "")).toBe(true)
  })

  test("alte CSV mit 27 Spalten (ohne answer_timestamp) wird angenommen", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter")
    const file = await checkOutVehicle(page)
    const lines = file.content.split("\r\n")
    const column = lines[0].replace(/^﻿/, "").split(";").indexOf("answer_timestamp")
    const legacy = lines.map((l) => (l === "" ? l : l.split(";").filter((_, i) => i !== column).join(";"))).join("\r\n")
    expect(legacy.split("\r\n")[0].split(";")).toHaveLength(27)
    await checkIn(page, file.name, legacy, false)
    const data = await readDataset(page)
    expect(data.history.at(-1).details).toBe("Check-in — 0 neu, 0 geändert, 10 unverändert")
    expect(data.dmrls.find((d: { id: string }) => d.id === "dmrl-gtfdemo").lock).toBeNull()
  })

  test("375 px: Ansicht mit neuer Spalte ohne waagerechtes Scrollen der Seite", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await startAs(page, "Anna Bearbeitung")
    await page.goto("/dmrl/dmrl-phungun")
    await expect(page.getByRole("columnheader", { name: "Antwort übernommen" })).toBeAttached()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
