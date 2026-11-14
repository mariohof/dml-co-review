# PROJ-7: DMRL-Ansicht

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — DMRL, Einträge, Archiv
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriffsschutz, Dashboard als Einstieg
- Requires: PROJ-6 (DMRL anlegen) — Kopfangaben der DMRL
- Requires: PROJ-17 (DMRL-Berechtigungen) — Sichtbarkeit für Bearbeiter
- Wird genutzt von: PROJ-9, 10, 12, 13, 15 (Aktionen werden aus der DMRL-Ansicht gestartet)

## Beschreibung
Die DMRL-Ansicht ist die zentrale Arbeitsseite einer DMRL. Sie zeigt Kopfdaten, Status, Sperre und alle Datenmodul-Einträge. Sie ist **reine Anzeige**: Einträge ändern sich ausschließlich über die Workflows Check-out/Check-in (PROJ-9/10) und REPLY-Import (PROJ-13), damit jede Änderung die Prüfungen durchläuft. Die Ansicht stellt die Schaltflächen für die Workflows bereit; deren Verhalten ist in den jeweiligen Features spezifiziert.

## Aufbau

```
DMRL-Ansicht
+-- Kopfbereich
|   +-- Systembezeichnung · Model Ident Code · S1000D-Issue
|   +-- Originator · DML-Typ · Sicherheitseinstufung
|   +-- Versionsindex (z. B. 00002-2026) · letzter SEND (Partner, Datum, Bearbeiter)
|   +-- DMRL-Status (farbiges Kennzeichen) · Sperre ("ausgecheckt von … seit …")
|   +-- Hinweisbanner, solange nicht freigegeben
+-- Aktionsleiste: Check-out · Check-in · SEND · REPLY importieren · Exportieren · Archiv
|   (+ Sperrinhaber/Administrator-Aktionen; Verhalten → PROJ-9, 10, 12, 13, 15, 18)
+-- Zählerleiste je Eintragsstatus
+-- Filter (Eintragsstatus, Eintragstyp) · Suche (DMC, Tech Name, Info Name)
+-- Eintragstabelle
|   +-- DMC · Tech Name · Info Name · Eintragstyp · Sicherheitseinstufung · Eintragsstatus · Partner-Kommentar
+-- Detailfenster (Klick auf Zeile): alle Felder des Eintrags
```

## Darstellung der Einträge

**DMC** wird aus den Einzelfeldern zusammengesetzt (gleich für Issue 2.3, 4.2 und 5.0):
`modelic-sdc-chapnum-section subsect-subject-discode discodev-incode incodev-itemloc`
Beispiel: `PHUNGUN-A-A05-40-0000-01A-000A-A`

Es gibt **zwei verschiedene Typ-Felder**, die nicht verwechselt werden dürfen:

| Begriff | XPath | Werte | Bedeutung |
|---|---|---|---|
| **Eintragstyp** (`dmentryType`) | `/dml/dmentry/@type` | leer, `n`, `c`, `d` | Änderungsart des DMRL-Eintrags in der Abstimmung mit dem Partner |
| **DM-Ausgabetyp** (`type`) | `/dml/dmentry/addresdm/issno/@type` | `new`, `changed`, `revised`, `deleted` | Art der Ausgabe des Datenmoduls selbst |

**Eintragstyp (`/dml/dmentry/@type`) — Bedeutung für die Abstimmung:**
| Eintragstyp | Anzeige | Bedeutung |
|-----|---------|-----------|
| `n` | „neu" | neuer Eintrag, wartet auf Abstimmung |
| `c` | „geändert" | geänderter Eintrag, wartet auf Abstimmung |
| `d` | „Löschung" (durchgestrichen, ausgegraut) | Löschung beantragt, wartet auf Abstimmung |
| leer | — | abgestimmt / genehmigt |

**DM-Ausgabetyp (`/dml/dmentry/addresdm/issno/@type`) = `deleted`:** Kennzeichen „DM gelöscht" — das Datenmodul ist gelöscht; der Eintrag bleibt zur Information in der DMRL. Der Wert wird vom Bearbeiter manuell eingetragen. Der DM-Ausgabetyp wird nur angezeigt (Detailfenster, Kennzeichen); er hat keinen Einfluss auf den Eintragsstatus.

