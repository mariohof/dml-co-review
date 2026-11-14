# PROJ-16: Dashboard

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-14

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
| Alle Dashboard-Werte bei der Anzeige berechnet, nichts gespeichert | Immer aktuell | 2026-11-12 |
| Eine gemeinsame Auswertung für Kennzahlen, Tabelle und Aufgaben | Konsistente Zahlen | 2026-11-12 |
| Filterzustand in der Seitenadresse | Zurück-Navigation, Verlinkbarkeit | 2026-11-12 |
| Kacheln als bedienbare Schaltflächen mit Zustand | Barrierefreiheit | 2026-11-12 |
| Tabelle seitenweise ab 25 Zeilen | Übersicht | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Das Dashboard ist die Startseite `/` (PROJ-2) und wird um Kennzahlen, „Meine Aufgaben" und eine erweiterte DMRL-Tabelle ergänzt — Aufbau laut Wireframe `docs/wireframes/PROJ-16-dashboard.png`. Alle Werte werden **beim Anzeigen aus dem Datenbestand berechnet** (nichts gespeichert). Sichtbarkeit kommt aus der zentralen Rechte-Regel (PROJ-2), Status und Badges aus dem Statusmodul (PROJ-14). Alles im Browser, kein Backend nötig.

### A) Komponentenstruktur
```
Seite „Dashboard" (/)
+-- Zugriffswächter „angemeldet?" (PROJ-2) · Kopfzeile mit Benutzer-Auswahlliste (PROJ-2)
+-- Überschrift: Kennzeile „ÜBERBLICK" · Titel „DMRL im Blick."
+-- Kennzahlen (4 Kacheln, shadcn Card, als Schaltflächen bedienbar)
|   +-- Bestände · Offene SEND · Offene Änderungen · Freigegeben
|   +-- aktive Kachel hervorgehoben; erneuter Klick hebt Filter auf
+-- „Meine Aufgaben" (shadcn Card, nur wenn Aufgaben vorhanden)
|   +-- Liste von Hinweisen mit Link zur DMRL-Ansicht
+-- Karte „DMRL-Bestände" (shadcn Card)
    +-- Titel · Zähler-Badge „[n] sichtbare Bestände"
    +-- Filterzeile: Status (Mehrfachauswahl, shadcn DropdownMenu mit Häkchen) · Issue (shadcn Select) · Suche (Input)
    +-- Tabelle (shadcn Table, sortiert nach Systemname, seitenweise ab 25)
    |   +-- System / DMRL (Name + Kennung MI–CAGE–Typ in Monospace)
    |   +-- S1000D · Version · DMRL-Einträge
    |   +-- Fortschritt („x / n freigegeben", shadcn Progress)
    |   +-- Workflow (Status-Badge; darunter „ausgecheckt von …", „n zu überarbeiten")
    |   +-- „Auswahl" (Button → DMRL-Ansicht)
    +-- Leer: Hinweise laut PROJ-2 · Keine Treffer: „Keine DMRL entspricht dem Filter"
```

### B) Datenmodell (in Klartext)
Keine Änderung, nichts gespeichert. **Berechnet** je Anzeige aus dem Datenbestand (PROJ-1):
- sichtbare DMRLs (Rechte-Regel PROJ-2)
- je DMRL: System, Issue, Kennung, Versionsindex (letzter nicht zurückgezogener SEND), Anzahl Einträge, Anzahl *freigegeben*, Anzahl *in Bearbeitung* + *zu überarbeiten*, Sperre, Status, Wartezeit seit letztem SEND
- Kennzahlen über alle sichtbaren DMRLs (unabhängig von Suche/Filter)
- Aufgaben des angemeldeten Benutzers

**Filterzustand** (Kachel, Status, Issue, Suche) steht in der Adresse der Seite → bleibt bei Zurück-Navigation erhalten und ist verlinkbar.

