import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { DmrlView } from "@/components/dmrl/dmrl-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { ENTRIES_SHEET_NAME } from "@/lib/files/entries-xlsx"
import { readXlsxSheet } from "@/lib/files/xlsx-reader"
import { XLSX_MIME_TYPE } from "@/lib/files/xlsx-writer"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
const download = vi.fn()
vi.mock("@/lib/files/download", () => ({ downloadBytes: (...args: unknown[]) => download(...args) }))

function View() {
  const { data } = useDataStore()
  return <DmrlView dmrl={data.dmrls.find((d) => d.id === DEMO_IDS.dmrlVehicle)!} />
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

const stored = () => {
  const result = loadDataset()
  if (result.kind !== "ok") throw new Error("ungültig")
  return result.data
}
const vehicleLock = () => stored().dmrls.find((d) => d.id === DEMO_IDS.dmrlVehicle)!.lock

const toolbar = () => screen.getByRole("toolbar", { name: "Aktionen" })

describe("Check-out in der DMRL-Ansicht", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
    download.mockClear()
  })

  it("Bestätigung → Sperre gespeichert → CSV heruntergeladen; Zurücknehmen hebt die Sperre auf", async () => {
    renderAs(DEMO_IDS.editorBen)
    fireEvent.click(within(toolbar()).getByRole("button", { name: "Check-out" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/^DML-GTFDEMO-D0815-C-\d{4}\.xlsx$/)).toBeInTheDocument()
    expect(within(dialog).getByText("Die DMRL wird für andere gesperrt, bis Sie sie wieder einchecken.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Auschecken" }))

    await waitFor(() => expect(vehicleLock()?.userId).toBe(DEMO_IDS.editorBen))
    expect(download).toHaveBeenCalledTimes(1)
    const [fileName, bytes, mime] = download.mock.calls[0]
    expect(fileName).toMatch(/^DML-GTFDEMO-D0815-C-\d{4}\.xlsx$/)
    expect(mime).toBe(XLSX_MIME_TYPE)
    const sheet = readXlsxSheet(bytes as Uint8Array, ENTRIES_SHEET_NAME)
    expect(sheet.ok && sheet.rows).toHaveLength(11)
    expect(screen.getByText(/Ausgecheckt von Ben Bearbeiter seit/)).toBeInTheDocument()

    // Excel-Datei erneut herunterladen: gleicher Name, gleicher Inhalt
    fireEvent.click(within(toolbar()).getByRole("button", { name: "Excel-Datei erneut herunterladen" }))
    expect(download.mock.calls[1][0]).toBe(fileName)
    expect(readXlsxSheet(download.mock.calls[1][1] as Uint8Array, ENTRIES_SHEET_NAME)).toEqual(sheet)

    fireEvent.click(within(toolbar()).getByRole("button", { name: "Check-out zurücknehmen" }))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Zurücknehmen" }))
    await waitFor(() => expect(vehicleLock()).toBeNull())
    expect(stored().entries).toEqual(buildDemoDataset().entries)
  })

  it("Abbrechen lädt nichts herunter und setzt keine Sperre", async () => {
    renderAs(DEMO_IDS.editorBen)
    fireEvent.click(within(toolbar()).getByRole("button", { name: "Check-out" }))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Abbrechen" }))
    expect(download).not.toHaveBeenCalled()
    expect(vehicleLock()).toBeNull()
  })

  it("anderer Benutzer sieht die Sperre und einen gesperrten Check-out; Administrator kann die Sperre aufheben", async () => {
    const view = renderAs(DEMO_IDS.editorBen)
    fireEvent.click(within(toolbar()).getByRole("button", { name: "Check-out" }))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Auschecken" }))
    await waitFor(() => expect(vehicleLock()).not.toBeNull())
    view.unmount()

    renderAs(DEMO_IDS.admin)
    expect(within(toolbar()).getByRole("button", { name: "Check-out" })).toBeDisabled()
    fireEvent.click(within(toolbar()).getByRole("button", { name: "Sperre aufheben" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/ausgecheckt von Ben Bearbeiter/)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Sperre aufheben" }))
    })
    await waitFor(() => expect(vehicleLock()).toBeNull())
    expect(stored().history.at(-1)?.details).toBe("Sperre aufgehoben durch Administrator (Sperrinhaber: Ben Bearbeiter)")
  })
})
