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

/** Demo-Datenbestand mit Fahrzeug-DMRL, ausgecheckt von Ben */
function setupCheckedOut() {
  window.localStorage.clear()
  const demo = buildDemoDataset()
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
      rows[0].fields.dmentryType = "c"
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(vehicle(stored()).lock).not.toBeNull()
  })
})
