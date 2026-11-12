# PROJ-12: SEND-Export

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „SEND", Statusanzeige
- Requires: PROJ-11 (XSD-Validierung) — Prüfung vor Download und Archivierung
- Requires: PROJ-4 (Organisationen) — Partnerauswahl
- Requires: PROJ-5 / PROJ-6 — MI, Issue, Originator, DML-Typ, Sicherheitseinstufung
- Requires: PROJ-17 (Berechtigungen)
- Wird genutzt von: PROJ-13 (REPLY prüft gegen letzten SEND), PROJ-15 (Archiv), PROJ-18 (XML-Aufbau für Export)

## Beschreibung
Der Bearbeiter sendet die DMRL an einen externen Partner: Die Anwendung erzeugt eine S1000D-DMRL-XML in der Issue-Version des Systems (2.3, 4.2 oder 5.0), vergibt einen neuen Versionsindex `NNNNN-JJJJ`, prüft die Datei gegen das Schema (PROJ-11), stellt sie zum Download bereit und archiviert sie byte-genau. Die DMRL wartet danach auf die Antwort (REPLY) des Partners. Der Versand selbst erfolgt manuell außerhalb der Anwendung.

## Voraussetzungen
| Voraussetzung | Wenn nicht erfüllt |
|---|---|
| Berechtigter Bearbeiter oder Administrator | Aktion nicht verfügbar / „Keine Berechtigung" |
| DMRL nicht ausgecheckt | „Die DMRL ist ausgecheckt von [Name]" |
| DMRL-Status ≠ *gesendet* | „Es wird noch auf die Antwort zum SEND [Versionsindex] gewartet" |
| Kein Eintrag *zu überarbeiten* | „[n] abgelehnte Einträge sind noch nicht überarbeitet" (per Check-in ändern, mit `d` kennzeichnen oder erneut mit `n` versehen) |
| Mindestens ein Eintrag mit Eintragstyp `n`, `c` oder `d` | „Es gibt keine Änderungen, die der Partner prüfen müsste" |

Eine freigegebene DMRL ist damit erst nach einem Check-in mit Änderungen wieder sendefähig.

## SEND-Dialog
| Feld / Anzeige | Festlegung |
|---|---|
| Partner | Pflicht; alle Organisationen außer dem Originator; vorbelegt mit dem Partner des letzten SEND; bei Abweichung Hinweis „Abweichend vom letzten Partner [CAGE Name]" |
| Bemerkung | optional, Freitext → `dml/remarks` |
| Vorschau | neuer Versionsindex (z. B. `00003-2026`), Dateiname, Anzahl Einträge gesamt / `n` / `c` / `d` |
| Aktionen | „Senden" / „Abbrechen" |

## XML-Inhalt
**Kopf**
| Feld | Wert |
|---|---|
| Richtung | `send` |
| `dmlc` | MI des Systems · CAGE Originator · DML-Typ der DMRL · aktuelles Jahr · seqnum |
| seqnum | nächste freie Nummer je DMRL und Absender im aktuellen Jahr; beginnt bei `00001`, im neuen Jahr wieder bei `00001`; zurückgezogene SENDs belegen ihre Nummer weiterhin |
| `issno` / `inwork` / `type` | `001` / `00` / `new` |
| `issdate` | Datum des SEND |
| `security` | Sicherheitseinstufung der DMRL |
| `dmlref` | erster SEND: verweist auf sich selbst; sonst auf den letzten REPLY; jeweils mit `issno` `001` (NSG). Nach einem zurückgezogenen SEND: auf den letzten gültigen Stand |
| `brexDmRef` | nur 4.2/5.0: Standard-BREX — 4.2 `S1000D-F-04-10-0301-00A-022A-D`, 5.0 `S1000D-G-04-10-0301-00A-022A-D` |
| `remarks` | Bemerkung aus dem Dialog (falls angegeben) |

**Einträge**
- **Alle** Einträge der DMRL, sortiert nach DMC
- Mit Eintragstyp (`n`/`c`/`d`, leer = ohne Attribut), DMC, Titel, Sprache, Sicherheitseinstufung, rpc/rpcname, Bemerkung
- **Mit** Ausgabedaten: `issno`, DM-Ausgabetyp, Ausgabedatum (bei 4.2/5.0 zusätzlich `inWork="00"`)
- **Ohne** `answer` (Sende-DMRL enthält keine Antworten, NSG)
- Elementnamen je Issue laut `docs/dmrl-mapping.md`