### C) Bausteine
| Baustein | Aufgabe | Herkunft |
|---|---|---|
| Dashboard-Auswertung | berechnet Kennzahlen, Zeilenwerte und Aufgaben in einem Durchlauf | neu |
| Versionsindex-Ermittlung | letzter nicht zurückgezogener SEND | PROJ-12 |
| Status-Badges | Texte und Farben | PROJ-14 / PROJ-7 |
| Rechte-Regel | sichtbare DMRLs | PROJ-2 |
| Kennung `MI–CAGE–Typ` | Anzeige unter dem Systemnamen | neu (klein) |

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Alle Werte bei der Anzeige berechnet | Immer aktuell nach jedem Workflow-Schritt oder Benutzerwechsel; nichts kann veralten. |
| Eine Auswertung für Kennzahlen, Tabelle und Aufgaben | Zahlen in Kacheln und Tabelle stimmen garantiert überein. |
| Filter in der Adresse | Zurück-Taste und Links behalten die Ansicht. |
| Kacheln als Schaltflächen | Per Tastatur bedienbar, Zustand für Screenreader erkennbar. |
| Tabelle seitenweise ab 25 Zeilen | Übersichtlich auch bei vielen Systemen. |
| Layout laut Wireframe, Farben/Schrift laut Design-System | Vorgabe Product Owner. |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** shadcn Card, Table, Badge, Progress, Select, DropdownMenu, Input, Button, Pagination sind installiert.