## Regel REPLY → Eintrag (festgehalten für PROJ-13/14)
Betrifft ausschließlich den **Eintragstyp** (`/dml/dmentry/@type`); der DM-Ausgabetyp bleibt unverändert.
- `answer="y"` → **Eintragstyp wird entfernt**, Eintrag ist **genehmigt** (Status *freigegeben*). Gilt auch für Eintragstyp `d`: der Eintrag bleibt in der DMRL bestehen.
- `answer="n"` → **Eintragstyp bleibt**, Eintrag muss überarbeitet und erneut an den Partner gesendet werden (Status *zu überarbeiten*).

## User Stories
- Als **Bearbeiter** möchte ich alle Einträge einer DMRL mit DMC, Titel, Eintragstyp und Status sehen, damit ich den Stand der Abstimmung kenne.
- Als **Bearbeiter** möchte ich auf einen Blick sehen, ob die DMRL freigegeben, gesendet oder ausgecheckt ist und von wem, damit ich weiß, was als Nächstes zu tun ist.
- Als **Bearbeiter** möchte ich nach Status und Eintragstyp filtern und nach DMC oder Titel suchen, damit ich bei großen DMRLs gezielt die Einträge „zu überarbeiten" finde.
- Als **Bearbeiter** möchte ich die Kommentare des Partners zu abgelehnten Einträgen sehen, damit ich weiß, was zu überarbeiten ist.
- Als **Bearbeiter** möchte ich alle Felder eines Eintrags im Detail sehen, damit ich ihn vollständig prüfen kann.
- Als **Product Owner** möchte ich einen deutlichen Hinweis sehen, solange eine DMRL nicht freigegeben ist, damit niemand sie versehentlich in einem TP-Projekt verwendet.

## Out of Scope
- Direkte Bearbeitung von Einträgen in der Anwendung — bewusst ausgeschlossen (nur über Workflows)
- Verhalten der Aktionen Check-out, Check-in, SEND, REPLY, Archiv → PROJ-9, 10, 12, 13, 15
- Ermittlung/Änderung des DMRL-Status → PROJ-14
- Schalter „Löschungen ausblenden"
- Entfernen von Einträgen aus der DMRL nach genehmigter Löschung (Einträge bleiben bestehen)
- Sortierung/Spaltenauswahl durch den Benutzer (feste Sortierung nach DMC)
- Export der Ansicht (Druck, PDF)
- Learn Code / Learn Event Code (Issue 4.2/5.0) — nicht im Datenmodell

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Bearbeiter ist für eine DMRL berechtigt, wenn er sie im Dashboard anklickt, dann öffnet sich die DMRL-Ansicht
- [ ] Angenommen ein Administrator ist angemeldet, wenn er eine beliebige DMRL im Dashboard anklickt, dann öffnet sich die DMRL-Ansicht
- [ ] Angenommen ein Bearbeiter ist für eine DMRL nicht berechtigt, wenn er ihre Ansicht direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)
- [ ] Angenommen eine DMRL existiert nicht (mehr), wenn ihre Ansicht direkt aufgerufen wird, dann erscheint „DMRL nicht gefunden" mit Link zum Dashboard

### Kopfbereich
- [ ] Angenommen die DMRL-Ansicht ist geöffnet, wenn der Kopfbereich angezeigt wird, dann zeigt er Systembezeichnung, Model Ident Code, S1000D-Issue, Originator (CAGE-Code und Name), DML-Typ, Sicherheitseinstufung und DMRL-Status
- [ ] Angenommen die DMRL wurde mindestens einmal gesendet, wenn der Kopfbereich angezeigt wird, dann zeigt er den aktuellen Versionsindex sowie Partner, Datum und Bearbeiter des letzten SEND
- [ ] Angenommen die DMRL wurde noch nie gesendet, wenn der Kopfbereich angezeigt wird, dann steht beim Versionsindex „— noch nicht gesendet —"
- [ ] Angenommen die DMRL ist ausgecheckt, wenn der Kopfbereich angezeigt wird, dann zeigt er „Ausgecheckt von [Name] seit [Datum/Uhrzeit]"
- [ ] Angenommen die DMRL ist nicht freigegeben, wenn die Ansicht angezeigt wird, dann erscheint das Banner „Nicht freigegeben — darf nicht in einem Technische-Publikation-Projekt verwendet werden"
- [ ] Angenommen die DMRL ist freigegeben, wenn die Ansicht angezeigt wird, dann erscheint kein Banner und der Status ist als „freigegeben" hervorgehoben

