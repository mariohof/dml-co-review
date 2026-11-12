# PROJ-5: Systemverwaltung

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — Systeme werden im Datenbestand gespeichert
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriff nur für Administratoren
- Wird genutzt von: PROJ-6 (DMRL wird zu einem System angelegt), PROJ-11/12/13 (S1000D-Issue bestimmt Schema und XML-Format, Model Ident Code steht im DML-Code)

## Beschreibung
Der Administrator verwaltet unter „Verwaltung → Systeme" die Systeme (Fahrzeuge, Fluggeräte, Schiffe, Geräte), für die DMRLs geführt werden. Ein System legt fest, mit welcher S1000D-Version (2.3, 4.2, 5.0) seine DMRL ausgetauscht wird, und liefert den Model Ident Code (`modelic`) für DML-Code und Datenmodul-Codes. Jedes System hat höchstens eine DMRL; diese wird getrennt in PROJ-6 angelegt.

## Datenfelder eines Systems
| Feld | Regel |
|------|-------|
| Bezeichnung | Pflicht, 2–120 Zeichen (Randleerzeichen werden entfernt), eindeutig (ohne Unterscheidung Groß-/Kleinschreibung) |
| S1000D-Issue | Pflicht: 2.3, 4.2 oder 5.0 |
| Model Ident Code | Pflicht, 2–14 Zeichen, nur Buchstaben und Ziffern, Eingabe wird automatisch in Großbuchstaben umgewandelt, eindeutig über alle Systeme |
| Beschreibung | optional, Freitext, max. 500 Zeichen |

Keine Systemart.

## Beziehung System ↔ DMRL
- Ein System hat **genau eine DMRL** (oder noch keine).
- Die DMRL wird **getrennt** angelegt (PROJ-6); dort werden nur Systeme ohne DMRL zur Auswahl angeboten.

## Änderungs- und Löschregeln

Ein System gilt als **in einem Workflow benutzt**, sobald seine DMRL mindestens einmal Check-out/Check-in oder SEND/REPLY durchlaufen hat (dauerhaft, analog PROJ-4).

| Situation | Löschen | S1000D-Issue | Model Ident Code | Bezeichnung | Beschreibung |
|---|---|---|---|---|---|
| Keine DMRL | ja | änderbar | änderbar | änderbar | änderbar |
| DMRL vorhanden, noch kein Workflow | nein — zuerst DMRL löschen (PROJ-6) | änderbar | **fest** | **fest** | änderbar |
| DMRL in Workflow benutzt | **nein, dauerhaft** | **fest** | **fest** | **fest** | änderbar |

Die Bezeichnung ist fest, sobald eine DMRL existiert, da die DMRL keine eigene Bezeichnung hat und über die Systembezeichnung angezeigt wird (PROJ-6).

## User Stories
- Als **Administrator** möchte ich Systeme mit Bezeichnung, S1000D-Issue und Model Ident Code anlegen, damit ich dafür DMRLs führen kann.
- Als **Administrator** möchte ich je System die S1000D-Version festlegen, damit Export und Import der DMRL im richtigen Format erfolgen.
- Als **Administrator** möchte ich in der Systemliste sehen, ob ein System bereits eine DMRL hat, damit ich weiß, wo noch eine DMRL anzulegen ist.
- Als **Bearbeiter** möchte ich, dass Model Ident Code und S1000D-Issue nicht mehr verändert werden können, sobald sie verwendet werden, damit DML-Codes und Archivstände konsistent bleiben.
- Als **Administrator** möchte ich falsch angelegte, unbenutzte Systeme löschen können, damit die Liste übersichtlich bleibt.

## Out of Scope
- Systemart (Fahrzeug/Fluggerät/Schiff/Gerät) — bewusst gestrichen
- Mehrere DMRLs pro System
- Anlegen/Löschen der DMRL → PROJ-6 (Systemliste verlinkt nur)
- Automatisches Anlegen einer DMRL beim Anlegen eines Systems
- Unterstützung weiterer S1000D-Versionen als 2.3 / 4.2 / 5.0
- Hinterlegen der XSD-Schemas je Version → PROJ-11
- Migration einer bestehenden DMRL auf eine andere S1000D-Version
- Hierarchien (System/Teilsystem) oder SNS-Strukturen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Administrator ist angemeldet, wenn er „Verwaltung → Systeme" öffnet, dann erscheint die Systemverwaltung
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er die Systemverwaltung direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)

