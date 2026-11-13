import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { XsdCheckPanel, xsdPassed } from "./xsd-check-panel"

describe("XSD-Prüfanzeige", () => {
  it("zeigt den Fortschritt", () => {
    render(<XsdCheckPanel state={{ kind: "laeuft", issue: "4.2" }} subject="GTFDEMO" />)
    expect(screen.getByRole("status")).toHaveTextContent("Schemaprüfung läuft (S1000D Issue 4.2) …")
  })

  it("zeigt „bestanden\" mit Issue", () => {
    render(<XsdCheckPanel state={{ kind: "ergebnis", result: { state: "gueltig", issue: "2.3" } }} subject="PHUNGUN" />)
    expect(screen.getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeInTheDocument()
  })

  it("zeigt den Prüfbericht mit Überschrift, Zeile, Originalmeldung und Download", () => {
    render(
      <XsdCheckPanel
        state={{ kind: "ergebnis", result: { state: "schemafehler", issue: "2.3", findings: [{ line: 12, message: "Element 'dmentry': Missing child element(s)." }] } }}
        subject="PHUNGUN"
      />
    )
    expect(screen.getByText("Die Datei entspricht nicht dem Schema S1000D Issue 2.3 (dml.xsd) — 1 Fehler")).toBeInTheDocument()
    expect(screen.getByText("Element 'dmentry': Missing child element(s).")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bericht herunterladen" })).toBeInTheDocument()
  })

  it("zeigt „nicht verfügbar\" mit Grund und ohne Möglichkeit fortzufahren", () => {
    render(<XsdCheckPanel state={{ kind: "ergebnis", result: { state: "nicht_verfuegbar", reason: "programm_fehlt" } }} subject="PHUNGUN" />)
    expect(screen.getByRole("alert")).toHaveTextContent(/XSD-Prüfung nicht verfügbar.*Bitte Administrator informieren/)
    expect(screen.getByText("Das Programm xmllint wurde nicht gefunden.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("lässt den Vorgang nur bei bestandener Prüfung weiterlaufen", () => {
    expect(xsdPassed({ kind: "ergebnis", result: { state: "gueltig", issue: "2.3" } })).toBe(true)
    expect(xsdPassed({ kind: "ergebnis", result: { state: "nicht_verfuegbar", reason: "zeitlimit" } })).toBe(false)
    expect(xsdPassed({ kind: "laeuft", issue: "2.3" })).toBe(false)
    expect(xsdPassed(null)).toBe(false)
  })
})
