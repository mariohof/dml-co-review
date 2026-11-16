import { describe, expect, it, vi } from "vitest"

import { errorCount, hintCount } from "@/lib/rules/check/types"
import { acceptXmlUpload, unavailableDetail, validateXml, xsdFailTitle, xsdResultToReport } from "./client"
import { MAX_XML_BYTES, type XsdResult } from "./types"

const respond = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }))

describe("validateXml", () => {
  it("sendet die XML mit Issue an die Serverfunktion und liefert das Ergebnis", async () => {
    const fetchImpl = respond({ state: "gueltig", issue: "2.3" })
    expect(await validateXml("<dml/>", "2.3", { fetchImpl })).toEqual({ state: "gueltig", issue: "2.3" })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe("/api/xsd-pruefung?issue=2.3")
    expect(init?.method).toBe("POST")
    expect(await (init?.body as Blob).text()).toBe("<dml/>")
  })

  it("ergibt „nicht verfügbar\" bei Netzfehler, Fehlerantwort (404), unerwarteter Antwort und Zeitlimit", async () => {
    expect(await validateXml("<dml/>", "4.2", { fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")) })).toEqual({
      state: "nicht_verfuegbar",
      reason: "nicht_erreichbar",
    })
    expect(await validateXml("<dml/>", "4.2", { fetchImpl: respond("Not found", 404) })).toMatchObject({ reason: "unerwartet" })
    expect(await validateXml("<dml/>", "4.2", { fetchImpl: respond({ state: "irgendwas" }) })).toMatchObject({ reason: "unerwartet" })
    const hanging = vi.fn<typeof fetch>((_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("abort", "AbortError"))))
    )
    expect(await validateXml("<dml/>", "5.0", { fetchImpl: hanging, timeoutMs: 10 })).toEqual({ state: "nicht_verfuegbar", reason: "zeitlimit" })
  })

  it("Zugriff abgelehnt (fremde Adresse, Antwort 403): eigener Grund mit Adresse samt Port der aktuellen Seite", async () => {
    const result = await validateXml("<dml/>", "2.3", { fetchImpl: respond({ error: "Anfrage nicht erlaubt." }, 403) })
    expect(result).toEqual({ state: "nicht_verfuegbar", reason: "zugriff_abgelehnt" })
    const port = window.location.port
    expect(unavailableDetail("zugriff_abgelehnt")).toBe(`Zugriff abgelehnt — bitte die Anwendung über http://localhost${port ? `:${port}` : ""} öffnen.`)
    expect(unavailableDetail("nicht_erreichbar")).toContain("Der Server der Anwendung läuft nicht")
    expect(unavailableDetail("nicht_erreichbar")).toContain("START-HIER.md")
  })

  it("übernimmt „nicht verfügbar\" der Serverfunktion (z. B. xmllint fehlt)", async () => {
    const result = await validateXml("<dml/>", "2.3", { fetchImpl: respond({ state: "nicht_verfuegbar", reason: "programm_fehlt" }, 503) })
    expect(result).toEqual({ state: "nicht_verfuegbar", reason: "programm_fehlt" })
  })

  it("lehnt Dateien über 5 MB vor dem Senden ab", async () => {
    const fetchImpl = respond({})
    await expect(validateXml(new Blob([new Uint8Array(MAX_XML_BYTES + 1)]), "2.3", { fetchImpl })).rejects.toThrow("Datei zu groß")
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe("Prüfbericht", () => {
  const schemaErrors: XsdResult = {
    state: "schemafehler",
    issue: "2.3",
    findings: [
      { line: 12, message: "Element 'dmentry': Missing child element(s). Expected is ( addresdm )." },
      { line: 40, message: "Element 'dmentry': This element is not expected." },
    ],
  }

  it("Schemafehler: deutsche Überschrift mit Anzahl, Zeile und Originalmeldung je Fehler", () => {
    expect(xsdFailTitle(schemaErrors)).toBe("Die Datei entspricht nicht dem Schema S1000D Issue 2.3 (dml.xsd) — 2 Fehler")
    const report = xsdResultToReport(schemaErrors)
    expect(report.lineLabel).toBe("Zeile")
    expect(report.findings).toEqual([
      { severity: "fehler", group: "XSD", line: 12, message: schemaErrors.findings[0].message },
      { severity: "fehler", group: "XSD", line: 40, message: schemaErrors.findings[1].message },
    ])
  })

  it("nicht wohlgeformt: ein Fehler „Die Datei ist kein gültiges XML (Zeile X)\", Folgemeldungen als Hinweise", () => {
    const report = xsdResultToReport({
      state: "nicht_wohlgeformt",
      issue: "2.3",
      findings: [
        { line: 7, message: "Opening and ending tag mismatch: dmentry line 3 and dml" },
        { line: 8, message: "EndTag: '</' not found" },
      ],
    })
    expect(errorCount(report)).toBe(1)
    expect(hintCount(report)).toBe(1)
    expect(report.findings[0].message).toBe("Die Datei ist kein gültiges XML (Zeile 7) — Opening and ending tag mismatch: dmentry line 3 and dml")
  })

  it("bestanden: Hinweis mit Issue, keine Befunde", () => {
    expect(xsdFailTitle({ state: "gueltig", issue: "5.0" })).toBe("XSD-Prüfung bestanden (S1000D Issue 5.0)")
    expect(xsdResultToReport({ state: "gueltig", issue: "5.0" }).findings).toEqual([])
  })
})

describe("Dateiannahme REPLY", () => {
  it("nimmt .xml/.XML bis 5 MB an", () => {
    expect(acceptXmlUpload(new File(["<dml/>"], "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML")).ok).toBe(true)
    expect(acceptXmlUpload(new File(["<dml/>"], "antwort.xml")).ok).toBe(true)
  })

  it("lehnt andere Dateitypen, leere und zu große Dateien ab", () => {
    expect(acceptXmlUpload(new File(["x"], "antwort.csv"))).toEqual({ ok: false, message: "Bitte eine XML-Datei auswählen." })
    expect(acceptXmlUpload(new File([], "leer.xml"))).toEqual({ ok: false, message: "Die Datei ist leer." })
    expect(acceptXmlUpload(new File([new Uint8Array(MAX_XML_BYTES + 1)], "gross.xml"))).toEqual({
      ok: false,
      message: "Datei zu groß (höchstens 5 MB).",
    })
  })
})
