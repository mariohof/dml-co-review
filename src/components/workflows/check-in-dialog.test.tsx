import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { DmrlView } from "@/components/dmrl/dmrl-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import type { Dataset, EntrySnapshot, User } from "@/lib/data/schema"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { executeCheckOut } from "@/lib/workflows/check-out"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

function View() {
  const { data } = useDataStore()
  return <DmrlView dmrl={data.dmrls.find((d) => d.id === DEMO_IDS.dmrlVehicle)!} />
}

const stored = () => {
  const result = loadDataset()
  if (result.kind !== "ok") throw new Error("ungültig")
  return result.data
}
const vehicle = (data: Dataset) => data.dmrls.find((d) => d.id === DEMO_IDS.dmrlVehicle)!

/** Demo-Datenbestand mit Fahrzeug-DMRL, ausgecheckt von Ben; optional erster Eintrag vorher freigegeben (ohne Eintragstyp) */
function setupCheckedOut(firstReleased = false) {
  window.localStorage.clear()
  const original = buildDemoDataset()
  const firstId = original.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)!.id
  const demo: Dataset = firstReleased
    ? {
        ...original,
        entries: original.entries.map((e) =>
          e.id === firstId ? { ...e, status: "freigegeben", fields: { ...e.fields, dmentryType: "", answer: "y" } } : e
        ),
      }
    : original
  const result = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, demo.users.find((u) => u.id === DEMO_IDS.editorBen) as User)
  if (!result.ok) throw new Error(result.message)
  saveDataset(result.data)
  return result.data
}