### Zählerleiste
- [ ] Angenommen die DMRL hat Einträge, wenn die Zählerleiste angezeigt wird, dann zeigt sie die Anzahl je Eintragsstatus (in Bearbeitung, gesendet, freigegeben, zu überarbeiten) und die Gesamtzahl
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL PHUNGUN geöffnet wird, dann zeigt die Zählerleiste 32 Einträge, davon 32 gesendet

### Eintragstabelle
- [ ] Angenommen die DMRL hat Einträge, wenn die Tabelle angezeigt wird, dann zeigt sie je Eintrag DMC, Tech Name, Info Name, Eintragstyp, Sicherheitseinstufung, Eintragsstatus und Partner-Kommentar, sortiert nach DMC
- [ ] Angenommen ein Eintrag hat die Felder `PHUNGUN`, `A`, `A05`, `4`, `0`, `0000`, `01`, `A`, `000`, `A`, `A`, wenn die Tabelle angezeigt wird, dann lautet sein DMC `PHUNGUN-A-A05-40-0000-01A-000A-A`
- [ ] Angenommen ein Eintrag hat Eintragstyp `n`, `c` oder `d`, wenn die Tabelle angezeigt wird, dann wird der Eintragstyp als „neu", „geändert" bzw. „Löschung" angezeigt
- [ ] Angenommen ein Eintrag hat Eintragstyp `d`, wenn die Tabelle angezeigt wird, dann ist die Zeile durchgestrichen und ausgegraut
- [ ] Angenommen ein Eintrag hat einen leeren Eintragstyp, wenn die Tabelle angezeigt wird, dann ist die Spalte Eintragstyp leer
- [ ] Angenommen ein Eintrag hat den DM-Ausgabetyp `deleted` (`addresdm/issno/@type`), wenn die Tabelle angezeigt wird, dann trägt er das Kennzeichen „DM gelöscht"
- [ ] Angenommen ein Eintrag hat Status „zu überarbeiten", wenn die Tabelle angezeigt wird, dann ist der Status farblich hervorgehoben und der Partner-Kommentar sichtbar
- [ ] Angenommen eine Zeile wird angeklickt oder per Tastatur ausgewählt, wenn das Detailfenster öffnet, dann zeigt es alle Felder des Eintrags (inkl. `rpc`, `rpcname`, `language`, `country`, `issno`, DM-Ausgabetyp `type`, Datum, `answer`, `answer_comment`, `remarks`) ohne Bearbeitungsmöglichkeit
- [ ] Angenommen die DMRL hat keine Einträge, wenn die Ansicht angezeigt wird, dann erscheint „Noch keine Einträge — Einträge werden über Check-out/Check-in erfasst"

### Filter & Suche
- [ ] Angenommen die Tabelle wird angezeigt, wenn ein Eintragsstatus als Filter gewählt wird, dann werden nur Einträge mit diesem Status angezeigt
- [ ] Angenommen die Tabelle wird angezeigt, wenn ein Eintragstyp als Filter gewählt wird (neu, geändert, Löschung, ohne Typ), dann werden nur Einträge mit diesem Eintragstyp angezeigt
- [ ] Angenommen die Tabelle wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur Einträge angezeigt, deren DMC, Tech Name oder Info Name den Begriff enthält (ohne Unterscheidung Groß-/Kleinschreibung)
- [ ] Angenommen Filter und Suche liefern keine Treffer, wenn die Tabelle angezeigt wird, dann erscheint „Keine Einträge gefunden" mit der Aktion „Filter zurücksetzen"

### Reine Anzeige
- [ ] Angenommen die DMRL-Ansicht ist geöffnet, wenn ein Eintrag betrachtet wird, dann gibt es keine Möglichkeit, ihn direkt zu ändern, hinzuzufügen oder zu löschen

### Aktionsleiste
- [ ] Angenommen die DMRL-Ansicht ist geöffnet, wenn die Aktionsleiste angezeigt wird, dann enthält sie Check-out, Check-in, SEND, REPLY importieren und Archiv; Verfügbarkeit und Verhalten richten sich nach PROJ-9, 10, 12, 13, 15

