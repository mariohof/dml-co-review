# PROJ-6: DMRL anlegen

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — DMRLs werden im Datenbestand gespeichert
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriff nur für Administratoren
- Requires: PROJ-4 (Organisationsverwaltung) — Auswahl des Originators
- Requires: PROJ-5 (Systemverwaltung) — Auswahl des Systems
- Wird genutzt von: PROJ-17 (DMRL-Berechtigungen), PROJ-7 bis PROJ-15 (alle Workflows arbeiten auf einer DMRL)

## Beschreibung
Der Administrator legt unter „Verwaltung → DMRLs" zu einem System dessen DMRL an und pflegt die Kopfangaben (Originator, DML-Typ, Sicherheitseinstufung). Eine DMRL hat keine eigene Bezeichnung — sie wird über ihr System angezeigt. Der Partner wird nicht hier, sondern erst beim SEND gewählt (PROJ-12). Die Vergabe von Bearbeiter-Berechtigungen ist ein eigenes Feature (PROJ-17).

## Datenfelder einer DMRL
| Feld | Regel |
|------|-------|
| System | Pflicht; Auswahl aus angelegten Systemen, die noch keine DMRL haben (1 System = 1 DMRL) |
| Bezeichnung | keine eigene — angezeigt wird die Bezeichnung des Systems |
| Originator (Sender-Organisation) | Pflicht; Auswahl aus angelegten Organisationen (CAGE-Code + Name); wird als `dmlc/sendid` verwendet |
| DML-Typ | Pflicht; Auswahl `c`, `p` oder `s`; vorbelegt mit `c` |
| Sicherheitseinstufung | Pflicht; genau 2 Ziffern, `01`–`20`; vorbelegt mit `01` |

Nicht an der DMRL gepflegt:
- **Berechtigte Bearbeiter** → PROJ-17
- **Partner** — wird beim SEND gewählt und in der Übertragungshistorie gespeichert (PROJ-12); beim REPLY wird geprüft, ob die Antwort vom richtigen Partner kommt (PROJ-13)
- **Ausführender Benutzer je Workflow-Schritt** — wird im Workflow/Archiv gespeichert (PROJ-9, 10, 12, 13)

Die Sicherheitseinstufung der DMRL ist **unabhängig** von der Sicherheitseinstufung der Datenmodul-Einträge. Einträge werden eigenständig geprüft (Format `01`–`20`, Regelwerk PROJ-8) und müssen nicht mit der DMRL übereinstimmen.

## Änderungs- und Löschregeln

Eine DMRL gilt als **in einem Workflow benutzt**, sobald sie mindestens einmal Check-out/Check-in oder SEND/REPLY durchlaufen hat (dauerhaft).

| Situation | Löschen | System | Originator | DML-Typ | Sicherheitseinstufung |
|---|---|---|---|---|---|
| Noch kein Workflow | ja, mit Bestätigung; Einträge und Berechtigungen werden mitgelöscht | fest | änderbar | änderbar | änderbar |
| In Workflow benutzt | **nein, dauerhaft** | fest | **fest** | **fest** | änderbar |

Die Sicherheitseinstufung wirkt ab dem nächsten SEND.

## User Stories
- Als **Administrator** möchte ich zu einem System seine DMRL mit Originator, DML-Typ und Sicherheitseinstufung anlegen, damit daran gearbeitet werden kann.
- Als **Administrator** möchte ich eine versehentlich angelegte DMRL löschen, solange sie noch keinen Workflow durchlaufen hat, damit ich Fehler korrigieren kann.
- Als **Bearbeiter** möchte ich, dass Originator und DML-Typ nach dem ersten Workflow nicht mehr geändert werden können, damit DML-Codes und Archiv konsistent bleiben.
- Als **Administrator** möchte ich die Sicherheitseinstufung einer DMRL auch später anpassen können, damit der nächste SEND korrekt eingestuft ist.
- Als **Administrator** möchte ich in einer Liste alle DMRLs mit System, Originator und Status sehen, damit ich den Überblick behalte.

