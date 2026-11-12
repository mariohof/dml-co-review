# PROJ-16: Dashboard

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Dashboard als Startseite, DMRL-Liste nach Rolle
- Requires: PROJ-17 (Berechtigungen) — sichtbare DMRLs für Bearbeiter
- Requires: PROJ-14 (Freigabestatus) — Status von DMRL und Einträgen
- Requires: PROJ-9 (Check-out) — Sperre, PROJ-12 (SEND) — Versionsindex, Partner
- Requires: PROJ-7 (DMRL-Ansicht) — Ziel der Aktion „Auswahl"

## Beschreibung
Das Dashboard ist die Startseite (PROJ-2). Es gibt einen Überblick über alle für den angemeldeten Benutzer sichtbaren DMRLs: Kennzahlen, persönliche Aufgaben und eine erweiterte DMRL-Liste mit Status, Version und Fortschritt. Administratoren sehen alle DMRLs, Bearbeiter nur die berechtigten.

Wireframe (Product Owner): `docs/wireframes/PROJ-16-dashboard.png`

## Aufbau
```
Kopfzeile: „Dashboard" · Benutzer (PROJ-2)
Überschrift: ÜBERBLICK — „DMRL im Blick."
+-- Kennzahlen (4 Kacheln)
|   Bestände · Offene SEND · Offene Änderungen · Freigegeben
+-- Meine Aufgaben (nur wenn vorhanden)
+-- DMRL-Bestände (Karte)
    +-- Titel „DMRL-Bestände" · Zähler „[n] sichtbare Bestände"
    +-- Filter (Status, Issue) · Suche (System, MI)
    +-- Tabelle · Aktion „Auswahl" je Zeile
```

### Kennzahlen
| Kachel | Zählt | Klick |
|---|---|---|
| **Bestände** | sichtbare DMRLs | Filter zurücksetzen (alle) |
| **Offene SEND** | DMRLs mit Status *gesendet* (warten auf REPLY) | Liste auf *gesendet* filtern |
| **Offene Änderungen** | **Einträge** mit Status *in Bearbeitung* oder *zu überarbeiten*, summiert über alle sichtbaren DMRLs | Liste auf DMRLs mit offenen Änderungen filtern |
| **Freigegeben** | DMRLs mit Status *freigegeben* | Liste auf *freigegeben* filtern |

Aktive Kachel ist hervorgehoben; erneuter Klick hebt den Filter auf.

### Meine Aufgaben
Hinweise für den angemeldeten Benutzer (nur sichtbare DMRLs), Klick öffnet die DMRL-Ansicht:
- „Von Ihnen ausgecheckt: [System] seit [Datum]"
- „[n] Einträge zu überarbeiten: [System]"
- „Wartet seit [n] Tagen auf REPLY: [System]" (ab 1 Tag)

Bereich entfällt, wenn keine Aufgaben vorliegen.

### DMRL-Tabelle
| Spalte | Inhalt |
|---|---|
| System / DMRL | Systemname; darunter Kennung `{MI}–{CAGE Originator}–{DML-Typ}` (z. B. `WAA–D0815–C`) |
| S1000D | Issue (2.3 / 4.2 / 5.0) |
| Version | Versionsindex des letzten SEND (z. B. `00001-2026`), ohne SEND „—" |
| DMRL-Einträge | Anzahl Einträge |
| Fortschritt | „[x] / [n] freigegeben" mit Balken |
| Workflow | Status-Badge (*In Bearbeitung*, *Gesendet*, *Freigegeben*); darunter ggf. „ausgecheckt von [Name]" und „[n] zu überarbeiten" |
| Aktion | **„Auswahl"** → DMRL-Ansicht (PROJ-7) |

- Sortierung: Systemname aufsteigend
- Filter: Status (Mehrfachauswahl), Issue; Suche über Systemname und MI
- Zähler „[n] sichtbare Bestände" berücksichtigt Filter/Suche
- Leer: Hinweise laut PROJ-2 („Ihnen sind noch keine DMRLs zugeordnet …" bzw. für Administratoren „Noch keine DMRL angelegt" mit Link zur Verwaltung); keine Treffer: „Keine DMRL entspricht dem Filter"

