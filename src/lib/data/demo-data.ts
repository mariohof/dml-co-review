import { deriveIssueType } from "@/lib/dmrl/issue-type"
import { DEMO_XML_FILES } from "./demo-xml.generated"
import { parseDml23 } from "./dml-parser-2-3"
import {
  DATA_FORMAT_VERSION,
  emptyEntryFields,
  versionIndexOf,
  type ArchiveEntry,
  type Dataset,
  type DmlHeader,
  type DmrlEntry,
  type HistoryEntry,
} from "./schema"

/**
 * Erzeugt den Demo-Ausgangszustand (PROJ-1).
 * - PHUNGUN (Issue 2.3): Austauschkette aus den drei Beispiel-XMLs, Einträge aus SEND 00002
 * - Geschütztes Transportfahrzeug (4.2) und Transporthubschrauber (5.0): je 10 fest hinterlegte,
 *   regelkonforme Einträge (PROJ-8), kein Archiv, kein Verlauf
 */

export const DEMO_FILES = {
  send1: "DML-PHUNGUN-D0815-C-2026-00001_001-00.XML",
  reply1: "DML-PHUNGUN-C1234-C-2026-00001-001-00.XML",
  send2: "DML-PHUNGUN-D0815-C-2026-00002_001-00.XML",
} as const

export const DEMO_IDS = {
  orgOriginator: "org-d0815",
  orgPartner: "org-c1234",
  admin: "user-admin",
  editorAnna: "user-anna-bearbeitung",
  editorBen: "user-ben-bearbeiter",
  sysPhungun: "sys-phungun",
  sysVehicle: "sys-gtfdemo",
  sysAircraft: "sys-thsdemo",
  dmrlPhungun: "dmrl-phungun",
  dmrlVehicle: "dmrl-gtfdemo",
  dmrlAircraft: "dmrl-thsdemo",
  archiveSend1: "archive-phungun-send-00001-2026",
  archiveReply1: "archive-phungun-reply-c1234-00001-2026",
  archiveSend2: "archive-phungun-send-00002-2026",
} as const

/** Ausgabedatum der fest hinterlegten Demo-Einträge (Fahrzeug, Fluggerät) */
const FIXED_ENTRY_DATE = { day: "01", month: "11", year: "2026" }

/** Zeitpunkt aus dem Ausgabedatum einer DML-Datei (9:00 Uhr UTC) */
function timestampOf(header: DmlHeader): string {
  const { year, month, day } = header.issdate
  return `${year}-${month}-${day}T09:00:00.000Z`
}

function formatDate(header: DmlHeader): string {
  const { year, month, day } = header.issdate
  return `${day}.${month}.${year}`
}

type DemoRow = [
  chapnum: string,
  section: string,
  subsect: string,
  subject: string,
  discode: string,
  incode: string,
  techname: string,
  infoname: string,
]

function buildFixedEntries(dmrlId: string, prefix: string, modelic: string, rows: DemoRow[]): DmrlEntry[] {
  return rows.map(([chapnum, section, subsect, subject, discode, incode, techname, infoname], index) => ({
    id: `entry-${prefix}-${String(index + 1).padStart(3, "0")}`,
    dmrlId,
    status: "in_bearbeitung",
    fields: {
      ...emptyEntryFields(),
      dmentryType: "n",
      modelic,
      sdc: "A",
      chapnum,
      section,
      subsect,
      subject,
      discode,
      discodev: "A",
      incode,
      incodev: "A",
      itemloc: "A",
      techname,
      infoname,
      language: "de",
      country: "DE",
      security: "01",
      rpc: "D0815",
      issno: "001",
      type: "new",
      ...FIXED_ENTRY_DATE,
    },
  }))
}

// Gleiche SNS-Kombination ⇒ gleicher Tech Name; gleicher Infocode ⇒ gleicher Info Name (PROJ-8 E/I)
const VEHICLE_ROWS: DemoRow[] = [
  ["00", "0", "0", "00", "00", "001", "Geschütztes Transportfahrzeug", "Titelseite"],
  ["00", "0", "0", "00", "00", "018", "Geschütztes Transportfahrzeug", "Einführung"],
  ["00", "0", "0", "00", "00", "012", "Geschütztes Transportfahrzeug", "Sicherheitshinweise"],
  ["06", "0", "0", "00", "00", "040", "Abmessungen und Gewichte", "Beschreibung"],
  ["12", "1", "0", "00", "00", "200", "Betriebsstoffe", "Wartung, Auffüllen"],
  ["24", "0", "0", "00", "00", "040", "Bordnetz", "Beschreibung"],
  ["24", "3", "0", "00", "00", "520", "Fahrzeugbatterie", "Ausbau"],
  ["24", "3", "0", "00", "00", "720", "Fahrzeugbatterie", "Einbau"],
  ["32", "0", "0", "00", "00", "300", "Fahrwerk", "Prüfung"],
  ["32", "4", "1", "00", "00", "520", "Rad", "Ausbau"],
]

