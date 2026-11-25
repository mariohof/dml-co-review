import { readFileSync } from "node:fs"
import { join } from "node:path"
import { strFromU8, unzipSync } from "fflate"
import { expect, test, type Page } from "@playwright/test"

import { readDataset, startAs } from "./helpers"

/** QA PROJ-7 bis PROJ-19: Zugriff auf Unterseiten, XSS, Responsive, Speicherkapazität */

const DEMO = join(__dirname, "..", "public", "demo-dateien")
const DEMO_REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"

async function importReply(page: Page, xml: string) {
  await page.goto("/dmrl/dmrl-phungun")
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "REPLY", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("XML-Datei für den REPLY-Import").setInputFiles({ name: DEMO_REPLY, mimeType: "application/xml", buffer: Buffer.from(xml) })
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
}

test.describe("Zugriff", () => {
  test("PROJ-7: unbekannte DMRL → „DMRL nicht gefunden“ mit Link zum Dashboard", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/dmrl/gibt-es-nicht")
    await expect(page.getByText("DMRL nicht gefunden")).toBeVisible()
    await expect(page.getByRole("link", { name: "Zum Dashboard" })).toBeVisible()
  })

  test("ohne Berechtigung: Ansicht, Archiv, archivierter Stand und Freigabestand gesperrt", async ({ page }) => {
    await startAs(page, "Ben Bearbeiter") // nicht berechtigt für PHUNGUN
    for (const path of [
      "/dmrl/dmrl-phungun",
      "/dmrl/dmrl-phungun/archiv",
      "/dmrl/dmrl-phungun/archiv/archive-phungun-send-00001-2026",
      "/dmrl/dmrl-phungun/freigabestand/irgendwas",
    ]) {
      await page.goto(path)
      await expect(page.getByText("Keine Berechtigung", { exact: true }), path).toBeVisible()
    }
  })
})

test("XSS: Empfänger-Bemerkung mit HTML wird als Text angezeigt (Ansicht, REPLY-Dialog, Archiv)", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  let dialogOpened = false
  page.on("dialog", (d) => {
    dialogOpened = true
    void d.dismiss()
  })
  const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script>'
  const escaped = payload.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  const xml = readFileSync(join(DEMO, DEMO_REPLY), "utf8").replace("Bitte abgelehnte Einträge überarbeiten.", escaped)
  await importReply(page, xml)
  await expect(page.getByText(payload).first()).toBeVisible()
  await page.goto("/dmrl/dmrl-phungun/archiv")
  await page.getByRole("link", { name: "REPLY 00002-2026 anzeigen" }).click()
  await expect(page.getByText(payload)).toBeVisible()
  expect(dialogOpened).toBe(false)
  expect(await page.locator("img[src='x']").count()).toBe(0)
})

test.describe("Responsive 375 px — Workflow-Seiten ohne waagerechtes Scrollen der Seite", () => {
  test("DMRL-Ansicht, Archiv (alle Karten), archivierter Stand, Freigabestand, Dialoge", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await startAs(page, "Anna Bearbeitung")
    const noOverflow = async (name: string) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, name).toBeLessThanOrEqual(1)
    }
    await importReply(page, readFileSync(join(DEMO, DEMO_REPLY), "utf8").replace(/answer="n"/g, 'answer="y"'))
    await noOverflow("DMRL-Ansicht")
    await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Exportieren" }).click()
    await noOverflow("Export-Menü")
    await page.keyboard.press("Escape")
    for (const tab of ["austausch", "freigaben", "verlauf"]) {
      await page.goto(`/dmrl/dmrl-phungun/archiv?ansicht=${tab}`)
      await expect(page.getByRole("tab", { selected: true })).toBeVisible()
      await noOverflow(`Archiv ${tab}`)
    }
    await page.goto("/dmrl/dmrl-phungun/archiv/archive-phungun-reply-c1234-00001-2026")
    await expect(page.getByRole("heading", { name: /REPLY C1234/ })).toBeVisible()
    await noOverflow("archivierter Stand")
    const data = await readDataset(page)
    await page.goto(`/dmrl/dmrl-phungun/freigabestand/${data.releases[0].id}`)
    await expect(page.getByText(/^Freigabestand vom/)).toBeVisible()
    await noOverflow("Freigabestand")
    await page.goto("/dmrl/dmrl-gtfdemo")
    await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "SEND" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await noOverflow("SEND-Dialog")
  })
})

test("Speicherkapazität des Browsers (Messung für BUG-QA2-2)", async ({ page }) => {
  await startAs(page, "Administrator")
  const capacity = await page.evaluate(() => {
    const key = "qa-kapazitaet"
    let low = 0
    let high = 20_000_000
    while (high - low > 50_000) {
      const mid = Math.floor((low + high) / 2)
      try {
        localStorage.setItem(key, "x".repeat(mid))
        low = mid
      } catch {
        high = mid
      }
    }
    localStorage.removeItem(key)
    const used = Object.keys(localStorage).reduce((sum, k) => sum + k.length + (localStorage.getItem(k)?.length ?? 0), 0)
    return { freeChars: low, usedChars: used }
  })
  test.info().annotations.push({ type: "Kapazität", description: JSON.stringify(capacity) })
  console.log("Speicherkapazität:", JSON.stringify(capacity))
  expect(capacity.freeChars).toBeGreaterThan(1_000_000)
})

test("BUG-QA2-1: Formel aus REPLY steht in der Check-out-Excel-Datei als Text (keine Formel) und übersteht den Check-in unverändert", async ({ page }) => {
  await startAs(page, "Anna Bearbeitung")
  const formula = '=HYPERLINK("http://angreifer.example";"Details")'
  const xml = readFileSync(join(DEMO, DEMO_REPLY), "utf8").replace("Infocode nicht im beauftragten Leistungsumfang", formula.replace(/"/g, "&quot;"))
  await importReply(page, xml)

  // Check-out: Datei herunterladen
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-out" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("alertdialog").getByRole("button", { name: "Auschecken" }).click()
  const download = await downloadPromise
  const bytes = readFileSync((await download.path())!)
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  const sheet = strFromU8(unzipSync(new Uint8Array(bytes))["xl/worksheets/sheet1.xml"])
  // Textzelle (inlineStr), keine Formelzelle — Excel wertet sie nicht aus; kein Apostroph nötig (PROJ-9 Refinement 2026-11-25)
  expect(sheet).toContain('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK(&quot;http://angreifer.example&quot;;&quot;Details&quot;)</t>')
  expect(sheet).not.toContain("<f>")

  // dieselbe Datei unverändert einchecken
  await page.getByRole("toolbar", { name: "Aktionen" }).getByRole("button", { name: "Check-in" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Datei für den Check-in").setInputFiles({ name: download.suggestedFilename(), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: bytes })
  await expect(dialog.getByText(/Keine Änderungen/)).toBeVisible()
  await dialog.getByRole("button", { name: "Übernehmen" }).click()
  await expect(dialog).toBeHidden()
  const data = await readDataset(page)
  expect(data.entries.some((e: { fields: { answer_comment: string } }) => e.fields.answer_comment === formula)).toBe(true)
})
