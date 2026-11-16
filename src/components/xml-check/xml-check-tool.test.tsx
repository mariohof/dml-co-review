import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEMO_FILES } from "@/lib/data/demo-data"
import { DEMO_XML_FILES } from "@/lib/data/demo-xml.generated"
import type { XsdResult } from "@/lib/xsd/types"
import { XmlCheckTool } from "./xml-check-tool"

const validate = vi.fn<() => Promise<XsdResult>>()
vi.mock("@/lib/xsd/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xsd/client")>()),
  validateXml: () => validate(),
}))
const download = vi.fn()
vi.mock("@/lib/files/download", () => ({ downloadTextFile: (...args: unknown[]) => download(...args) }))

const SEND_NAME = DEMO_FILES.send2
const SEND = DEMO_XML_FILES[SEND_NAME]

function chooseIssue(issue: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "S1000D-Issue" }))
  fireEvent.click(screen.getByRole("option", { name: `Issue ${issue}` }))
}

async function chooseFile(content: BlobPart, name: string) {
  await act(async () => {
    fireEvent.change(screen.getByLabelText("XML-Datei zur Prüfung"), { target: { files: [new File([content], name)] } })
  })
}

async function check() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Prüfen" }))
  })
}

describe("XML prüfen (PROJ-20)", () => {
  beforeEach(() => {
    validate.mockReset()
    validate.mockResolvedValue({ state: "gueltig", issue: "2.3" })
    download.mockClear()
    window.localStorage.clear()
  })

  it("ohne Issue ist „Prüfen“ gesperrt und ein Hinweis fordert zur Auswahl auf", async () => {
    render(<XmlCheckTool />)
    await chooseFile(SEND, SEND_NAME)
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeDisabled()
    expect(screen.getByText("Bitte zuerst die S1000D-Issue der Datei wählen.")).toBeInTheDocument()
  })

  it("weist Nicht-XML-Dateien mit Meldung ab", async () => {
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile("a;b", "daten.csv")
    expect(screen.getByText("Bitte eine XML-Datei auswählen.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeDisabled()
  })

  it("Demo-SEND: Zusammenfassung, Hinweis „Ausgabedaten ergänzt“, CSV ohne Warnung mit Namen der XML-Datei; nichts gespeichert", async () => {
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    const summary = await screen.findByLabelText("Zusammenfassung")
    expect(within(summary).getByText("DML-PHUNGUN-D0815-C-2026-00002")).toBeInTheDocument()
    expect(within(summary).getByText("PHUNGUN")).toBeInTheDocument()
    expect(within(summary).getByText("SEND")).toBeInTheDocument()
    expect(screen.getByText("0 Fehler, 1 Hinweis")).toBeInTheDocument()
    expect(screen.getAllByText(/Einträgen fehlten Ausgabedaten — in der CSV ergänzt: Ausgabenummer 001, Ausgabetyp new/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/ein Check-in wird abgewiesen, bis sie behoben sind/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "CSV herunterladen" }))
    const [fileName, csv] = download.mock.calls[0]
    expect(fileName).toBe("DML-PHUNGUN-D0815-C-2026-00002_001-00.csv")
    expect(csv).toMatch(/^﻿dmentryType;modelic/)
    expect(csv).toMatch(/;001;new;\d{2};\d{2};\d{4};/)
    fireEvent.click(screen.getByRole("button", { name: "Prüfbericht herunterladen" }))
    expect(download.mock.calls[1][0]).toMatch(/^Pruefbericht-XML-DML-PHUNGUN-D0815-C-2026-00002_001-00-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(window.localStorage.length).toBe(0)
  })

  it("nicht wohlgeformt: Bericht, keine CSV", async () => {
    validate.mockResolvedValue({ state: "nicht_wohlgeformt", issue: "2.3", findings: [{ line: 4, message: "Premature end of data" }] })
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile("<dml>", "kaputt.xml")
    await check()
    expect(await screen.findByText("Keine CSV — die Datei kann nicht gelesen werden.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "CSV herunterladen" })).not.toBeInTheDocument()
    expect(screen.getByText(/Die Datei ist kein gültiges XML \(Zeile 4\)/)).toBeInTheDocument()
  })

  it("XSD nicht verfügbar: deutlicher Hinweis, CSV mit Warnung", async () => {
    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "programm_fehlt" })
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    expect((await screen.findAllByRole("alert")).some((a) => a.textContent?.startsWith("XSD-Prüfung nicht durchgeführt"))).toBe(true)
    expect(screen.getByRole("button", { name: "CSV herunterladen" })).toBeInTheDocument()
  })

  it("Server läuft nicht: Ursache mit Handlungsanweisung; „Erneut prüfen“ behält das Ergebnis und ersetzt es durch das neue", async () => {
    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "nicht_erreichbar" })
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    expect((await screen.findAllByText(/Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten/)).length).toBeGreaterThan(0)
    let resolve: (value: XsdResult) => void = () => {}
    validate.mockImplementation(() => new Promise((r) => (resolve = r)))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }))
    })
    // während der Wiederholung: bisheriges Ergebnis sichtbar, Schaltflächen gesperrt
    expect(screen.getByLabelText("Zusammenfassung")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Erneut prüfen" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeDisabled()
    await act(async () => {
      resolve({ state: "gueltig", issue: "2.3" })
    })
    expect(screen.queryByText(/XSD-Prüfung nicht durchgeführt/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Erneut prüfen" })).not.toBeInTheDocument()
    expect(validate).toHaveBeenCalledTimes(2)
  })

  it("Erneut prüfen, dann andere Issue: Wiederholung wird verworfen", async () => {
    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "zugriff_abgelehnt" })
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    expect((await screen.findAllByText(/Zugriff abgelehnt — bitte die Anwendung über http:\/\/localhost/)).length).toBeGreaterThan(0)
    let resolve: (value: XsdResult) => void = () => {}
    validate.mockImplementation(() => new Promise((r) => (resolve = r)))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }))
    })
    chooseIssue("4.2")
    await act(async () => {
      resolve({ state: "gueltig", issue: "2.3" })
    })
    expect(screen.queryByLabelText("Zusammenfassung")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeEnabled()
  })

  it("neue Datei während der Prüfung: veraltetes Ergebnis wird verworfen", async () => {
    let resolve: (value: XsdResult) => void = () => {}
    validate.mockImplementation(() => new Promise((r) => (resolve = r)))
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    expect(screen.getByRole("status")).toHaveTextContent("Prüfe Schema")
    // während die Prüfung läuft, wird eine andere Datei gewählt
    await chooseFile(SEND, "andere.xml")
    await act(async () => {
      resolve({ state: "gueltig", issue: "2.3" })
    })
    expect(screen.queryByLabelText("Zusammenfassung")).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    // neue Prüfung liefert das Ergebnis der neuen Datei
    validate.mockResolvedValue({ state: "gueltig", issue: "2.3" })
    await check()
    expect(await screen.findByLabelText("Zusammenfassung")).toHaveTextContent("andere.xml")
  })

  it("QA: Erneut prüfen scheitert wieder → Hinweis bleibt, Schaltfläche wieder nutzbar, Ursache aktualisiert", async () => {
    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "nicht_erreichbar" })
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "zugriff_abgelehnt" })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }))
    })
    expect((await screen.findAllByText(/Zugriff abgelehnt/)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Der Server der Anwendung läuft nicht/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Erneut prüfen" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeEnabled()
  })

  it("QA: Erneut prüfen liefert Schemafehler → Ergebnis wird durch den Bericht mit XSD-Fehlern ersetzt", async () => {
    validate.mockResolvedValue({ state: "nicht_verfuegbar", reason: "nicht_erreichbar" })
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    validate.mockResolvedValue({ state: "schemafehler", issue: "2.3", findings: [{ line: 7, message: "Element 'x': This element is not expected." }] })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erneut prüfen" }))
    })
    expect(await screen.findByText("1 Fehler, 1 Hinweis")).toBeInTheDocument()
    expect(screen.queryByText(/XSD-Prüfung nicht durchgeführt/)).not.toBeInTheDocument()
    expect(screen.getByText(/ein Check-in wird abgewiesen, bis sie behoben sind/)).toBeInTheDocument()
  })

  it("QA: kein „Erneut prüfen“, wenn die XSD-Prüfung durchgeführt wurde", async () => {
    render(<XmlCheckTool />)
    chooseIssue("2.3")
    await chooseFile(SEND, SEND_NAME)
    await check()
    await screen.findByLabelText("Zusammenfassung")
    expect(screen.queryByRole("button", { name: "Erneut prüfen" })).not.toBeInTheDocument()
  })
})