const AIRCRAFT_ROWS: DemoRow[] = [
  ["00", "0", "0", "00", "00", "001", "Transporthubschrauber", "Titelseite"],
  ["00", "0", "0", "00", "00", "018", "Transporthubschrauber", "Einführung"],
  ["05", "1", "0", "00", "00", "300", "Planmäßige Inspektion", "Prüfung"],
  ["12", "1", "0", "00", "00", "200", "Kraftstoffanlage", "Wartung, Auffüllen"],
  ["21", "0", "0", "00", "00", "040", "Klimaanlage", "Beschreibung"],
  ["28", "0", "0", "00", "00", "040", "Kraftstoffsystem", "Beschreibung"],
  ["32", "0", "0", "00", "00", "300", "Fahrwerk", "Prüfung"],
  ["63", "1", "0", "00", "00", "040", "Hauptrotorantrieb", "Beschreibung"],
  ["65", "2", "0", "00", "00", "520", "Heckrotorblatt", "Ausbau"],
  ["65", "2", "0", "00", "00", "720", "Heckrotorblatt", "Einbau"],
]

function demoFile(name: string): string {
  const content = DEMO_XML_FILES[name]
  if (!content) throw new Error(`Demo-Datei fehlt: ${name}`)
  return content
}

function buildPhungun(partnerLabel: string) {
  const send1 = parseDml23(demoFile(DEMO_FILES.send1))
  const reply1 = parseDml23(demoFile(DEMO_FILES.reply1))
  const send2 = parseDml23(demoFile(DEMO_FILES.send2))

  const approved = reply1.entries.filter((fields) => fields.answer === "y").length
  const rework = reply1.entries.filter((fields) => fields.answer === "n").length

  const archiveEntry = (
    archiveId: string,
    file: string,
    parsed: ReturnType<typeof parseDml23>,
    extra: Pick<ArchiveEntry, "sendArchiveId" | "replyCounts">
  ): ArchiveEntry => ({
    id: archiveId,
    dmrlId: DEMO_IDS.dmrlPhungun,
    direction: parsed.header.direction,
    dmlc: parsed.header.dmlc,
    versionIndex: versionIndexOf(parsed.header.dmlc),
    dmlref: parsed.header.dmlref,
    fileName: file,
    content: demoFile(file),
    createdAt: timestampOf(parsed.header),
    createdByUserId: DEMO_IDS.editorAnna,
    partnerOrganisationId: DEMO_IDS.orgPartner,
    withdrawn: null,
    ...extra,
  })

  const archive: ArchiveEntry[] = [
    archiveEntry(DEMO_IDS.archiveSend1, DEMO_FILES.send1, send1, { sendArchiveId: null, replyCounts: null }),
    archiveEntry(DEMO_IDS.archiveReply1, DEMO_FILES.reply1, reply1, {
      sendArchiveId: DEMO_IDS.archiveSend1,
      replyCounts: { approved, rework },
    }),
    archiveEntry(DEMO_IDS.archiveSend2, DEMO_FILES.send2, send2, { sendArchiveId: null, replyCounts: null }),
  ]

  // Aktueller Stand = SEND 00002; Einträge um Ausgabedaten ergänzt (Pflichtfelder PROJ-8)
  const entries: DmrlEntry[] = send2.entries.map((fields, index) => ({
    id: `entry-phungun-${String(index + 1).padStart(3, "0")}`,
    dmrlId: DEMO_IDS.dmrlPhungun,
    status: "gesendet",
    fields: {
      ...fields,
      issno: fields.issno || "001",
      type: fields.type || deriveIssueType(fields.dmentryType),
      day: fields.day || send2.header.issdate.day,
      month: fields.month || send2.header.issdate.month,
      year: fields.year || send2.header.issdate.year,
    },
  }))

  const history: HistoryEntry[] = [
    {
      id: "history-phungun-001",
      dmrlId: DEMO_IDS.dmrlPhungun,
      at: timestampOf(send1.header),
      userId: DEMO_IDS.editorAnna,
      action: "send",
      details: `SEND ${versionIndexOf(send1.header.dmlc)} an ${partnerLabel} (${formatDate(send1.header)})`,
    },
    {
      id: "history-phungun-002",
      dmrlId: DEMO_IDS.dmrlPhungun,
      at: timestampOf(reply1.header),
      userId: DEMO_IDS.editorAnna,
      action: "reply_uebernommen",
      details: `REPLY ${versionIndexOf(reply1.header.dmlc)} von ${partnerLabel} übernommen — ${approved} freigegeben, ${rework} zu überarbeiten`,
    },
    {
      id: "history-phungun-003",
      dmrlId: DEMO_IDS.dmrlPhungun,
      at: timestampOf(send2.header),
      userId: DEMO_IDS.editorAnna,
      action: "send",
      details: `SEND ${versionIndexOf(send2.header.dmlc)} an ${partnerLabel} (${formatDate(send2.header)})`,
    },
  ]

  return { entries, archive, history, security: send2.header.security || "01" }
}