## Out of Scope
- Bearbeiter-Berechtigungen → PROJ-17
- Eigene Bezeichnung der DMRL
- Auswahl des Partners → PROJ-12 (SEND)
- Prüfung des Partners beim REPLY → PROJ-13
- Pflege der DMRL-Einträge → PROJ-9/10 (Check-out/Check-in)
- Prüfung der Sicherheitseinstufung der Einträge → PROJ-8
- DMRL-Detailansicht mit Einträgen → PROJ-7
- Kopieren einer DMRL auf ein anderes System

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Administrator ist angemeldet, wenn er „Verwaltung → DMRLs" öffnet, dann erscheint die DMRL-Verwaltung
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er die DMRL-Verwaltung direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)

### Liste
- [ ] Angenommen die DMRL-Verwaltung ist geöffnet, wenn die Liste angezeigt wird, dann zeigt sie je DMRL Systembezeichnung, Model Ident Code, S1000D-Issue, Originator (CAGE-Code), DML-Typ, Sicherheitseinstufung und DMRL-Status, sortiert nach Systembezeichnung
- [ ] Angenommen die Liste wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur DMRLs angezeigt, deren Systembezeichnung, Model Ident Code oder Originator den Begriff enthält
- [ ] Angenommen es existieren keine DMRLs, wenn die Liste angezeigt wird, dann erscheint „Noch keine DMRLs angelegt" mit der Aktion „DMRL anlegen"

