# PROJ-1: Datenhaltung (JSON/localStorage) + Demo-Daten

## Status: Planned
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

## Dependencies
- None (Basis für alle weiteren Features)

## Referenzen
- `docs/dmrl-mapping.md` — Feldmapping CSV ↔ S1000D DML (Issue 2.3), Kopfdaten, Beispieldateien
- Beispieldateien PHUNGUN (Issue 2.3): `01_DML-PHUNGUN-D0815-C-2026-00001_001-00.XML`, `02_DML-PHUNGUN-C1234-C-2026-00001-001-00.XML`, `03_DML-PHUNGUN-D0815-C-2026-00002_001-00.XML`

## Beschreibung
Der Prototyp speichert alle Daten (Benutzer, Organisationen, Systeme, DMRLs, DMRL-Einträge, Archivstände) dauerhaft im Browser (localStorage, JSON). Beim ersten Start wird ein vordefinierter Demo-Datenbestand geladen, der alle drei S1000D-Versionen abdeckt und eine bereits laufende SEND/REPLY-Kette enthält. Der Administrator kann den Demo-Ausgangszustand jederzeit wiederherstellen.

## Datenobjekte (fachlich)

### Organisation
- Code (z. B. `D0815`, `C1234`) — entspricht `sendid` im DML-Code
- Name
- Art: eigene Organisation / Partner

### Benutzer (simuliert)
- Name
- Rolle: Administrator / Bearbeiter
- Organisation

### System
- Bezeichnung
- Systemart: Fahrzeug / Fluggerät / Schiff / Gerät
- S1000D-Issue: 2.3 / 4.2 / 5.0
- Model Ident Code (`modelic`)

### DMRL
- Bezeichnung
- System (→ S1000D-Issue)
- Sender-Organisation (eigene) und Partner-Organisation
- Zuständige Bearbeiter
- Statusdaten laut `docs/dmrl-mapping.md`: `dmlc` (modelic, sendid, dmltype, diyear, seqnum), `issno` (issno, inwork, type), `issdate`, `security`, `dmlref`, `remarks`
- Aktueller Versionsindex `NNNNN-JJJJ` (= `seqnum-diyear` des letzten SEND)
- DMRL-Status: *in Bearbeitung* / *gesendet* / *freigegeben*
- Sperre: ausgecheckt ja/nein, von wem, seit wann

### DMRL-Eintrag
- Alle CSV-Felder laut `docs/dmrl-mapping.md` (für alle S1000D-Versionen identisch): dmentryType, modelic, sdc, chapnum, section, subsect, subject, discode, discodev, incode, incodev, itemloc, techname, infoname, language, country, security, rpc, issno, type, day, month, year, answer, answer_comment
- Zusätzlich: `rpcname` (Firmenname zu `rpc`) und `remarks` (Bemerkung zum Eintrag, getrennt von `answer_comment`)
- Eintragsstatus: *in Bearbeitung* / *gesendet* / *freigegeben* / *zu überarbeiten*

### Archivstand
- Richtung: SEND / REPLY
- DML-Code (`dmlc`) und Versionsindex
- Verweis (`dmlref`) auf die vorherige DMRL der Austauschkette
- Dateiname und unveränderter Original-Dateiinhalt (XML)
- Zeitpunkt und auslösender Benutzer

## Demo-Datenbestand

| Objekt | Inhalt |
|--------|--------|
| Organisationen | `D0815` – eigene Organisation (neutraler Name); `C1234` – Partner (neutraler Name) |
| Benutzer | 1 Administrator, 2 Bearbeiter (alle Organisation D0815) |
| System 1 | PHUNGUN — Gerät — Issue 2.3 |
| System 2 | Fiktives Fahrzeug — Issue 4.2 |
| System 3 | Fiktives Fluggerät — Issue 5.0 |
| DMRL PHUNGUN | Austauschkette aus den 3 Beispieldateien im Archiv (SEND 00001-2026 → REPLY C1234 00001-2026 → SEND 00002-2026); aktueller Stand = SEND 00002-2026 (11 Einträge `d`, 21 Einträge `n`), DMRL-Status *gesendet* |
| DMRL Fahrzeug | ca. 10 Einträge, Status *in Bearbeitung*, kein Archiv |
| DMRL Fluggerät | ca. 10 Einträge, Status *in Bearbeitung*, kein Archiv |

Firmennamen aus den Originaldateien (`rpcname`) werden in den Demo-Daten durch neutrale Namen ersetzt.