### Liste
- [ ] Angenommen die Systemverwaltung ist geöffnet, wenn die Liste angezeigt wird, dann zeigt sie alle Systeme mit Bezeichnung, Model Ident Code, S1000D-Issue und DMRL, sortiert nach Bezeichnung
- [ ] Angenommen ein System hat eine DMRL, wenn die Liste angezeigt wird, dann zeigt die Spalte „DMRL" deren Namen als Link zur DMRL
- [ ] Angenommen ein System hat keine DMRL, wenn die Liste angezeigt wird, dann zeigt die Spalte „DMRL" „— keine —"
- [ ] Angenommen die Liste wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur Systeme angezeigt, deren Bezeichnung oder Model Ident Code den Begriff enthält (ohne Unterscheidung Groß-/Kleinschreibung)
- [ ] Angenommen es existieren keine Systeme, wenn die Liste angezeigt wird, dann erscheint „Noch keine Systeme angelegt" mit der Aktion „System anlegen"
- [ ] Angenommen ein Suchbegriff liefert keine Treffer, wenn die Liste angezeigt wird, dann erscheint „Keine Systeme gefunden"

### Anlegen
- [ ] Angenommen die Systemverwaltung ist geöffnet, wenn „System anlegen" gewählt wird, dann öffnet sich ein Dialog mit Bezeichnung, S1000D-Issue (Auswahl 2.3 / 4.2 / 5.0), Model Ident Code und Beschreibung
- [ ] Angenommen der Dialog ist gültig ausgefüllt, wenn gespeichert wird, dann erscheint das System in der Liste mit „— keine —" in der Spalte DMRL
- [ ] Angenommen ein Pflichtfeld ist leer, wenn gespeichert wird, dann erscheint je Pflichtfeld eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen im Feld Model Ident Code wird „phungun" eingegeben, wenn die Eingabe erfolgt, dann wird sie als „PHUNGUN" übernommen
- [ ] Angenommen der Model Ident Code hat weniger als 2 oder mehr als 14 Zeichen oder enthält andere Zeichen als Buchstaben und Ziffern, wenn gespeichert wird, dann erscheint „Model Ident Code muss aus 2–14 Buchstaben/Ziffern bestehen" und nichts wird gespeichert
- [ ] Angenommen ein System mit Model Ident Code „PHUNGUN" existiert, wenn ein weiteres mit „PHUNGUN" angelegt werden soll, dann erscheint „Model Ident Code bereits vergeben" und nichts wird gespeichert
- [ ] Angenommen ein System mit Bezeichnung „PHUNGUN" existiert, wenn ein weiteres mit „phungun" angelegt werden soll, dann erscheint „Bezeichnung bereits vergeben" und nichts wird gespeichert
- [ ] Angenommen die Beschreibung ist länger als 500 Zeichen, wenn gespeichert wird, dann erscheint eine Fehlermeldung zur Länge

### Bearbeiten
- [ ] Angenommen ein System hat keine DMRL, wenn „Bearbeiten" gewählt wird, dann sind alle Felder änderbar (gleiche Prüfregeln wie beim Anlegen)
- [ ] Angenommen ein System hat eine DMRL ohne Workflow-Historie, wenn „Bearbeiten" gewählt wird, dann sind Model Ident Code und Bezeichnung gesperrt mit dem Hinweis „fest, da eine DMRL existiert"; S1000D-Issue und Beschreibung sind änderbar
- [ ] Angenommen die DMRL eines Systems hat einen Workflow durchlaufen, wenn „Bearbeiten" gewählt wird, dann sind Model Ident Code, S1000D-Issue und Bezeichnung gesperrt mit dem Hinweis „wird in Workflows verwendet"; nur die Beschreibung ist änderbar
- [ ] Angenommen die S1000D-Issue eines Systems ohne Workflow-Historie wird geändert, wenn gespeichert wird, dann gilt die neue Version für Export/Import der zugehörigen DMRL

