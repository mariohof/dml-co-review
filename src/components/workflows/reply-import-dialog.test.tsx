import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { DataStoreProvider, useDataStore } from "@/components/data/data-store-provider"
import { DmrlView } from "@/components/dmrl/dmrl-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { loadDataset, saveDataset, saveSessionUserId } from "@/lib/data/storage"
import type { XsdResult } from "@/lib/xsd/types"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }))
const validate = vi.fn<() => Promise<XsdResult>>()
vi.mock("@/lib/xsd/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xsd/client")>()),
  validateXml: () => validate(),
}))

const ROOT = join(__dirname, "..", "..", "..")
const demoFile = (name: string) => readFileSync(join(ROOT, "public/demo-dateien", name), "utf8")
const DEMO_REPLY = "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"

function View() {
  const { data } = useDataStore()
  return <DmrlView dmrl={data.dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)!} />
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
const phungun = () => stored().dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)!
const toolbar = () => screen.getByRole("toolbar", { name: "Aktionen" })

async function upload(content: string, name: string) {
  fireEvent.click(within(toolbar()).getByRole("button", { name: "REPLY importieren" }))
  const dialog = await screen.findByRole("dialog")
  await act(async () => {
    fireEvent.change(within(dialog).getByLabelText("XML-Datei für den REPLY-Import"), { target: { files: [new File([content], name)] } })
  })
  return dialog
}

describe("REPLY importieren", () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveDataset(buildDemoDataset())
    validate.mockReset()
    validate.mockResolvedValue({ state: "gueltig", issue: "2.3" })
  })

  it("Demo-REPLY: Zusammenfassung 30/2 mit abgelehnten Einträgen und Bemerkung → Übernehmen", async () => {
    renderAs(DEMO_IDS.editorAnna)
    const dialog = await upload(demoFile(DEMO_REPLY), DEMO_REPLY)
    const summary = await within(dialog).findByLabelText("Zusammenfassung")
    expect(within(summary).getByText("freigegeben").nextSibling).toHaveTextContent("30")
    expect(within(summary).getByText("zu überarbeiten").nextSibling).toHaveTextContent("2")
    expect(within(dialog).getByLabelText("REPLY")).toHaveTextContent("REPLY C1234 00002-2026 auf SEND 00002-2026")
    expect(within(dialog).getByLabelText("REPLY")).toHaveTextContent("C1234 Partner Systemtechnik GmbH")
    expect(within(dialog).getByText("Abgelehnte Einträge (2)")).toBeInTheDocument()
    expect(within(dialog).getByText("Infocode nicht im beauftragten Leistungsumfang")).toBeInTheDocument()
    expect(within(dialog).getByText("Bitte abgelehnte Einträge überarbeiten.")).toBeInTheDocument()
    expect(within(within(dialog).getByLabelText("REPLY")).getByText("In Bearbeitung")).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Übernehmen" }))
    await waitFor(() => expect(phungun().status).toBe("in_bearbeitung"))
    expect(stored().archive.at(-1)).toMatchObject({ direction: "reply", fileName: DEMO_REPLY, replyCounts: { approved: 30, rework: 2 } })
    expect(stored().archive.at(-1)?.content).toBe(demoFile(DEMO_REPLY))
    // Empfänger-Bemerkung erscheint in der Ansicht
    expect(await screen.findByText("Bitte abgelehnte Einträge überarbeiten.")).toBeInTheDocument()
  })

  it("alle genehmigt: künftig „Freigegeben\"; nach Übernahme Banner „Freigegeben\"", async () => {
    renderAs(DEMO_IDS.editorAnna)
    const dialog = await upload(demoFile(DEMO_REPLY).replace(/answer="n"/g, 'answer="y"'), DEMO_REPLY)
    expect(await within(dialog).findByText("Alle Einträge sind freigegeben.")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Übernehmen" }))
    await waitFor(() => expect(phungun().status).toBe("freigegeben"))
    expect(await screen.findByText(/Freigegeben am/)).toBeInTheDocument()
    expect(screen.queryByText("Nicht freigegeben")).toBeNull()
  })

  it("Regelwerk-Fehler (falscher Absender): Bericht, nichts übernommen, Ablehnung im Verlauf; andere Datei wählbar", async () => {
    renderAs(DEMO_IDS.editorAnna)
    const dialog = await upload(demoFile("TEST-4_Falscher-Absender.XML"), "TEST-4_Falscher-Absender.XML")
    expect(await within(dialog).findByText("REPLY kann nicht übernommen werden")).toBeInTheDocument()
    expect(within(dialog).getByText("XSD-Prüfung bestanden (S1000D Issue 2.3)")).toBeInTheDocument()
    expect(within(dialog).getByText("REPLY stammt nicht vom Empfänger C1234 (Absender ‚C9999').")).toBeInTheDocument()
    expect(phungun().status).toBe("gesendet")
    expect(stored().history.at(-1)).toMatchObject({ action: "reply_abgelehnt" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Andere Datei wählen" }))
    expect(within(dialog).getByRole("button", { name: "Datei auswählen" })).toBeInTheDocument()
  })

  it("XSD-Fehler: XSD-Bericht, Regelwerk läuft nicht; nicht verfügbar: blockiert ohne Verlauf", async () => {
    validate.mockResolvedValueOnce({ state: "schemafehler", issue: "2.3", findings: [{ line: 28, message: "Element 'dmtitle': This element is not expected." }] })
    renderAs(DEMO_IDS.editorAnna)
    const dialog = await upload(demoFile("TEST-1_Pflichtelement-fehlt.XML"), "TEST-1.XML")
    expect(await within(dialog).findByText("Die Datei entspricht nicht dem Schema S1000D Issue 2.3 (dml.xsd) — 1 Fehler")).toBeInTheDocument()
    expect(within(dialog).queryByText("REPLY kann nicht übernommen werden")).toBeNull()
    expect(stored().history.at(-1)?.details).toBe("REPLY „TEST-1.XML\" abgelehnt — XSD-Prüfung, 1 Fehler")

    const historyBefore = stored().history.length
    validate.mockResolvedValueOnce({ state: "nicht_verfuegbar", reason: "programm_fehlt" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Andere Datei wählen" }))
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText("XML-Datei für den REPLY-Import"), { target: { files: [new File([demoFile(DEMO_REPLY)], DEMO_REPLY)] } })
    })
    expect(await within(dialog).findByText("Das Programm xmllint wurde nicht gefunden.")).toBeInTheDocument()
    expect(stored().history).toHaveLength(historyBefore)
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Erneut versuchen" }))
    })
    expect(await within(dialog).findByLabelText("Zusammenfassung")).toBeInTheDocument()
  })

  it("falscher Dateityp; Abbrechen in der Zusammenfassung ändert nichts", async () => {
    renderAs(DEMO_IDS.editorAnna)
    const dialog = await upload("x", "antwort.csv")
    expect(await within(dialog).findByText("Bitte eine XML-Datei auswählen.")).toBeInTheDocument()
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText("XML-Datei für den REPLY-Import"), { target: { files: [new File([demoFile(DEMO_REPLY)], DEMO_REPLY)] } })
    })
    await within(dialog).findByLabelText("Zusammenfassung")
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(phungun().status).toBe("gesendet")
    expect(stored().archive.filter((a) => a.direction === "reply")).toHaveLength(1)
  })
})