## User Stories
- Als **Product Owner** möchte ich, dass der Prototyp beim ersten Start sofort mit realistischen Demo-Daten befüllt ist, damit ich ohne Vorbereitung alle Workflows vorführen kann.
- Als **Product Owner** möchte ich Systeme in allen drei S1000D-Versionen (2.3, 4.2, 5.0) vorfinden, damit ich die Versionsunterschiede demonstrieren kann.
- Als **Bearbeiter** möchte ich, dass meine Änderungen nach einem Neuladen der Seite erhalten bleiben, damit ich über mehrere Sitzungen hinweg arbeiten kann.
- Als **Administrator** möchte ich die Demo-Daten auf den Ausgangszustand zurücksetzen, damit eine Demo beliebig oft wiederholt werden kann.
- Als **Bearbeiter** möchte ich, dass die bisherige SEND/REPLY-Kette der Demo-DMRL im Archiv vorhanden ist, damit ich den Austauschverlauf nachvollziehen kann.
- Als **Benutzer** möchte ich bei beschädigten Daten einen verständlichen Hinweis statt eines Absturzes bekommen, damit ich die Anwendung wieder nutzbar machen kann.

## Out of Scope
- Echte Datenbank / Backend / Synchronisation zwischen Browsern oder Geräten (PRD Non-Goal)
- Echte Anmeldung — Benutzerauswahl und Rollenwechsel → PROJ-2
- Pflegemasken für Benutzer, Organisationen, Systeme, DMRLs → PROJ-3 bis PROJ-6
- Anzeige der DMRL und ihrer Einträge → PROJ-7
- Prüfregeln, Check-out/Check-in, SEND/REPLY-Logik, Freigabelogik → PROJ-8 bis PROJ-14
- Archiv-Ansicht und Download → PROJ-15
- XML-Mapping für Issue 4.2 und 5.0 → PROJ-12 / PROJ-13
- Export/Import des gesamten Datenbestands (Backup)
- Mehrere Demo-Szenarien zur Auswahl

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Erststart & Demo-Daten
- [ ] Angenommen im Browser sind keine Anwendungsdaten gespeichert, wenn die Anwendung erstmals geöffnet wird, dann wird der Demo-Datenbestand automatisch geladen und gespeichert
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Daten betrachtet werden, dann existieren genau 3 Systeme mit den S1000D-Issues 2.3, 4.2 und 5.0
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Daten betrachtet werden, dann existieren die Organisationen D0815 (eigene) und C1234 (Partner) sowie 1 Administrator und 2 Bearbeiter
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL des Systems PHUNGUN betrachtet wird, dann enthält ihr Archiv 3 Stände in der Reihenfolge SEND 00001-2026, REPLY C1234 00001-2026, SEND 00002-2026 mit unverändertem Original-XML-Inhalt
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL des Systems PHUNGUN betrachtet wird, dann hat sie den Versionsindex 00002-2026, den Status *gesendet* und 32 Einträge (11 mit Typ `d`, 21 mit Typ `n`) im Status *gesendet*
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRLs des Fahrzeugs (4.2) und des Fluggeräts (5.0) betrachtet werden, dann haben sie je ca. 10 Einträge im Status *in Bearbeitung* und kein Archiv
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn nach Firmennamen aus den Originaldateien gesucht wird, dann sind diese durch neutrale Namen ersetzt
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Archivstände betrachtet werden, dann verweist jeder `dmlref` auf die unmittelbar vorherige DMRL der Austauschkette (initialer SEND: auf sich selbst)

### Persistenz
- [ ] Angenommen ein Benutzer hat Daten geändert, wenn die Seite neu geladen oder der Browser neu gestartet wird, dann sind die Änderungen weiterhin vorhanden
- [ ] Angenommen gespeicherte Daten existieren, wenn die Anwendung geöffnet wird, dann werden die Demo-Daten nicht erneut geladen und die vorhandenen Daten nicht überschrieben
- [ ] Angenommen ein DMRL-Eintrag wird gespeichert, wenn er wieder geladen wird, dann sind alle CSV-Felder inkl. `rpcname` und `remarks` unverändert und unabhängig von der S1000D-Version identisch benannt

### Zurücksetzen
- [ ] Angenommen der aktive Benutzer ist Administrator, wenn er „Demo-Daten zurücksetzen" wählt, dann erscheint ein Bestätigungsdialog mit dem Hinweis, dass alle Änderungen verloren gehen
- [ ] Angenommen der Bestätigungsdialog ist geöffnet, wenn der Administrator bestätigt, dann wird der Demo-Ausgangszustand vollständig wiederhergestellt und eine Erfolgsmeldung angezeigt
- [ ] Angenommen der Bestätigungsdialog ist geöffnet, wenn der Administrator abbricht, dann bleiben alle Daten unverändert
- [ ] Angenommen der aktive Benutzer ist Bearbeiter, wenn er die Anwendung nutzt, dann ist die Funktion „Demo-Daten zurücksetzen" nicht sichtbar