### Löschen
- [ ] Angenommen ein System hat keine DMRL, wenn „Löschen" gewählt wird, dann erscheint ein Bestätigungsdialog; bei Bestätigung ist das System entfernt, bei Abbruch bleibt es erhalten
- [ ] Angenommen ein System hat eine DMRL ohne Workflow-Historie, wenn „Löschen" gewählt werden soll, dann ist die Aktion gesperrt mit dem Hinweis „Zum System existiert die DMRL [Name]. Löschen Sie zuerst die DMRL."
- [ ] Angenommen die DMRL eines Systems hat einen Workflow durchlaufen, wenn „Löschen" gewählt werden soll, dann ist die Aktion dauerhaft gesperrt mit dem Hinweis „Das System ist an Workflows beteiligt und kann nicht gelöscht werden"
- [ ] Angenommen eine gesperrte Aktion oder ein gesperrtes Feld wird angezeigt, wenn der Mauszeiger darauf zeigt oder es fokussiert wird, dann erklärt ein Tooltip den Grund

### Demo-Daten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Systemverwaltung geöffnet wird, dann ist PHUNGUN (2.3) vollständig gesperrt (DMRL mit SEND/REPLY-Historie) und bei Fahrzeug (4.2) und Fluggerät (5.0) ist nur der Model Ident Code gesperrt (DMRL ohne Workflow)

## Edge Cases
- **DMRL wurde gelöscht (PROJ-6), System hatte vorher keinen Workflow:** System ist wieder vollständig änderbar und löschbar.
- **DMRL mit Workflow-Historie kann nicht gelöscht werden** (PROJ-6) — dadurch bleibt das System dauerhaft gesperrt.
- **Model Ident Code mit Leerzeichen, Bindestrich oder Umlaut:** ungültig.
- **Model Ident Code eines Systems stimmt nicht mit `modelic` in importierten Einträgen überein:** Prüfung erfolgt im Regelwerk (PROJ-8).
- **Wechsel der S1000D-Issue bei DMRL mit Einträgen (ohne Workflow):** erlaubt, Einträge bleiben unverändert (CSV-Felder sind versionsneutral, PROJ-1).
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Formularvalidierung mit sofortigen, deutschsprachigen Fehlermeldungen
- Responsiv: Tabelle auf kleinen Bildschirmen horizontal scrollbar

## Open Questions
- [ ] Muss `modelic` jedes DMRL-Eintrags dem Model Ident Code des Systems entsprechen? (PROJ-8)
- [x] Darf eine DMRL mit Workflow-Historie gelöscht werden? → Nein (PROJ-6)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Felder: Bezeichnung, S1000D-Issue, Model Ident Code, Beschreibung (optional) | Minimal für Prototyp | 2026-11-12 |
| Keine Systemart | Vorgabe Product Owner | 2026-11-12 |
| Ein System hat genau eine DMRL | Vorgabe Product Owner | 2026-11-12 |
| DMRL wird getrennt angelegt (PROJ-6) | Vorgabe Product Owner; System-Dialog bleibt schlank | 2026-11-12 |
| Model Ident Code eindeutig, 2–14 alphanumerisch, Großbuchstaben | Regel aus `docs/dmrl-mapping.md`; Vorgabe Product Owner (eindeutig) | 2026-11-12 |
| Model Ident Code fest, sobald eine DMRL existiert | Vorgabe Product Owner | 2026-11-12 |
| S1000D-Issue fest ab erstem Workflow | Bestimmt XML-Format der archivierten Stände | 2026-11-12 |
| Kein Löschen bei Workflow-Nutzung (dauerhaft); bei DMRL ohne Workflow erst DMRL löschen | Vorgabe Product Owner, analog Organisationen (PROJ-4) | 2026-11-12 |
| Bezeichnung eindeutig | Systeme werden in Auswahllisten (PROJ-6) über die Bezeichnung erkannt | 2026-11-12 |
| Bezeichnung fest, sobald eine DMRL existiert | Vorgabe Product Owner — DMRL wird über die Systembezeichnung angezeigt (PROJ-6) | 2026-11-12 |
| Spalte „DMRL" mit Link in der Systemliste | Schneller Überblick, wo noch eine DMRL fehlt | 2026-11-12 |

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