## Edge Cases
- **Große DMRL (mehrere hundert Einträge):** Tabelle bleibt bedienbar (Seitenweise Anzeige oder Scrollen); Filter und Suche reagieren ohne spürbare Verzögerung.
- **Leere DMC-Teilfelder:** werden im DMC als leerer Abschnitt dargestellt, kein Absturz.
- **Sehr lange Tech-/Info-Namen:** werden in der Tabelle gekürzt, im Detailfenster vollständig angezeigt.
- **DMRL wird in anderem Tab ausgecheckt:** Sperre wird beim nächsten Laden angezeigt.
- **Bearbeiter verliert Berechtigung, während Ansicht geöffnet ist:** nächster Seitenaufruf → „Keine Berechtigung".
- **Eintragstyp `d` mit `answer="y"`:** Eintragstyp ist leer, Zeile nicht mehr durchgestrichen; ggf. Kennzeichen „DM gelöscht", falls der DM-Ausgabetyp `deleted` gesetzt ist.
- **Mobile Ansicht:** Tabelle horizontal scrollbar, Kopfbereich untereinander.

## Technical Requirements (optional)
- Zugriff nur für berechtigte Bearbeiter und Administratoren (PROJ-2, PROJ-17)
- Reine Anzeige — keine Schreibzugriffe aus dieser Ansicht heraus (außer über die Workflow-Aktionen)
- Tastaturbedienbarkeit der Tabelle und des Detailfensters

## Open Questions
- [x] DMC-Zusammensetzung für Issue 4.2 / 5.0 → gleiche 11 Felder und gleiche Darstellung für alle Issues (Mapping PROJ-12); Learn Code wird nicht unterstützt (2026-11-12)
- [x] Soll die Spalte „Sicherheitseinstufung" Abweichungen zur DMRL-Einstufung hervorheben? → Nein, unabhängig (PROJ-6) (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| DMRL-Ansicht ist reine Anzeige; Änderungen nur über Workflows | Vorgabe Product Owner — jede Änderung durchläuft die Prüfungen | 2026-11-12 |
| Kopfbereich mit Versionsindex, letztem SEND, Status, Sperre und Hinweisbanner | Bearbeiter sieht sofort Stand und nächste Schritte; TP-Sperre sichtbar (PRD) | 2026-11-12 |
| DMC als zusammengesetzter Code in einer Spalte | Lesbarkeit; Einzelfelder im Detailfenster | 2026-11-12 |
| Filter nach Status und Eintragstyp, Suche über DMC/Tech Name/Info Name | Gezieltes Finden abgelehnter Einträge | 2026-11-12 |
| Eintragstyp `d` wird angezeigt (durchgestrichen); kein Schalter „Löschungen ausblenden" | Vorgabe Product Owner | 2026-11-12 |
| REPLY `answer="y"` entfernt den Eintragstyp (`dmentry/@type`), Eintrag genehmigt; `answer="n"` behält ihn, zu überarbeiten | Vorgabe Product Owner (Regel für PROJ-13/14) | 2026-11-12 |
| Genehmigte Löschung (`d` + `y`): Eintrag bleibt in der DMRL, nur der Eintragstyp wird entfernt | Vorgabe Product Owner | 2026-11-12 |
| DM-Ausgabetyp `addresdm/issno/@type = deleted` kennzeichnet gelöschte Datenmodule; manuell vom Bearbeiter gesetzt; Anzeige „DM gelöscht" | Vorgabe Product Owner | 2026-11-12 |
| Zwei Typ-Felder getrennt benannt: „Eintragstyp" (`/dml/dmentry/@type`) und „DM-Ausgabetyp" (`/dml/dmentry/addresdm/issno/@type`) | Hinweis Product Owner — Verwechslungsgefahr | 2026-11-12 |
| Aktionsleiste in der Ansicht, Verhalten in den Workflow-Features | Ein zentraler Einstieg für alle Workflows | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Wiederverwendbare, nur lesende Eintragstabelle (PROJ-7/14/15) | Einheitliche Darstellung, einmal gebaut | 2026-11-12 |
| Seitenweise Anzeige, 50 Einträge je Seite | Performance bei großen DMRLs | 2026-11-12 |
| Detailfenster als seitliches Sheet | Tabelle bleibt sichtbar | 2026-11-12 |
| Aktionsleiste ohne eigene Logik; Verfügbarkeit + Grund aus den Workflow-Regeln | Keine doppelte Logik | 2026-11-12 |
| Gemeinsame DMC-Darstellung und Status-/Typ-Badges | Konsistenz über alle Seiten | 2026-11-12 |
| Ergänzt: Freigabe-Nachweis, Partner-Bemerkung, Export, Aktionen für Sperrinhaber/Administrator | Anforderungen aus PROJ-9/12/13/14/18 | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
### Überblick
Die DMRL-Ansicht (`/dmrl/[ID]`) ist die zentrale Arbeitsseite. Sie ist reine Anzeige und Startpunkt aller Workflow-Aktionen. Kernbaustein ist eine **wiederverwendbare Eintragstabelle (nur lesend)**, die auch für Freigabestände (PROJ-14) und archivierte Stände (PROJ-15) genutzt wird. Alles im Browser, kein Backend nötig.

