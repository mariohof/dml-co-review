import { expect, test } from "@playwright/test"

import { bodyRows, freshStart, loginAs, startAs } from "./helpers"

test.describe("Sicherheit (PROJ-1–6, 17)", () => {
  test("XSS: HTML/Script in Namen wird als Text angezeigt, nicht ausgeführt", async ({ page }) => {
    await startAs(page, "Administrator")
    let alerted = false
    page.on("dialog", async (dialog) => {
      alerted = true
      await dialog.dismiss()
    })
    await page.goto("/verwaltung/benutzer")
    await page.getByRole("button", { name: "Benutzer anlegen" }).click()
    const payload = `<img src=x onerror=alert(1)>`
    await page.getByRole("dialog").getByLabel("Name").fill(payload)
    await page.getByRole("dialog").getByLabel("Rolle").click()
    await page.getByRole("option", { name: "Bearbeiter" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click()
    await expect(bodyRows(page).filter({ hasText: payload })).toBeVisible()
    await page.goto("/anmelden?ziel=/")
    await page.waitForTimeout(300)
    expect(alerted).toBe(false)
  })

  test("Offene Weiterleitung: externe Ziele nach der Anmeldung werden ignoriert", async ({ page }) => {
    await freshStart(page)
    for (const target of ["//evil.example.com", "https://evil.example.com", "/anmelden"]) {
      await page.goto(`/anmelden?ziel=${encodeURIComponent(target)}`)
      await loginAs(page, "Administrator")
      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/)
      await page.getByRole("button", { name: /^Benutzer: / }).click()
      await page.getByRole("menuitem", { name: "Abmelden" }).click()
    }
  })

  test("Manipulierte Anmeldung mit unbekannter Benutzer-ID wird abgewiesen", async ({ page }) => {
    await freshStart(page)
    await page.evaluate(() => window.localStorage.setItem("dmrl-ms:session", JSON.stringify({ userId: "hacker" })))
    await page.goto("/verwaltung")
    await expect(page).toHaveURL(/\/anmelden/)
    await expect(page.getByText("Ihr Benutzer existiert nicht mehr.")).toBeVisible()
  })

  test("Keine Konsolenfehler beim normalen Arbeiten", async ({ page }) => {
    const errors: string[] = []
    // Bekannter Bug (Low): fehlendes favicon.ico → 404 wird hier ausgenommen
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.location().url.endsWith("/favicon.ico")) errors.push(msg.text())
    })
    page.on("pageerror", (err) => errors.push(err.message))
    await startAs(page, "Administrator")
    for (const path of ["/", "/verwaltung", "/verwaltung/benutzer", "/verwaltung/organisationen", "/verwaltung/systeme", "/verwaltung/dmrl", "/dmrl/dmrl-phungun"]) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
    }
    expect(errors).toEqual([])
  })
})

test.describe("Responsive (375 / 768 / 1440 px)", () => {
  for (const width of [375, 768, 1440]) {
    test(`kein horizontales Scrollen der Seite bei ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await freshStart(page)
      const check = async (name: string) => {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${name} bei ${width}px`).toBeLessThanOrEqual(1)
        await page.screenshot({ path: `test-results/screens/${width}-${name}.png`, fullPage: true })
      }
      await check("anmelden")
      await loginAs(page, "Administrator")
      await check("dashboard")
      for (const [name, path] of [
        ["benutzer", "/verwaltung/benutzer"],
        ["organisationen", "/verwaltung/organisationen"],
        ["systeme", "/verwaltung/systeme"],
        ["dmrl", "/verwaltung/dmrl"],
      ]) {
        await page.goto(path)
        await expect(page.locator("table")).toBeVisible()
        await check(name)
      }
    })
  }
})