### Fehlerfälle
- [ ] Angenommen die gespeicherten Daten sind beschädigt oder unvollständig, wenn die Anwendung startet, dann erscheint ein verständlicher Hinweis mit der Option, die Demo-Daten neu zu laden, und die Anwendung stürzt nicht ab
- [ ] Angenommen der Browser-Speicher ist voll, wenn Daten gespeichert werden sollen, dann erscheint eine klare Fehlermeldung und der letzte gültige Datenstand bleibt erhalten
- [ ] Angenommen die gespeicherten Daten stammen aus einer älteren, inkompatiblen Prototyp-Version, wenn die Anwendung startet, dann wird dies erkannt und wie beschädigte Daten behandelt

## Edge Cases
- **Zweiter Browser-Tab:** Änderungen in Tab A sind in Tab B erst nach Neuladen sichtbar; gleichzeitiges Bearbeiten in zwei Tabs kann zu überschriebenen Daten führen (für Prototyp akzeptiert, siehe Decision Log).
- **Anderer Browser / anderes Gerät:** startet mit eigenem Demo-Datenbestand — Daten werden nicht geteilt.
- **Browserdaten gelöscht / privater Modus:** Anwendung startet wieder mit Demo-Daten.
- **Zurücksetzen während eine DMRL ausgecheckt ist:** Sperre wird mit aufgehoben, da der Ausgangszustand vollständig wiederhergestellt wird.
- **Leere Felder in Originaldateien** (z. B. leeres `answer/remarks`, fehlendes `issno/@type` in Datei 01): werden als leer gespeichert, nicht als Fehler.
- **Doppelte Leerzeichen in `techname`** (z. B. „Sonderfrist  Schaltschrank" in Datei 01/03, einfach in Datei 02): werden unverändert übernommen; Archiv-Inhalt bleibt byte-genau.

## Technical Requirements (optional)
- Datenhaltung ausschließlich im Browser (localStorage, JSON) — PRD-Constraint
- Datenstand muss versioniert sein, um inkompatible ältere Stände zu erkennen
- Archivierte Dateien werden unverändert (Original-Inhalt) gespeichert
- Browser: aktuelle Versionen von Chrome, Edge, Firefox, Safari

## Open Questions
- [ ] Mapping der Felder auf die XML-Struktur von Issue 4.2 und 5.0 (Schemas liefert Product Owner) — relevant für Demo-Einträge der Systeme 2 und 3 sowie PROJ-12/13
- [ ] Zulässige Werte für `dmltype/@type` (in Beispielen nur `c`)
- [ ] Bleiben Einträge mit Typ `d` (gelöscht) nach Freigabe in der DMRL sichtbar oder werden sie entfernt? (klären in PROJ-14)
- [ ] Konkrete Bezeichnungen/Model Ident Codes für die fiktiven Systeme Fahrzeug (4.2) und Fluggerät (5.0)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| CSV-Felder aus `docs/dmrl-mapping.md` sind das einheitliche interne Datenmodell für alle S1000D-Versionen | Check-out/Check-in-CSV bleibt für alle Versionen gleich; Versionsunterschiede nur beim XML-Export/-Import | 2026-11-11 |
| `rpcname` und `remarks` als zusätzliche Eintragsfelder | In den Beispieldateien vorhanden (`rpc/@rpcname`, `dmentry/remarks`), getrennt von `answer/remarks` | 2026-11-11 |
| Versionsindex = `seqnum-diyear` aus `dmlc`; Zähler je Absender (eigene Seite und Partner zählen getrennt) | Entspricht dem S1000D-DML-Code und den Beispieldateien | 2026-11-11 |
| `dmlref` verweist immer auf die unmittelbar vorherige DMRL der Austauschkette; initialer SEND auf sich selbst | Bestätigt durch Beispieldatei 03 (SEND 00002 → REPLY C1234 00001) | 2026-11-11 |
| Demo-Daten: PHUNGUN (2.3) mit echter Austauschkette, Fahrzeug (4.2) und Fluggerät (5.0) ohne Austausch | 2.3 zeigt Historie, 4.2/5.0 ermöglichen einen Live-SEND/REPLY-Zyklus in der Demo | 2026-11-11 |
| Firmennamen aus Originaldateien durch neutrale Namen ersetzt | Demo-Daten sollen keine realen Firmennamen enthalten | 2026-11-11 |
| Zurücksetzen nur durch Administrator, mit Bestätigung | Verhindert versehentlichen Datenverlust durch Bearbeiter | 2026-11-11 |
| Beschädigte Daten → Hinweis + Neuladen der Demo-Daten statt Absturz | Demo-Fähigkeit hat Vorrang; keine Datenrettung im Prototyp | 2026-11-11 |
| Kein Abgleich zwischen mehreren Tabs/Browsern | localStorage-Prototyp; echte Mehrbenutzerfähigkeit ist Non-Goal | 2026-11-11 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