### A) Komponentenstruktur
```
Seite „DMRL-Ansicht" (/dmrl/[ID])
+-- Zugriffswächter „DMRL erlaubt?" (PROJ-2) · „DMRL nicht gefunden"
+-- Kopfbereich (shadcn Card)
|   +-- Systembezeichnung · MI · Issue · Originator (CAGE + Name) · DML-Typ · Sicherheitseinstufung
|   +-- Versionsindex + letzter SEND (Partner, Datum, Bearbeiter) bzw. „— noch nicht gesendet —"
|   +-- Status-Badge · Sperre „Ausgecheckt von … seit …"
|   +-- Freigabe-Nachweis bzw. „Letzte Freigabe …" mit „Freigabestand anzeigen" (PROJ-14)
|   +-- Bemerkung des Partners aus dem letzten REPLY (PROJ-13)
|   +-- Banner „Nicht freigegeben …" (shadcn Alert)
+-- Aktionsleiste (Schaltflächen; Verfügbarkeit aus den Workflow-Regeln, gesperrte mit Tooltip-Grund)
|   +-- Check-out · Check-in · SEND · REPLY importieren · Exportieren (CSV/XML) · Archiv
|   +-- nur Sperrinhaber: „Check-out zurücknehmen" · „CSV erneut herunterladen" (PROJ-9)
|   +-- nur Administrator: „Sperre aufheben" (PROJ-9) · „SEND zurückziehen" (PROJ-12)
+-- Eintragstabelle (wiederverwendbar, nur lesend)
    +-- Zählerleiste je Eintragsstatus + Gesamt
    +-- Filter: Eintragsstatus · Eintragstyp (shadcn Select) · Suche (Input)
    +-- Tabelle (shadcn Table), sortiert nach DMC, seitenweise (shadcn Pagination, 50 je Seite)
    |   +-- DMC · Tech Name · Info Name · Eintragstyp · Sicherheitseinstufung · Status · Partner-Kommentar
    |   +-- Kennzeichen „DM gelöscht"; Zeilen mit `d` durchgestrichen/ausgegraut; „zu überarbeiten" hervorgehoben
    +-- Leer / „Keine Einträge gefunden" + „Filter zurücksetzen"
    +-- Detailfenster (shadcn Sheet, seitlich): alle 27 Felder, nur lesend
```
Die Dialoge der Aktionen (Check-in-Zusammenfassung, SEND-Dialog usw.) gehören zu den jeweiligen Features und werden aus der Aktionsleiste geöffnet.

### B) Datenmodell (in Klartext)
Keine Änderung — liest DMRL, Einträge, Archivstände, Freigabe-Nachweis und Sperre aus dem Datenbestand (PROJ-1). **Abgeleitet** (nicht gespeichert): DMC-Darstellung, Versionsindex und letzter SEND (letzter nicht zurückgezogener SEND im Archiv), Zähler je Status.

### C) Gemeinsame Bausteine
| Baustein | Genutzt von |
|---|---|
| **Eintragstabelle (nur lesend)** mit Zählern, Filter, Suche, Seiten, Detailfenster; optional Spalten für Antworten | PROJ-7, PROJ-14 (Freigabestand), PROJ-15 (archivierte Stände) |
| **DMC-Darstellung** aus den 11 Feldern | Tabelle, Prüfberichte (PROJ-8), Zusammenfassungen (PROJ-10/13), Dashboard-Aufgaben |
| **Status- und Eintragstyp-Kennzeichen** (Badges mit festen Farben laut Design-System) | Ansicht, Dashboard (PROJ-16), Verwaltung (PROJ-6) |
| **Aktions-Verfügbarkeit** je Aktion: erlaubt ja/nein + Grund — kommt aus den Regeln der Workflow-Features | Aktionsleiste |

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Wiederverwendbare Eintragstabelle | Ansicht, Freigabestand und Archiv zeigen Einträge identisch — einmal bauen, dreimal nutzen. |
| Seitenweise Anzeige (50 je Seite) statt alles auf einmal | Auch große DMRLs bleiben flüssig; Filter/Suche wirken auf alle Einträge. |
| Detailfenster seitlich (Sheet) | Tabelle bleibt sichtbar; schnelles Durchklicken mehrerer Einträge. |
| Aktionen fragen ihre Verfügbarkeit bei den Workflow-Regeln ab | Ansicht enthält keine eigene Workflow-Logik; gesperrte Aktionen erklären den Grund. |
| Versionsindex und letzter SEND werden aus dem Archiv abgeleitet | Eine Quelle der Wahrheit (PROJ-1). |
| Feste Sortierung nach DMC | Laut Spec; einfache, vorhersagbare Darstellung. |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** shadcn Table, Pagination, Select, Input, Badge, Card, Alert, Sheet, Tooltip sind installiert.