### Anlegen
- [ ] Angenommen es gibt mindestens ein System ohne DMRL, wenn „DMRL anlegen" gewählt wird, dann öffnet sich ein Dialog mit System, Originator, DML-Typ (Auswahl `c`/`p`/`s`, vorbelegt `c`) und Sicherheitseinstufung (vorbelegt `01`)
- [ ] Angenommen der Anlegen-Dialog ist geöffnet, wenn die Systemauswahl geöffnet wird, dann enthält sie nur Systeme ohne DMRL
- [ ] Angenommen alle Systeme haben bereits eine DMRL oder es gibt keine Systeme, wenn „DMRL anlegen" angezeigt wird, dann ist die Aktion gesperrt mit dem Hinweis „Kein System ohne DMRL vorhanden — legen Sie zuerst ein System an"
- [ ] Angenommen es gibt keine Organisationen, wenn der Anlegen-Dialog geöffnet wird, dann weist er darauf hin, zuerst eine Organisation anzulegen
- [ ] Angenommen der Dialog ist gültig ausgefüllt, wenn gespeichert wird, dann erscheint die DMRL mit Status „in Bearbeitung" und ohne Einträge in der Liste
- [ ] Angenommen System oder Originator sind nicht gewählt, wenn gespeichert wird, dann erscheint je Pflichtfeld eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen die Sicherheitseinstufung ist nicht genau zwei Ziffern (z. B. „1", „100", „A1", „00", „21"), wenn gespeichert wird, dann erscheint „Sicherheitseinstufung muss zweistellig sein (01–20)" und nichts wird gespeichert
- [ ] Angenommen der DML-Typ wird ausgewählt, wenn die Auswahl geöffnet wird, dann stehen genau `c`, `p` und `s` zur Verfügung
- [ ] Angenommen eine DMRL wurde zu einem System angelegt, wenn danach die Systemverwaltung geöffnet wird, dann ist die Systembezeichnung dieses Systems nicht mehr änderbar (PROJ-5)

### Bearbeiten
- [ ] Angenommen eine DMRL hat noch keinen Workflow durchlaufen, wenn „Bearbeiten" gewählt wird, dann sind Originator, DML-Typ und Sicherheitseinstufung änderbar und das System ist fest
- [ ] Angenommen eine DMRL hat einen Workflow durchlaufen, wenn „Bearbeiten" gewählt wird, dann ist nur die Sicherheitseinstufung änderbar; System, Originator und DML-Typ sind gesperrt mit dem Hinweis „wird in Workflows verwendet"
- [ ] Angenommen die Sicherheitseinstufung der DMRL wird geändert, wenn gespeichert wird, dann bleiben die Sicherheitseinstufungen der Einträge unverändert

### Löschen
- [ ] Angenommen eine DMRL hat noch keinen Workflow durchlaufen, wenn „Löschen" gewählt wird, dann erscheint ein Bestätigungsdialog mit dem Hinweis, dass alle Einträge und Berechtigungen mitgelöscht werden
- [ ] Angenommen der Lösch-Dialog ist geöffnet, wenn bestätigt wird, dann sind DMRL, Einträge und Berechtigungen entfernt und das System erscheint wieder als „ohne DMRL" (PROJ-5); bei Abbruch bleibt alles erhalten
- [ ] Angenommen eine DMRL hat einen Workflow durchlaufen, wenn „Löschen" gewählt werden soll, dann ist die Aktion dauerhaft gesperrt mit dem Hinweis „Die DMRL ist an Workflows beteiligt und kann nicht gelöscht werden"
- [ ] Angenommen eine gesperrte Aktion oder ein gesperrtes Feld wird angezeigt, wenn der Mauszeiger darauf zeigt oder es fokussiert wird, dann erklärt ein Tooltip den Grund

### Demo-Daten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL-Verwaltung geöffnet wird, dann ist die DMRL PHUNGUN nicht löschbar und nur ihre Sicherheitseinstufung änderbar; die DMRLs von Fahrzeug und Fluggerät sind löschbar und vollständig änderbar (außer System)

## Edge Cases
- **System wird nach Löschen der DMRL wieder frei:** erscheint erneut in der Systemauswahl; Systembezeichnung ist wieder änderbar (PROJ-5).
- **Originator-Organisation einer DMRL ohne Workflow soll gelöscht werden:** gesperrt, bis Originator geändert oder DMRL gelöscht wird (PROJ-4).
- **DMRL ist gerade ausgecheckt und soll gelöscht werden:** ein Check-out ist bereits ein Workflow → Löschen gesperrt.
- **Sicherheitseinstufung der DMRL `01`, Einträge `02`:** zulässig, keine Abhängigkeit.
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Formularvalidierung mit sofortigen, deutschsprachigen Fehlermeldungen
- Responsiv: Tabelle auf kleinen Bildschirmen horizontal scrollbar

## Open Questions
- [ ] Bedeutung der DML-Typen `c`, `p`, `s` für die Anzeige (Klartext-Bezeichnungen)? Bis zur Klärung werden nur die Kürzel angezeigt.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine eigene DMRL-Bezeichnung, Anzeige über Systembezeichnung | Vorgabe Product Owner (1 System = 1 DMRL) | 2026-11-12 |
| Systembezeichnung fest, sobald DMRL existiert | Vorgabe Product Owner — DMRL-Bezeichnung darf sich nicht unbemerkt ändern | 2026-11-12 |
| Nur Sender-Organisation (Originator) an der DMRL | Vorgabe Product Owner | 2026-11-12 |
| Partner wird beim SEND gewählt und in der Übertragungshistorie gespeichert; REPLY wird gegen ihn geprüft | Vorgabe Product Owner — Nachvollziehbarkeit „an wen geliefert" und Absenderprüfung | 2026-11-12 |
| DML-Typ: Auswahl `c`, `p`, `s`, vorbelegt `c` | Vorgabe Product Owner | 2026-11-12 |
| Sicherheitseinstufung 2 Ziffern 00–99, vorbelegt `01` | Vorgabe Product Owner (Format); Vorbelegung entspricht Beispieldateien | 2026-11-12 |
| Sicherheitseinstufung auf `01`–`20` eingeschränkt | Schemas 4.2/5.0 erlauben nur 01–20 (2.3: 01–24); Vorgabe Product Owner (PROJ-12) | 2026-11-12 |
| Sicherheitseinstufung der DMRL unabhängig von der der Einträge; Einträge werden eigenständig geprüft | Vorgabe Product Owner | 2026-11-12 |
| Berechtigungen als eigenes Feature (PROJ-17) | Vorgabe Product Owner — Single Responsibility | 2026-11-12 |
| Ausführender Bearbeiter wird je Workflow-Schritt gespeichert | Vorgabe Product Owner — Nachvollziehbarkeit | 2026-11-12 |
| Löschen nur ohne Workflow-Historie; Einträge und Berechtigungen werden mitgelöscht | Vorgabe Product Owner, analog PROJ-4/5 | 2026-11-12 |
| Originator und DML-Typ fest ab erstem Workflow; Sicherheitseinstufung bleibt änderbar | Originator/DML-Typ stehen im DML-Code archivierter Stände; Einstufung wirkt erst beim nächsten SEND | 2026-11-12 |

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
