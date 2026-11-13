import { describe, expect, it } from "vitest"

import { reportFileName, reportToCsv, sortFindings } from "./report"
import type { Finding, Report } from "./types"

const findings: Finding[] = [
  { severity: "hinweis", group: "A", line: 3, field: "security", message: "Führende Nullen ergänzt" },
  { severity: "fehler", group: "F", line: 2, dmc: "X-1", message: "Neuer Eintrag muss Eintragstyp ‚n' haben." },
  { severity: "fehler", group: "B", line: 3, field: "rpc", message: "Pflichtfeld ist leer." },
]
const report: Report = { lineLabel: "Zeile", findings }

describe("Prüfbericht", () => {
  it("sortiert nach Zeile bzw. nach Regel", () => {
    expect(sortFindings(findings, "zeile").map((f) => f.line)).toEqual([2, 3, 3])
    expect(sortFindings(findings, "regel").map((f) => f.group)).toEqual(["A", "B", "F"])
  })

  it("erzeugt eine Excel-taugliche CSV mit BOM, Semikolon und allen Meldungen", () => {
    const csv = reportToCsv(report)
    expect(csv.startsWith("﻿Art;Zeile;DMC;Feld;Regel;Meldung\r\n")).toBe(true)
    expect(csv).toContain("Fehler;2;X-1;;Eintragstyp;Neuer Eintrag muss Eintragstyp ‚n' haben.")
    expect(csv.trim().split("\r\n")).toHaveLength(4)
  })

  it("bildet einen sicheren Dateinamen", () => {
    expect(reportFileName("Geschütztes Transportfahrzeug", new Date("2026-11-13T10:00:00Z"))).toBe(
      "Pruefbericht-Gesch-tztes-Transportfahrzeug-2026-11-13.csv"
    )
  })
})