## User Stories
- Als **Bearbeiter** möchte ich auf einen Blick sehen, wie viele meiner DMRLs auf einen REPLY warten, freigegeben sind oder offene Änderungen haben.
- Als **Bearbeiter** möchte ich meine persönlichen Aufgaben sehen (ausgecheckte DMRLs, abgelehnte Einträge, lange wartende SENDs), damit ich nichts übersehe.
- Als **Bearbeiter** möchte ich je DMRL Version, Status und Fortschritt der Abstimmung sehen und die DMRL direkt öffnen.
- Als **Administrator** möchte ich alle DMRLs mit Status und Sperre sehen, damit ich verwaiste Sperren und hängende SENDs erkenne.
- Als **Product Owner** möchte ich mit dem Dashboard den Gesamtstand aller Demo-Systeme (2.3/4.2/5.0) zeigen.

## Out of Scope
- Archivübersicht über alle DMRLs (Archiv je DMRL reicht, PROJ-15)
- Diagramme/Zeitverläufe
- Aktionen direkt im Dashboard (Check-out, SEND …) — nur über die DMRL-Ansicht
- Konfigurierbare Kacheln/Spalten
- Benachrichtigungen (E-Mail o. ä.)
- Export der Dashboard-Liste

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Kennzahlen
- [ ] Angenommen ein Administrator ist angemeldet und der Demo-Datenbestand geladen, wenn das Dashboard angezeigt wird, dann zeigen die Kacheln Bestände 3, Offene SEND 1 (PHUNGUN), Offene Änderungen 20 (je 10 Einträge Fahrzeug/Fluggerät *in Bearbeitung*), Freigegeben 0
- [ ] Angenommen Bearbeiter 1 (PHUNGUN, Fahrzeug) ist angemeldet, wenn das Dashboard angezeigt wird, dann beziehen sich alle Kacheln nur auf PHUNGUN und Fahrzeug
- [ ] Angenommen das Dashboard ist geöffnet, wenn die Kachel „Offene SEND" angeklickt wird, dann zeigt die Liste nur DMRLs mit Status *gesendet* und die Kachel ist hervorgehoben
- [ ] Angenommen ein Kachel-Filter ist aktiv, wenn die Kachel erneut oder „Bestände" angeklickt wird, dann ist der Filter aufgehoben
- [ ] Angenommen eine DMRL hat 3 Einträge *in Bearbeitung* und 2 *zu überarbeiten*, wenn das Dashboard angezeigt wird, dann trägt sie 5 zu „Offene Änderungen" bei

### Meine Aufgaben
- [ ] Angenommen der angemeldete Benutzer hat eine DMRL ausgecheckt, wenn das Dashboard angezeigt wird, dann erscheint „Von Ihnen ausgecheckt: [System] seit [Datum]"
- [ ] Angenommen eine sichtbare DMRL hat Einträge *zu überarbeiten*, wenn das Dashboard angezeigt wird, dann erscheint „[n] Einträge zu überarbeiten: [System]"
- [ ] Angenommen eine sichtbare DMRL ist seit mindestens einem Tag *gesendet*, wenn das Dashboard angezeigt wird, dann erscheint „Wartet seit [n] Tagen auf REPLY: [System]"
- [ ] Angenommen es gibt keine Aufgaben, wenn das Dashboard angezeigt wird, dann wird der Bereich „Meine Aufgaben" nicht angezeigt
- [ ] Angenommen eine Aufgabe wird angeklickt, wenn sie ausgewählt wird, dann öffnet sich die DMRL-Ansicht

