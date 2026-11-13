import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Finding } from "@/lib/rules/check/types"
import { CheckReportView } from "./check-report-view"

const download = vi.fn()
vi.mock("@/lib/files/download", () => ({ downloadTextFile: (...args: unknown[]) => download(...args) }))

const finding = (i: number, severity: Finding["severity"] = "fehler"): Finding => ({
  severity,
  group: i % 2 ? "A" : "F",
  line: i,
  dmc: `X-${i}`,
  message: `Meldung ${i}`,
})

describe("Prüfbericht-Anzeige", () => {
  it("zeigt Fehler mit Zeile, DMC, Regel und Meldung und lädt den Bericht herunter", () => {
    render(<CheckReportView subject="PHUNGUN" report={{ lineLabel: "Zeile", findings: [finding(2), finding(1, "hinweis")] }} />)
    expect(screen.getByText("Prüfung nicht bestanden")).toBeInTheDocument()
    expect(screen.getByText("1 Fehler · 1 Hinweis. Die Datei wird nicht übernommen.")).toBeInTheDocument()
    const rows = screen.getAllByRole("row").slice(1)
    expect(within(rows[0]).getByText("Meldung 1")).toBeInTheDocument() // nach Zeile sortiert
    fireEvent.click(screen.getByRole("button", { name: "Bericht herunterladen" }))
    expect(download).toHaveBeenCalledWith(expect.stringMatching(/^Pruefbericht-PHUNGUN-\d{4}-\d{2}-\d{2}\.csv$/), expect.stringContaining("Meldung 2"), "text/csv;charset=utf-8")
  })

  it("zeigt „Prüfung bestanden\" ohne Fehler", () => {
    render(<CheckReportView subject="X" report={{ lineLabel: "Eintrag", findings: [] }} />)
    expect(screen.getByText("Prüfung bestanden")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("kürzt mehr als 100 Meldungen in der Anzeige", () => {
    const many = Array.from({ length: 130 }, (_, i) => finding(i + 1))
    render(<CheckReportView subject="X" report={{ lineLabel: "Zeile", findings: many }} />)
    expect(screen.getAllByRole("row")).toHaveLength(101)
    expect(screen.getByText(/und 30 weitere — der Download enthält alle 130 Meldungen/)).toBeInTheDocument()
  })
})
