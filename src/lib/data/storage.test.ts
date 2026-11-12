import { beforeEach, describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "./demo-data"
import { DATA_FORMAT_VERSION } from "./schema"
import {
  loadDataset,
  loadSessionUserId,
  saveDataset,
  saveSessionUserId,
  SESSION_KEY,
  STORAGE_KEY,
} from "./storage"

/** Einfacher Speicher für Tests; optional mit „Speicher voll" beim Schreiben */
function memoryStorage(failWith?: DOMException): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => {
      if (failWith) throw failWith
      map.set(key, value)
    },
  }
}

describe("Datenbestand laden/speichern", () => {
  let storage: Storage
  beforeEach(() => {
    storage = memoryStorage()
  })

  it("meldet „leer\", wenn nichts gespeichert ist", () => {
    expect(loadDataset(storage)).toEqual({ kind: "empty" })
  })

  it("speichert und lädt den Demo-Bestand unverändert", () => {
    const demo = buildDemoDataset()
    expect(saveDataset(demo, storage)).toEqual({ ok: true })
    expect(loadDataset(storage)).toEqual({ kind: "ok", data: demo })
  })

  it("erkennt kein gültiges JSON als beschädigt", () => {
    storage.setItem(STORAGE_KEY, "{kaputt")
    expect(loadDataset(storage)).toMatchObject({ kind: "invalid" })
  })

  it("erkennt Daten der alten Formatversion 1 als inkompatibel", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...buildDemoDataset(), formatVersion: 1 }))
    const result = loadDataset(storage)
    expect(result.kind).toBe("invalid")
    if (result.kind === "invalid") expect(result.reason).toContain("älteren, inkompatiblen Version")
  })

  it("erkennt eine kaputte Verknüpfung als beschädigt", () => {
    const demo = buildDemoDataset()
    demo.entries[0] = { ...demo.entries[0], dmrlId: "gibt-es-nicht" }
    storage.setItem(STORAGE_KEY, JSON.stringify(demo))
    const result = loadDataset(storage)
    expect(result.kind).toBe("invalid")
    if (result.kind === "invalid") expect(result.reason).toContain("beschädigt")
  })

  it("erkennt ein fehlendes Systemkonto als beschädigt", () => {
    const demo = buildDemoDataset()
    demo.users = demo.users.map((u) => ({ ...u, isSystemAccount: false }))
    storage.setItem(STORAGE_KEY, JSON.stringify(demo))
    expect(loadDataset(storage).kind).toBe("invalid")
  })

  it("erkennt einen Widerspruch zwischen DMRL-Status und Eintragsstatus als beschädigt", () => {
    const demo = buildDemoDataset()
    demo.dmrls = demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, status: "freigegeben" } : d))
    storage.setItem(STORAGE_KEY, JSON.stringify(demo))
    expect(loadDataset(storage).kind).toBe("invalid")
  })

  it("lehnt eine Sicherheitseinstufung außerhalb 01–20 ab", () => {
    const demo = buildDemoDataset()
    demo.dmrls[0] = { ...demo.dmrls[0], security: "21" }
    storage.setItem(STORAGE_KEY, JSON.stringify(demo))
    expect(loadDataset(storage).kind).toBe("invalid")
  })

  it("meldet „Speicher voll\" und lässt den alten Stand unangetastet", () => {
    const full = memoryStorage(new DOMException("voll", "QuotaExceededError"))
    const result = saveDataset(buildDemoDataset(), full)
    expect(result).toMatchObject({ ok: false, reason: "quota" })
    expect(full.getItem(STORAGE_KEY)).toBeNull()
  })

  it("verwendet die aktuelle Formatversion", () => {
    expect(buildDemoDataset().formatVersion).toBe(DATA_FORMAT_VERSION)
    expect(DATA_FORMAT_VERSION).toBe(2)
  })
})

describe("Anmeldung (eigener Speicherbereich)", () => {
  it("speichert, lädt und entfernt die angemeldete Benutzer-ID", () => {
    const storage = memoryStorage()
    expect(loadSessionUserId(storage)).toBeNull()
    expect(saveSessionUserId("user-admin", storage)).toBe(true)
    expect(loadSessionUserId(storage)).toBe("user-admin")
    expect(saveSessionUserId(null, storage)).toBe(true)
    expect(loadSessionUserId(storage)).toBeNull()
  })

  it("ignoriert beschädigte Anmeldedaten", () => {
    const storage = memoryStorage()
    storage.setItem(SESSION_KEY, "{kaputt")
    expect(loadSessionUserId(storage)).toBeNull()
  })

  it("bleibt beim Speichern eines neuen Datenbestands erhalten", () => {
    const storage = memoryStorage()
    saveSessionUserId("user-admin", storage)
    saveDataset(buildDemoDataset(), storage)
    expect(loadSessionUserId(storage)).toBe("user-admin")
  })
})