### DMRL-Tabelle
- [ ] Angenommen das Dashboard ist geöffnet, wenn die Tabelle angezeigt wird, dann zeigt jede Zeile System, Kennung `MI–CAGE–Typ`, Issue, Versionsindex, Anzahl Einträge, Fortschritt, Workflow-Status und „Auswahl"
- [ ] Angenommen PHUNGUN hat den letzten SEND 00002-2026, wenn die Tabelle angezeigt wird, dann steht in „Version" `00002-2026`
- [ ] Angenommen eine DMRL wurde nie gesendet, wenn die Tabelle angezeigt wird, dann steht in „Version" „—"
- [ ] Angenommen eine DMRL ist von Bea Bearbeiter ausgecheckt, wenn die Tabelle angezeigt wird, dann steht unter dem Status „ausgecheckt von Bea Bearbeiter"
- [ ] Angenommen eine DMRL hat 30 von 32 Einträgen *freigegeben*, wenn die Tabelle angezeigt wird, dann zeigt „Fortschritt" „30 / 32 freigegeben" mit Balken
- [ ] Angenommen „Auswahl" wird angeklickt, wenn die Aktion ausgeführt wird, dann öffnet sich die DMRL-Ansicht (PROJ-7)
- [ ] Angenommen ein Filter nach Issue 4.2 ist gesetzt, wenn die Tabelle angezeigt wird, dann erscheint nur das Fahrzeug und der Zähler zeigt „1 sichtbare Bestände"
- [ ] Angenommen die Suche „PHUN" wird eingegeben, wenn die Tabelle angezeigt wird, dann erscheint nur PHUNGUN
- [ ] Angenommen Filter/Suche ergeben keine Treffer, wenn die Tabelle angezeigt wird, dann erscheint „Keine DMRL entspricht dem Filter"

### Aktualität
- [ ] Angenommen ein Workflow-Schritt (Check-in, SEND, REPLY) wurde ausgeführt, wenn zum Dashboard zurückgekehrt wird, dann sind Kennzahlen und Tabelle aktualisiert
- [ ] Angenommen der Benutzer wird gewechselt, wenn das Dashboard angezeigt wird, dann zeigt es die Daten aus Sicht des neuen Benutzers

## Edge Cases
- **DMRL ohne Einträge:** Fortschritt „0 / 0", Status *in Bearbeitung*.
- **System ohne DMRL:** erscheint nicht im Dashboard (nur in der Verwaltung, PROJ-5).
- **Bearbeiter wird Berechtigung entzogen:** DMRL verschwindet beim nächsten Aufruf (PROJ-17).
- **Inaktiver Sperrinhaber:** „ausgecheckt von [Name] (inaktiv)".
- **Zurückgezogener SEND:** „Version" zeigt den letzten nicht zurückgezogenen SEND.
- **Viele DMRLs:** Tabelle blättert; Kennzahlen bleiben Gesamtwerte (unabhängig von Suche).

## Technical Requirements (optional)
- Daten aus dem lokalen Datenbestand (PROJ-1), keine Serverfunktion
- Anzeige ohne spürbare Verzögerung bei 50 DMRLs mit je 1.000 Einträgen
- Design laut `docs/design-system.md`; Aufbau laut Wireframe

## Open Questions
- [x] Benutzer-Auswahlliste in der Kopfzeile (Wireframe)? → Ja, PROJ-2 entsprechend angepasst (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Aufbau nach Wireframe des Product Owners (Kacheln, Karte „DMRL-Bestände", Aktion „Auswahl") | Vorgabe Product Owner | 2026-11-12 |
| Kacheln: Bestände, Offene SEND, Freigegeben zählen DMRLs; Offene Änderungen zählt Einträge (*in Bearbeitung* + *zu überarbeiten*) | Abgestimmt mit Product Owner (Wireframe) | 2026-11-12 |
| Kacheln filtern die Tabelle | Schneller Zugriff | 2026-11-12 |
| „Meine Aufgaben" zusätzlich zum Wireframe | Vorgabe Product Owner (Zustimmung) | 2026-11-12 |
| „Version" zeigt vollständigen Versionsindex `NNNNN-JJJJ` | Eindeutig (PRD) | 2026-11-12 |
| Zusätzliche Spalte Fortschritt; Sperre unter dem Status | Abstimmungsstand und Sperren auf einen Blick | 2026-11-12 |
| Keine Archivübersicht über alle DMRLs | Archiv je DMRL reicht (PROJ-15) | 2026-11-12 |

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