### F) Testbarkeit
- Unit-Tests: DMC-Darstellung (inkl. leerer Teilfelder), Filter/Suche, Zähler, Ableitung Versionsindex (inkl. zurückgezogener SEND).
- E2E: Demo PHUNGUN (32 Einträge gesendet, Versionsindex 00002-2026, Banner), Filter/Suche, Detailfenster, Bearbeiter ohne Berechtigung, unbekannte DMRL.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-7`_

**Umgesetzt**
- `src/lib/dmrl/entries.ts` — gemeinsame Bausteine: DMC-Darstellung (gleich für 2.3/4.2/5.0), Sortierung nach DMC, Filter (Eintragsstatus, Eintragstyp inkl. „ohne Typ", Suche in DMC/Tech Name/Info Name), Zähler je Status, Feldbeschriftungen, Kennzeichen „DM gelöscht".
- `src/lib/dmrl/actions.ts` — Verfügbarkeit der Aktionen (sichtbar / gesperrt + Grund). Workflow-Aktionen sind vorerst gesperrt mit Hinweis „folgt mit PROJ-x"; Sperrinhaber- und Administrator-Aktionen erscheinen nur in der passenden Situation.
- `src/components/dmrl/` — `DmrlView` (Seite `/dmrl/[ID]`), `DmrlHeader` (Stammdaten, Versionsindex + letzter SEND, Status, Sperre, Banner „Nicht freigegeben", Freigabe-Nachweis bzw. „Letzte Freigabe", Partner-Bemerkung), `DmrlActionBar`, **wiederverwendbare `EntryTable`** (Zählerleiste als Filter, Suche, Filter, 50 je Seite mit deutscher Seitennavigation, Löschungen durchgestrichen, „zu überarbeiten" hervorgehoben, Leer-/Keine-Treffer-Zustand mit „Filter zurücksetzen"), `EntryDetailSheet` (alle 27 Felder in Gruppen, per Klick oder Tastatur), Status-/Typ-Badges.
- `src/lib/data/queries.ts` — letzter SEND mit Partner/Bearbeiter, deutsche Datumsformate.

**Tests**: `entries.test.ts` (9), `dmrl-view.test.tsx` (11) — insgesamt 204 Tests grün.

**Hinweise**
- Aktionen (Check-out, Check-in, SEND, REPLY, Export, Archiv) werden mit PROJ-9/10/12/13/15/18 aktiviert; „Freigabestand anzeigen" folgt mit PROJ-14.
- Browser-E2E-Tests stehen aus → `/qa`.

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
- [x] Zugriff (4/4): Dashboard → Ansicht (Bearbeiter, Admin), „Keine Berechtigung", „DMRL nicht gefunden" mit Link „Zum Dashboard" — E2E
- [x] Kopfbereich (6/6): Stammdaten, Versionsindex + letzter SEND, „— noch nicht gesendet —", Sperre, Banner, Freigabe-Nachweis — Komponententests + E2E
- [x] Zählerleiste (2/2), Eintragstabelle (9/9) inkl. DMC-Aufbau, Eintragstyp-Texte, Durchstreichen bei `d`, „DM gelöscht", Hervorhebung „zu überarbeiten", Detailfenster per Klick/Tastatur, Leerhinweis
- [x] Filter & Suche (4/4), Reine Anzeige (1/1)
- [x] Aktionsleiste (1/1): alle Aktionen angebunden; „Check-in" nur für den Sperrinhaber sichtbar (Festlegung PROJ-10)

### Edge Cases Status
- [x] Große DMRL: Seiten zu 50 Einträgen (Komponententest 60 Einträge); leere DMC-Teile; lange Namen gekürzt/Detail vollständig; Sperre aus anderem Tab beim nächsten Laden; Berechtigungsentzug; `d` + `y`; mobile Ansicht (375 px ohne waagerechtes Scrollen der Seite)

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 27/27 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