export function buildDemoDataset(): Dataset {
  const partner = { id: DEMO_IDS.orgPartner, code: "C1234", name: "Partner Systemtechnik GmbH" }
  const phungun = buildPhungun(`${partner.code} ${partner.name}`)

  return {
    formatVersion: DATA_FORMAT_VERSION,
    organisations: [
      { id: DEMO_IDS.orgOriginator, code: "D0815", name: "Musterbehörde Technische Dokumentation" },
      partner,
    ],
    users: [
      { id: DEMO_IDS.admin, name: "Administrator", role: "administrator", active: true, isSystemAccount: true },
      { id: DEMO_IDS.editorAnna, name: "Anna Bearbeitung", role: "bearbeiter", active: true, isSystemAccount: false },
      { id: DEMO_IDS.editorBen, name: "Ben Bearbeiter", role: "bearbeiter", active: true, isSystemAccount: false },
    ],
    systems: [
      {
        id: DEMO_IDS.sysPhungun,
        name: "PHUNGUN",
        description: "Demo-System mit Austauschkette aus Beispieldateien (S1000D Issue 2.3)",
        s1000dIssue: "2.3",
        modelic: "PHUNGUN",
      },
      {
        id: DEMO_IDS.sysVehicle,
        name: "Geschütztes Transportfahrzeug",
        description: "Fiktives Demo-Fahrzeug (S1000D Issue 4.2)",
        s1000dIssue: "4.2",
        modelic: "GTFDEMO",
      },
      {
        id: DEMO_IDS.sysAircraft,
        name: "Transporthubschrauber",
        description: "Fiktives Demo-Fluggerät (S1000D Issue 5.0)",
        s1000dIssue: "5.0",
        modelic: "THSDEMO",
      },
    ],
    dmrls: [
      {
        id: DEMO_IDS.dmrlPhungun,
        systemId: DEMO_IDS.sysPhungun,
        originatorOrganisationId: DEMO_IDS.orgOriginator,
        dmlType: "c",
        security: phungun.security,
        // Vorgabe erster SEND passend zum Archiv (erster SEND 00001-2026); gesperrt, da SENDs existieren
        firstSendVersionIndex: "00001-2026",
        editorUserIds: [DEMO_IDS.editorAnna],
        status: "gesendet",
        partnerRemarks: "",
        release: null,
        lock: null,
      },
      {
        id: DEMO_IDS.dmrlVehicle,
        systemId: DEMO_IDS.sysVehicle,
        originatorOrganisationId: DEMO_IDS.orgOriginator,
        dmlType: "c",
        security: "01",
        firstSendVersionIndex: `00001-${new Date().getFullYear()}`,
        editorUserIds: [DEMO_IDS.editorAnna, DEMO_IDS.editorBen],
        status: "in_bearbeitung",
        partnerRemarks: "",
        release: null,
        lock: null,
      },
      {
        id: DEMO_IDS.dmrlAircraft,
        systemId: DEMO_IDS.sysAircraft,
        originatorOrganisationId: DEMO_IDS.orgOriginator,
        dmlType: "c",
        security: "01",
        firstSendVersionIndex: `00001-${new Date().getFullYear()}`,
        editorUserIds: [DEMO_IDS.editorBen],
        status: "in_bearbeitung",
        partnerRemarks: "",
        release: null,
        lock: null,
      },
    ],
    entries: [
      ...phungun.entries,
      ...buildFixedEntries(DEMO_IDS.dmrlVehicle, "gtfdemo", "GTFDEMO", VEHICLE_ROWS),
      ...buildFixedEntries(DEMO_IDS.dmrlAircraft, "thsdemo", "THSDEMO", AIRCRAFT_ROWS),
    ],
    archive: phungun.archive,
    releases: [],
    history: phungun.history,
  }
}