**Dateiname:** `DML-{MI}-{CAGE Originator}-{DML-Typ}-{Jahr}-{seqnum}_001-00.XML`, z. B. `DML-PHUNGUN-D0815-C-2026-00003_001-00.XML`

## Wirkung nach erfolgreichem SEND
| Was | Danach |
|---|---|
| Einträge mit `n`/`c`/`d` | Status *gesendet* |
| Einträge ohne Eintragstyp | unverändert |
| DMRL | Status *gesendet* (Check-out und weiterer SEND gesperrt bis REPLY) |
| Archiv | XML byte-genau mit Versionsindex, Partner, Bearbeiter, Zeitpunkt (PROJ-15) |
| Workflow-Verlauf | „SEND [Versionsindex] an [Partner]" |
| Partner-Organisation | „im Workflow verwendet" (PROJ-4) |
| Antworten früherer REPLYs (`answer`) | bleiben in der Anwendung erhalten |

Besteht das XML die XSD-Prüfung nicht: kein Download, kein Versionsindex, kein Archiv, keine Statusänderung (PROJ-11).

## SEND zurückziehen
Nur **Administrator**, nur bei Status *gesendet*:
- Bestätigung + **Pflicht-Begründung**
- DMRL → *in Bearbeitung*; Einträge *gesendet* → *in Bearbeitung*
- Archiveintrag bleibt, markiert „zurückgezogen" (mit Benutzer, Zeitpunkt, Begründung)
- Workflow-Verlauf: „SEND [Versionsindex] zurückgezogen — [Begründung]"
- Ein REPLY auf einen zurückgezogenen SEND wird abgelehnt (PROJ-8 G)
- Nächster SEND erhält eine neue seqnum

## User Stories
- Als **Bearbeiter** möchte ich die DMRL als S1000D-XML an einen Partner senden, damit er die Änderungen prüfen kann.
- Als **Bearbeiter** möchte ich vor dem Senden sehen, welcher Versionsindex vergeben wird und wie viele Einträge neu, geändert oder zur Löschung sind.
- Als **Bearbeiter** möchte ich, dass jede SEND-Datei schemakonform und archiviert ist, damit ich jederzeit nachweisen kann, was an wen gesendet wurde.
- Als **Bearbeiter** möchte ich daran gehindert werden, eine DMRL mit unbearbeiteten abgelehnten Einträgen zu senden.
- Als **Administrator** möchte ich einen SEND zurückziehen können, wenn der Partner nicht antwortet oder falsch gewählt wurde, damit die DMRL nicht dauerhaft blockiert ist.
- Als **Product Owner** möchte ich den SEND für Systeme mit Issue 2.3, 4.2 und 5.0 vorführen.

## Out of Scope
- Automatischer Versand (E-Mail/Schnittstelle) — Non-Goal laut PRD
- Excel-Export beim SEND (Anforderung 02 nennt Excel + XML) — nur XML
- XML-Export ohne Workflow → PROJ-18
- Anzeige/erneuter Download aus dem Archiv → PROJ-15
- Partielle DMRL (nur geänderte Einträge) — immer alle Einträge
- Projektspezifischer BREX je System
- „Fehler ignorieren"-Ausnahmen aus Anforderung 02 (Freigabe ohne REPLY)
- Data Dispatch Note (DDN)
- Zurückziehen durch Bearbeiter

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Voraussetzungen
- [ ] Angenommen die DMRL ist ausgecheckt, wenn „SEND" gewählt wird, dann ist es nicht möglich mit „Die DMRL ist ausgecheckt von [Name]"
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn „SEND" gewählt wird, dann ist es nicht möglich mit Hinweis auf den ausstehenden REPLY
- [ ] Angenommen ein Eintrag hat Status *zu überarbeiten*, wenn „SEND" gewählt wird, dann ist es nicht möglich mit „[n] abgelehnte Einträge sind noch nicht überarbeitet"
- [ ] Angenommen kein Eintrag hat Eintragstyp `n`, `c` oder `d`, wenn „SEND" gewählt wird, dann ist es nicht möglich mit „Es gibt keine Änderungen, die der Partner prüfen müsste"
- [ ] Angenommen ein Bearbeiter ist für die DMRL nicht berechtigt, wenn er SEND aufruft, dann erscheint „Keine Berechtigung"

