import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { latestSend } from "@/lib/data/queries"
import type { Dataset, User } from "@/lib/data/schema"
import { saveDataset, saveSessionUserId } from "@/lib/data/storage"
import { checkReplyFile, executeReplyImport } from "@/lib/workflows/reply"
import type { XsdResult } from "@/lib/xsd/types"
import { DmrlView } from "./dmrl-view"
import { ReleaseSnapshotView } from "./release-snapshot-view"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }))
const download = vi.fn()
vi.mock("@/lib/files/download", () => ({ downloadTextFile: (...args: unknown[]) => download(...args) }))
const validate = vi.fn<() => Promise<XsdResult>>()
vi.mock("@/lib/xsd/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xsd/client")>()),
  validateXml: () => validate(),
}))

const ROOT = join(__dirname, "..", "..", "..")
const allApproved = readFileSync(join(ROOT, "public/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"), "utf8").replace(/answer="n"/g, 'answer="y"')

/** PHUNGUN, durch REPLY mit nur „y" freigegeben */
function releasedDataset(): Dataset {
  const demo = buildDemoDataset()
  const dmrl = demo.dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)!
  const result = checkReplyFile(demo, dmrl, allApproved)
  const anna = demo.users.find((u) => u.id === DEMO_IDS.editorAnna) as User
  const done = executeReplyImport(
    demo,
    DEMO_IDS.dmrlPhungun,
    anna,
    { fileName: "reply.XML", text: allApproved, result, sendArchiveId: latestSend(demo, DEMO_IDS.dmrlPhungun)!.id },
    "2026-11-12T10:00:00.000Z"
  )
  if (!done.ok) throw new Error(done.message)
  return done.data
}

function Page({ kind, snapshotId }: { kind: "view" | "snapshot"; snapshotId?: string }) {
  const { data } = useDataStore()
  const dmrl = data.dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)!
  return kind === "view" ? <DmrlView dmrl={dmrl} /> : <ReleaseSnapshotView dmrl={dmrl} snapshotId={snapshotId!} />
}

function renderPage(data: Dataset, kind: "view" | "snapshot", snapshotId?: string) {
  window.localStorage.clear()
  saveDataset(data)
  saveSessionUserId(DEMO_IDS.editorAnna)
  return render(
    <DataStoreProvider>
      <SessionProvider>
        <TooltipProvider>
          <Page kind={kind} snapshotId={snapshotId} />
        </TooltipProvider>
      </SessionProvider>
    </DataStoreProvider>
  )
}

describe("Freigabe im Kopfbereich", () => {
  it("freigegeben: Nachweis mit REPLY, Empfänger und Bearbeiter, Link zum Freigabestand", async () => {
    const data = releasedDataset()
    renderPage(data, "view")
    expect(await screen.findByText(/Freigegeben am 12\.11\.2026 durch REPLY C1234 00002-2026 — übernommen von Anna Bearbeitung/)).toBeInTheDocument()
    expect(screen.queryByText("Nicht freigegeben")).toBeNull()
    expect(screen.getByRole("link", { name: "Freigabestand anzeigen" })).toHaveAttribute(
      "href",
      `/dmrl/${DEMO_IDS.dmrlPhungun}/freigabestand/${data.releases[0].id}`
    )
  })

  it("nach Änderung: Banner „Nicht freigegeben\" + „Letzte Freigabe\" mit Link; nie freigegeben: nur Banner", async () => {
    const data = releasedDataset()
    data.dmrls = data.dmrls.map((d) => (d.id === DEMO_IDS.dmrlPhungun ? { ...d, status: "in_bearbeitung" } : d))
    const firstId = data.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)!.id
    data.entries = data.entries.map((e) => (e.id === firstId ? { ...e, status: "in_bearbeitung" } : e))
    const view = renderPage(data, "view")
    expect(await screen.findByText("Nicht freigegeben")).toBeInTheDocument()
    expect(screen.getByText("Letzte Freigabe: 12.11.2026, REPLY C1234 00002-2026")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Freigabestand anzeigen" })).toBeInTheDocument()
    view.unmount()

    renderPage(buildDemoDataset(), "view")
    expect(await screen.findByText("Nicht freigegeben")).toBeInTheDocument()
    expect(screen.queryByText(/Letzte Freigabe/)).toBeNull()
  })
})

describe("Seite Freigabestand", () => {
  beforeEach(() => {
    download.mockClear()
    validate.mockReset()
  })

  it("zeigt den gekennzeichneten Stand zum Zeitpunkt der Freigabe, nur lesend", async () => {
    const data = releasedDataset()
    const snapshotId = data.releases[0].id
    // aktueller Stand weicht ab — die Seite zeigt trotzdem den Freigabestand
    data.dmrls = data.dmrls.map((d) => (d.id === DEMO_IDS.dmrlPhungun ? { ...d, status: "in_bearbeitung" } : d))
    const firstId = data.entries.find((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)!.id
    data.entries = data.entries.map((e) =>
      e.id === firstId ? { ...e, status: "in_bearbeitung", fields: { ...e.fields, techname: "Aktuell geändert" } } : e
    )
    renderPage(data, "snapshot", snapshotId)
    expect(await screen.findByText(/^Freigabestand vom 12\.11\.2026, \d\d:\d\d \(REPLY C1234 00002-2026\)$/)).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Eintrag .* anzeigen$/ })).toHaveLength(32)
    expect(screen.queryByText("Aktuell geändert")).toBeNull()
    expect(screen.queryByRole("button", { name: /bearbeiten|löschen|Check-out/i })).toBeNull()
  })

  it("CSV-Export: Dateiname mit Datum der Freigabe, keine Sperre", async () => {
    const data = releasedDataset()
    renderPage(data, "snapshot", data.releases[0].id)
    fireEvent.click(await screen.findByRole("button", { name: "Als CSV exportieren" }))
    expect(download).toHaveBeenCalledWith("DML-PHUNGUN-D0815-C-Freigabe-2026-11-12.csv", expect.stringContaining("dmentryType;modelic"), "text/csv;charset=utf-8")
  })

  it("XML-Export: nach bestandener XSD-Prüfung Download; bei Fehler oder nicht verfügbar kein Download", async () => {
    const data = releasedDataset()
    renderPage(data, "snapshot", data.releases[0].id)
    validate.mockResolvedValueOnce({ state: "gueltig", issue: "2.3" })
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Als XML exportieren" }))
    })
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(download.mock.calls[0][0]).toBe("DML-PHUNGUN-D0815-C-Freigabe-2026-11-12.XML")
    expect(download.mock.calls[0][1]).toContain('<issno issno="000" inwork="01" type="new"/>')

    validate.mockResolvedValueOnce({ state: "nicht_verfuegbar", reason: "programm_fehlt" })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Als XML exportieren" }))
    })
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("XML-Export nicht möglich")).toBeInTheDocument()
    expect(within(dialog).getByText(/XSD-Prüfung nicht verfügbar/)).toBeInTheDocument()
    expect(download).toHaveBeenCalledTimes(1)
  })

  it("unbekannter Freigabestand: „Freigabestand nicht gefunden\"", async () => {
    renderPage(releasedDataset(), "snapshot", "gibt-es-nicht")
    expect(await screen.findByText("Freigabestand nicht gefunden")).toBeInTheDocument()
  })
})