function renderAs(userId: string) {
  saveSessionUserId(userId)
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <View />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

const toolbar = () => screen.getByRole("toolbar", { name: "Aktionen" })

async function openAndUpload(content: string, name = "DML-GTFDEMO-D0815-C-2026.csv") {
  fireEvent.click(within(toolbar()).getByRole("button", { name: "Check-in" }))
  const dialog = await screen.findByRole("dialog")
  fireEvent.change(within(dialog).getByLabelText("CSV-Datei für den Check-in"), {
    target: { files: [new File([content], name)] },
  })
  return dialog
}

const csvOf = (data: Dataset, change?: (rows: EntrySnapshot[]) => EntrySnapshot[]) => {
  const rows = structuredClone(vehicle(data).lock!.entries)
  return writeEntriesCsv(change ? change(rows) : rows)
}

describe("Check-in in der DMRL-Ansicht", () => {
  let data: Dataset
  beforeEach(() => {
    data = setupCheckedOut()
  })

  it("nur der Sperrinhaber sieht „Check-in\"", () => {
    const view = renderAs(DEMO_IDS.editorAnna)
    expect(within(toolbar()).queryByRole("button", { name: "Check-in" })).toBeNull()
    view.unmount()
    renderAs(DEMO_IDS.editorBen)
    expect(within(toolbar()).getByRole("button", { name: "Check-in" })).toBeEnabled()
  })

  it("geänderte Datei: Zusammenfassung mit alt → neu, Übernehmen hebt die Sperre auf", async () => {
    renderAs(DEMO_IDS.editorBen)
    const csv = csvOf(data, (rows) => {
      rows[0].fields.remarks = "Neue Bemerkung"
      Object.assign(rows[0].fields, { dmentryType: "c", type: "changed" })
      return rows
    })
    const dialog = await openAndUpload(csv)
    const summary = await within(dialog).findByLabelText("Zusammenfassung")
    expect(within(summary).getByText("geändert").nextSibling).toHaveTextContent("1")
    expect(within(summary).getByText("unverändert").nextSibling).toHaveTextContent("9")
    expect(within(dialog).getByText("Geänderte Einträge (1)")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: /GTFDEMO-/ }))
    expect(within(dialog).getByText("Neue Bemerkung")).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Übernehmen" }))
    await waitFor(() => expect(vehicle(stored()).lock).toBeNull())
    expect(vehicle(stored()).status).toBe("in_bearbeitung")
    expect(stored().entries.some((e) => e.fields.remarks === "Neue Bemerkung")).toBe(true)
    expect(stored().history.at(-1)?.details).toBe("Check-in — 0 neu, 1 geändert, 9 unverändert")
  })

  it("fehlerhafte Datei: Prüfbericht, keine Übernahme, Sperre bleibt, Ablehnung im Verlauf", async () => {
    renderAs(DEMO_IDS.editorBen)
    const dialog = await openAndUpload(csvOf(data, (rows) => rows.slice(1)))
    expect(await within(dialog).findByText("Check-in nicht möglich")).toBeInTheDocument()
    expect(within(dialog).queryByRole("button", { name: "Übernehmen" })).toBeNull()
    await waitFor(() => expect(stored().history.at(-1)?.action).toBe("check_in_abgelehnt"))
    expect(vehicle(stored()).lock).not.toBeNull()
    expect(stored().entries).toEqual(data.entries)

    fireEvent.click(within(dialog).getByRole("button", { name: "Andere Datei wählen" }))
    expect(within(dialog).getByRole("button", { name: "Datei auswählen" })).toBeInTheDocument()
  })

  it("falscher Dateityp: Meldung im Auswahlschritt, kein Verlaufseintrag", async () => {
    renderAs(DEMO_IDS.editorBen)
    const historyBefore = stored().history.length
    const dialog = await openAndUpload("x", "liste.xlsx")
    expect(await within(dialog).findByText("Bitte eine CSV-Datei auswählen.")).toBeInTheDocument()
    expect(stored().history).toHaveLength(historyBefore)
  })

  it("Abbrechen nach der Prüfung ändert nichts", async () => {
    renderAs(DEMO_IDS.editorBen)
    const dialog = await openAndUpload(csvOf(data))
    expect(await within(dialog).findByText(/Keine Änderungen/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/Abweichende Empfängerantworten/)).toBeNull()
    expect(within(dialog).queryByLabelText("Antworten aus der Datei übernehmen")).toBeNull()
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(vehicle(stored()).lock).not.toBeNull()
  })

  describe("Abweichende Empfängerantworten (Refinement 2026-11-14)", () => {
    const tile = (summary: HTMLElement, label: string) => within(summary).getByText(label).nextSibling

    it("Abschnitt mit alt → neu, Häkchen standardmäßig aus, Zahlen schalten um; Übernahme mit Häkchen speichert die Antworten", async () => {
      renderAs(DEMO_IDS.editorBen)
      const csv = csvOf(data, (rows) => {
        Object.assign(rows[0].fields, { answer: "n", answer_comment: "Empfänger lehnt ab" }) // Eintragstyp n bleibt
        return rows
      })
      const dialog = await openAndUpload(csv)
      expect(await within(dialog).findByText("Abweichende Empfängerantworten (1 Eintrag)")).toBeInTheDocument()
      expect(within(dialog).getByText(/Nur Information — freigegeben wird ein Eintrag weiterhin nur durch einen REPLY/)).toBeInTheDocument()
      const checkbox = within(dialog).getByRole("checkbox", { name: "Antworten aus der Datei übernehmen" })
      expect(checkbox).not.toBeChecked()
      const summary = within(dialog).getByLabelText("Zusammenfassung")
      expect(tile(summary, "geändert")).toHaveTextContent("0")
      expect(tile(summary, "unverändert")).toHaveTextContent("10")

      fireEvent.click(within(dialog).getByRole("button", { name: /GTFDEMO-.*abgelehnt \(n\)/ }))
      expect(within(dialog).getByText("Empfänger lehnt ab")).toBeInTheDocument()

      fireEvent.click(checkbox)
      expect(tile(summary, "geändert")).toHaveTextContent("1")
      expect(tile(summary, "unverändert")).toHaveTextContent("9")

      fireEvent.click(within(dialog).getByRole("button", { name: "Übernehmen" }))
      await waitFor(() => expect(vehicle(stored()).lock).toBeNull())
      expect(stored().entries.find((e) => e.fields.answer_comment === "Empfänger lehnt ab")?.status).toBe("in_bearbeitung")
      expect(stored().history.at(-1)?.details).toBe("Check-in — 0 neu, 1 geändert, 9 unverändert; 1 Antworten aus der Datei übernommen")
    })

    it("ohne Häkchen bleiben die bisherigen Antworten", async () => {
      renderAs(DEMO_IDS.editorBen)
      const dialog = await openAndUpload(csvOf(data, (rows) => {
        rows[0].fields.answer_comment = "nicht übernehmen"
        return rows
      }))
      fireEvent.click(await within(dialog).findByRole("button", { name: "Übernehmen" }))
      await waitFor(() => expect(vehicle(stored()).lock).toBeNull())
      expect(stored().entries.some((e) => e.fields.answer_comment === "nicht übernehmen")).toBe(false)
      expect(stored().history.at(-1)?.details).toBe("Check-in — 0 neu, 0 geändert, 10 unverändert")
    })

    it("Eintrag ohne Eintragstyp: Häkchen sperrt „Übernehmen\" mit Meldung, ohne Häkchen wieder möglich", async () => {
      data = setupCheckedOut(true)
      renderAs(DEMO_IDS.editorBen)
      const dialog = await openAndUpload(csvOf(data, (rows) => {
        rows[0].fields.answer = "n"
        return rows
      }))
      const checkbox = await within(dialog).findByRole("checkbox", { name: "Antworten aus der Datei übernehmen" })
      const confirm = within(dialog).getByRole("button", { name: "Übernehmen" })
      expect(confirm).toBeEnabled()
      fireEvent.click(checkbox)
      expect(within(dialog).getByText("Übernehmen nicht möglich")).toBeInTheDocument()
      expect(within(dialog).getByText(/Eintragstyp setzen \(n, c oder d\)/)).toBeInTheDocument()
      expect(confirm).toBeDisabled()
      fireEvent.click(checkbox)
      expect(within(dialog).queryByText("Übernehmen nicht möglich")).toBeNull()
      expect(confirm).toBeEnabled()
    })
  })
})