### F) Testbarkeit
- Unit-Tests: Auswertung mit Demo-Daten (Admin: 3 / 1 / 20 / 0; Anna Bearbeitung nur PHUNGUN + Fahrzeug), Aufgaben (ausgecheckt, zu überarbeiten, Wartezeit ≥ 1 Tag), Versionsindex mit zurückgezogenem SEND, Filter/Suche.
- E2E: Kachel-Filter an/aus, Issue-Filter 4.2, Suche „PHUN", „Auswahl" öffnet DMRL, Benutzerwechsel aktualisiert die Sicht.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-16`_

**Umgesetzt**
- `src/lib/dashboard.ts` — **eine Auswertung** für Kennzahlen, Tabelle und Aufgaben, bei jeder Anzeige berechnet:
  - Zeilenwerte: Kennung `MI–CAGE–Typ`, Version (letzter nicht zurückgezogener SEND), Einträge, freigegeben, offene Änderungen, abgelehnte Einträge, Sperrinhaber inkl. „inaktiv", Zeitpunkt des offenen SEND.
  - Kennzahlen (unabhängig von Filter/Suche).
  - „Meine Aufgaben": eigene Sperre, Einträge zu überarbeiten, wartet ≥ 1 Tag auf REPLY.
  - Filter (Kachel, Status mehrfach, Issue, Suche nach System/MI) mit Umwandlung von und in die Seitenadresse.
- `src/components/dashboard/dashboard.tsx` (ersetzt die Liste aus PROJ-2) — Aufbau laut Wireframe:
  - 4 Kacheln als Schaltflächen mit Zustand (`aria-pressed`); „Bestände" setzt alle Filter zurück.
  - „Meine Aufgaben" nur bei vorhandenen Aufgaben, mit Links zur DMRL.
  - Karte „DMRL-Bestände" mit Zähler, Suche, Status-Mehrfachauswahl, Issue-Auswahl und „Filter zurücksetzen".
  - Tabelle mit System/Kennung, Issue, Version, Einträge, Fortschritt (Balken), Workflow-Status mit „ausgecheckt von …" und „n zu überarbeiten", „Auswahl"; seitenweise ab 25; Leerhinweise laut PROJ-2 und „Keine DMRL entspricht dem Filter".
- Filterzustand steht in der Adresse (Zurück-Taste und Links behalten die Ansicht); maßgeblich ist der Zustand im Speicher, die Adresse wird nachgeführt.
- **BUG-QA1-3 behoben:** Die Spalte „Auswahl" bleibt beim waagerechten Scrollen am rechten Rand sichtbar; der Systemname ist zusätzlich ein Link.

**Tests**
- Unit: `dashboard.test.ts` (9, Admin 3/1/20/0, Anna nur PHUNGUN + Fahrzeug, 3 + 2 = 5 offene Änderungen, zurückgezogener SEND, Aufgaben inkl. Sichtbarkeit, Filter, Adresse) und `dashboard.test.tsx` (6, inkl. Regressionstest Zurücksetzen + Tippen); insgesamt 416 Unit-Tests grün.
- E2E: `tests/PROJ-16-dashboard.spec.ts` (2) — Kacheln, Kachel-Filter an/aus, Issue 4.2, Suche „PHUN", Zurück-Navigation behält den Filter, Benutzerwechsel; mobil 375 px „Auswahl" sichtbar.

**Gefunden und behoben**
- Beim ersten E2E-Lauf kehrte nach „Filter zurücksetzen" beim sofortigen Tippen der alte Filter zurück, weil die Adresse noch nicht aktualisiert war. Seither ist der Zustand im Speicher maßgeblich (Regressionstest vorhanden).

## QA Test Results

**Tested:** 2026-11-13
**App URL:** http://localhost:3000 (`npm run dev`); PROJ-19 zusätzlich Produktionsstart über `scripts/start.py`
**Tester:** QA Engineer (AI)
**Testumfang:** gemeinsamer QA-Lauf PROJ-7 bis PROJ-19
**Automatisiert:** Vitest 424 Tests ✅ · Startskript 12 Tests ✅ · Playwright 62/63 ✅ (1 ausstehend: BUG-QA2-4) — 58 Regressionstests + 5 neue QA-Tests (Chrome über `PW_CHANNEL=chrome`)
**Echte XSD-Prüfung:** xmllint (libxml2 2.9.13) in Unit-, Integrations- und E2E-Tests
**Browser:** Chrome (Desktop) getestet · Firefox und Safari **nicht getestet** (Playwright-Browser für diese Version nicht installiert)
**Responsive:** 375 px für alle Workflow-Seiten und Dialoge, 375/768/1440 px für die übrigen Seiten — kein waagerechtes Scrollen der Seite

### Acceptance Criteria Status
- [x] Kennzahlen (5/5), Meine Aufgaben (5/5), DMRL-Tabelle (9/9), Aktualität (2/2) — Unit (`dashboard.test.ts`), Komponententests, E2E (`PROJ-16-dashboard.spec.ts`)

### Edge Cases Status
- [x] DMRL ohne Einträge (0 / 0), System ohne DMRL, Berechtigungsentzug, inaktiver Sperrinhaber, zurückgezogener SEND, viele DMRLs (Seiten zu 25; Kennzahlen unabhängig von Suche)
- [x] BUG-QA1-3 (PROJ-2) behoben: „Auswahl" mobil sichtbar (E2E)
- [x] Zurück-Navigation behält den Filter — BUG-QA2-4 behoben 2026-11-14

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

#### BUG-QA2-4: Zurück-Taste stellt einen älteren Dashboard-Filter wieder her
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Dashboard: Kachel „Offene SEND" an- und abschalten, Issue-Filter setzen und zurücksetzen, „PHUN" in die Suche tippen
  2. „Auswahl PHUNGUN" öffnen, dann im Browser „Zurück"
  3. Expected: Dashboard mit Suche „PHUN" (Adresse `?suche=PHUN`)
  4. Actual: unter Last (paralleler Testlauf) in 5 von 6 Läufen ein älterer Stand (`/`, `?issue=4.2` oder `?kachel=send`); im Einzellauf meist korrekt
- **Ursache (vermutet):** mehrere schnell aufeinanderfolgende `router.replace`-Aufrufe des Next.js-Routers überholen sich; die zuletzt angezeigte Liste stimmt (Zustand im Speicher), die Adresse nicht
- **Test:** `tests/PROJ-16-dashboard.spec.ts` „Filter bleibt bei Zurück-Navigation erhalten (BUG-QA2-4)" — als `test.fixme` hinterlegt, nach der Behebung aktivieren
- **Priority:** Fix in next sprint
- **Status:** Behoben 2026-11-14 (`/frontend`) — Filteradresse wird mit dem nativen `window.history.replaceState` (von Next.js unterstützt) statt `router.replace` geschrieben: wirkt sofort, schnelle Änderungen überholen sich nicht. E2E „Filter bleibt bei Zurück-Navigation erhalten (BUG-QA2-4)" wieder aktiv; unter Last 24/24 Durchläufe grün (vorher 5 von 6 fehlerhaft)

### Summary
- **Acceptance Criteria:** 21/21 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