### Dialog
- [ ] Angenommen alle Voraussetzungen sind erfüllt, wenn „SEND" gewählt wird, dann zeigt der Dialog Partnerauswahl, Bemerkung, neuen Versionsindex, Dateiname und Anzahl gesamt/n/c/d
- [ ] Angenommen der Dialog ist offen, wenn die Partnerauswahl geöffnet wird, dann ist der Originator nicht enthalten und der Partner des letzten SEND vorausgewählt
- [ ] Angenommen ein anderer als der letzte Partner wird gewählt, wenn der Dialog angezeigt wird, dann erscheint der Hinweis „Abweichend vom letzten Partner"
- [ ] Angenommen kein Partner ist gewählt, wenn „Senden" gewählt wird, dann erscheint ein Pflichtfeldfehler
- [ ] Angenommen der Dialog ist offen, wenn „Abbrechen" gewählt wird, dann ändert sich nichts

### XML
- [ ] Angenommen PHUNGUN (2.3) hat die SENDs 00001-2026 und 00002-2026 und einen REPLY, wenn 2026 erneut gesendet wird, dann hat das XML seqnum `00003`, diyear `2026` und heißt `DML-PHUNGUN-D0815-C-2026-00003_001-00.XML`
- [ ] Angenommen der letzte SEND war 00007-2026, wenn im Jahr 2027 gesendet wird, dann ist der Versionsindex `00001-2027`
- [ ] Angenommen eine DMRL wurde noch nie gesendet, wenn sie gesendet wird, dann verweist `dmlref` auf den eigenen `dmlc`
- [ ] Angenommen ein REPLY liegt vor, wenn gesendet wird, dann verweist `dmlref` auf den `dmlc` dieses REPLY mit `issno` `001`
- [ ] Angenommen die DMRL hat 32 Einträge, davon einige ohne Eintragstyp, wenn gesendet wird, dann enthält das XML alle 32 Einträge sortiert nach DMC; Einträge ohne Eintragstyp haben kein Typ-Attribut
- [ ] Angenommen Einträge haben `answer` aus einem früheren REPLY, wenn gesendet wird, dann enthält das XML kein `answer`
- [ ] Angenommen ein Eintrag hat `issno` `002`, DM-Ausgabetyp `changed` und Datum, wenn gesendet wird, dann stehen diese Werte im XML (2.3: `addresdm/issno`, `issdate`; 4.2/5.0: `issueInfo`, `@issueType`, `issueDate`)
- [ ] Angenommen das System hat Issue 4.2 bzw. 5.0, wenn gesendet wird, dann enthält das XML den jeweiligen Standard-BREX in `brexDmRef`
- [ ] Angenommen das System hat Issue 2.3 / 4.2 / 5.0, wenn gesendet wird, dann besteht das XML die XSD-Prüfung des jeweiligen Issues (PROJ-11)
- [ ] Angenommen eine Bemerkung wurde eingegeben, wenn gesendet wird, dann steht sie in `dml/remarks`

### Wirkung
- [ ] Angenommen der SEND ist erfolgreich, wenn er abgeschlossen ist, dann wird die XML heruntergeladen, die DMRL hat Status *gesendet* und Einträge mit `n`/`c`/`d` haben Status *gesendet*
- [ ] Angenommen ein Eintrag hat keinen Eintragstyp und Status *freigegeben*, wenn gesendet wird, dann bleibt er *freigegeben*
- [ ] Angenommen der SEND ist erfolgreich, wenn das Archiv betrachtet wird, dann ist die XML byte-genau mit Versionsindex, Partner, Bearbeiter und Zeitpunkt gespeichert
- [ ] Angenommen der SEND ist erfolgreich, wenn der Kopfbereich der Ansicht betrachtet wird, dann zeigt er den neuen Versionsindex sowie Partner, Datum und Bearbeiter (PROJ-7)
- [ ] Angenommen die XML besteht die XSD-Prüfung nicht, wenn gesendet wird, dann wird nichts heruntergeladen, kein Versionsindex vergeben, nichts archiviert und kein Status geändert
- [ ] Angenommen die Partner-Organisation war noch nicht im Workflow verwendet, wenn gesendet wird, dann gilt sie danach als verwendet (PROJ-4)

