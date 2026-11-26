import { expect, test } from "@playwright/test"

import { bodyRows, freshStart, loginAs, readDataset, startAs } from "./helpers"

test.describe("PROJ-1 Datenhaltung + Demo-Daten", () => {
  test("Erststart: Demo-Datenbestand wird automatisch geladen und gespeichert", async ({ page }) => {
    await freshStart(page)
    const data = await readDataset(page)
    expect(data.formatVersion).toBe(2)
    expect(data.systems.map((s: { s1000dIssue: string }) => s.s1000dIssue)).toEqual(["2.3", "4.2", "5.0", "6.0"])
    expect(data.organisations.map((o: { code: string }) => o.code)).toEqual(["D0815", "C1234", "B6865"])
    expect(data.users.map((u: { name: string }) => u.name)).toEqual(["Administrator", "Anna Bearbeitung", "Ben Bearbeiter"])
  })

  test("PHUNGUN: 3 Archivstände, 32 gesendete Einträge, Versionsindex 00002-2026", async ({ page }) => {
    await startAs(page, "Administrator")
    const row = bodyRows(page).filter({ hasText: "PHUNGUN" })
    await expect(row).toContainText("00002-2026")
    await expect(row).toContainText("32")
    await expect(row).toContainText("Gesendet")
    const data = await readDataset(page)
    expect(data.archive.map((a: { direction: string; versionIndex: string }) => `${a.direction} ${a.versionIndex}`)).toEqual([
      "send 00001-2026",
      "reply 00001-2026",
      "send 00002-2026",
    ])
  })

  test("Fahrrad BIKE60 (6.0, PROJ-22) hat 12 Einträge in Bearbeitung", async ({ page }) => {
    await startAs(page, "Administrator")
    const row = bodyRows(page).filter({ hasText: "Fahrrad BIKE60" })
    await expect(row).toContainText("12")
    await expect(row).toContainText("In Bearbeitung")
  })

  test("Fahrzeug (4.2) und Fluggerät (5.0) haben je 10 Einträge in Bearbeitung", async ({ page }) => {
    await startAs(page, "Administrator")
    for (const name of ["Geschütztes Transportfahrzeug", "Transporthubschrauber"]) {
      const row = bodyRows(page).filter({ hasText: name })
      await expect(row).toContainText("10")
      await expect(row).toContainText("In Bearbeitung")
    }
  })

  test("Persistenz: Änderungen bleiben nach dem Neuladen erhalten, Demo-Daten werden nicht erneut geladen", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/organisationen")
    await page.getByRole("button", { name: "Organisation anlegen" }).click()
    await page.getByRole("dialog").getByLabel("CAGE-Code").fill("x0001")
    await page.getByRole("dialog").getByLabel("Name").fill("Persistenz Test GmbH")
    await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page).filter({ hasText: "X0001" })).toBeVisible()
    await page.reload()
    await expect(bodyRows(page).filter({ hasText: "Persistenz Test GmbH" })).toBeVisible()
  })

  test("Zurücksetzen: Bestätigungsdialog, Abbrechen ändert nichts, Bestätigen stellt den Ausgangszustand her", async ({ page }) => {
    await startAs(page, "Administrator")
    await page.goto("/verwaltung/organisationen")
    await page.getByRole("button", { name: "Organisation anlegen" }).click()
    await page.getByRole("dialog").getByLabel("CAGE-Code").fill("X0002")
    await page.getByRole("dialog").getByLabel("Name").fill("Wird zurückgesetzt")
    await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click()

    await page.goto("/verwaltung")
    await page.getByRole("button", { name: "Demo-Daten zurücksetzen" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("Alle Änderungen gehen verloren")
    await page.getByRole("button", { name: "Abbrechen" }).click()
    expect((await readDataset(page)).organisations).toHaveLength(4)

    await page.getByRole("button", { name: "Demo-Daten zurücksetzen" }).click()
    await page.getByRole("button", { name: "Zurücksetzen" }).click()
    await expect(page.getByText("Demo-Daten wurden zurückgesetzt.")).toBeVisible()
    expect((await readDataset(page)).organisations).toHaveLength(3)
    // Anmeldung bleibt erhalten
    await expect(page.getByRole("button", { name: /Benutzer: Administrator/ })).toBeVisible()
  })

  test("Bearbeiter sieht „Demo-Daten zurücksetzen\" nicht", async ({ page }) => {
    await startAs(page, "Anna Bearbeitung")
    await page.goto("/verwaltung")
    await expect(page.getByText("Keine Berechtigung", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Demo-Daten zurücksetzen" })).toHaveCount(0)
  })

  test("Beschädigte Daten: verständlicher Hinweis und „Demo-Daten neu laden\" statt Absturz", async ({ page }) => {
    await freshStart(page)
    await page.evaluate(() => window.localStorage.setItem("dmrl-ms:dataset", "{kaputt"))
    await page.reload()
    await expect(page.getByText("Daten können nicht geladen werden")).toBeVisible()
    await page.getByRole("button", { name: "Demo-Daten neu laden" }).click()
    await loginAs(page, "Administrator")
    await expect(bodyRows(page)).toHaveCount(4)
  })

  test("Daten einer älteren Prototyp-Version werden als inkompatibel erkannt", async ({ page }) => {
    await freshStart(page)
    await page.evaluate(() => {
      const data = JSON.parse(window.localStorage.getItem("dmrl-ms:dataset")!)
      data.formatVersion = 1
      window.localStorage.setItem("dmrl-ms:dataset", JSON.stringify(data))
    })
    await page.reload()
    await expect(page.getByText(/älteren, inkompatiblen Version/)).toBeVisible()
  })

  test("Demo-Dateien zum Hochladen sind im Browser abrufbar", async ({ request }) => {
    const reply = await request.get("/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")
    expect(reply.ok()).toBe(true)
    expect(await reply.text()).toContain('direction="reply"')
    expect((await request.get("/demo-dateien/LIESMICH.txt")).ok()).toBe(true)
  })
})