### Zurückziehen
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn ein Administrator „SEND zurückziehen" wählt, dann muss er eine Begründung eingeben und bestätigen
- [ ] Angenommen der SEND wurde zurückgezogen, wenn danach die DMRL betrachtet wird, dann ist sie *in Bearbeitung*, die zuvor *gesendeten* Einträge sind *in Bearbeitung* und der Archiveintrag ist als „zurückgezogen" markiert
- [ ] Angenommen SEND 00003-2026 wurde zurückgezogen, wenn erneut gesendet wird, dann erhält der neue SEND `00004-2026`
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn die DMRL *gesendet* ist, dann sieht er „SEND zurückziehen" nicht

## Edge Cases
- **Download blockiert / Datei verloren:** SEND gilt als ausgeführt; erneuter Download aus dem Archiv (PROJ-15).
- **XSD-Prüfung nicht verfügbar:** SEND blockiert (PROJ-11).
- **Jahreswechsel zwischen Dialog öffnen und Senden:** Versionsindex wird beim Senden ermittelt; Vorschau ggf. aktualisieren.
- **Partner-Organisation ist Originator einer anderen DMRL:** erlaubt.
- **Nur Organisation = Originator vorhanden:** „Keine Partner-Organisation vorhanden — bitte zuerst anlegen (Verwaltung → Organisationen)".
- **Einträge mit Eintragstyp `d` und Antwort `y` aus früherem Zyklus:** bleiben ohne Eintragstyp in der DMRL und werden mitgesendet.
- **Sehr große DMRL (1.000+ Einträge):** Fortschrittsanzeige während Erzeugung und Prüfung.
- **Speicher voll beim Archivieren:** SEND schlägt fehl, keine Statusänderung (PROJ-1).

## Technical Requirements (optional)
- XML-Erzeugung je Issue (2.3 / 4.2 / 5.0) nach `docs/dmrl-mapping.md`
- XSD-Prüfung serverseitig (PROJ-11) vor Download/Archivierung
- Archivierte Datei = heruntergeladene Datei (byte-genau)

## Open Questions
- [ ] Ausgabedaten der Einträge (`issno`, DM-Ausgabetyp, Datum) im SEND-XML: derzeit enthalten (Vorgabe Product Owner), NSG sieht sie nicht vor — ggf. später anpassen
- [ ] Beispieldatei Issue 5.0 steht noch aus (`docs/beispiele/issue-5.0/`)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Standard-BREX je Issue (Model Ident Code `S1000D`), kein Feld am System | Vorgabe Product Owner | 2026-11-12 |
| Sicherheitseinstufung `01`–`20` (PROJ-6, PROJ-8 angepasst) | Schemas 4.2/5.0 erlauben nur 01–20 | 2026-11-12 |
| SEND nur ohne Check-out, nicht im Status *gesendet*, ohne Einträge *zu überarbeiten*, mit mindestens einem `n`/`c`/`d` | NSG (ein Zyklus nach dem anderen), Anforderung 02 | 2026-11-12 |
| Ausgabedaten der Einträge werden ins XML geschrieben | Vorgabe Product Owner (Option b); ggf. später anpassen | 2026-11-12 |
| Partner im Dialog, vorbelegt mit letztem Partner, Hinweis bei Abweichung | Vorgabe Product Owner (PROJ-6) | 2026-11-12 |
| Alle Einträge, ohne `answer` | Komplette DMRL (DML-Typ c), NSG | 2026-11-12 |
| `dmlref`: erster SEND auf sich selbst, sonst letzter REPLY, `issno` 001 | NSG 1.2.3, Beispieldateien | 2026-11-12 |
| seqnum je DMRL und Absender pro Jahr | PRD | 2026-11-12 |
| Einträge `n`/`c`/`d` → *gesendet*, übrige unverändert | Nur geänderte Einträge werden vom Partner geprüft | 2026-11-12 |
| SEND zurückziehen nur durch Administrator, mit Begründung; Archiveintrag bleibt markiert | Blockade durch fehlenden REPLY auflösbar, nachvollziehbar | 2026-11-12 |

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
