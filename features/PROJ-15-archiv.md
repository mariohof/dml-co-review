# PROJ-15: Archiv SEND/REPLY

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Archiv", Tabellendarstellung
- Requires: PROJ-12 (SEND), PROJ-13 (REPLY) — archivierte XML-Dateien
- Requires: PROJ-14 (Freigabestatus) — Freigabestände
- Requires: PROJ-9, PROJ-10 — Verlaufseinträge Check-out/Check-in
- Requires: PROJ-17 (Berechtigungen)
- Requires: PROJ-1 (Datenhaltung) — Demo-Archiv PHUNGUN

## Beschreibung
Das Archiv macht den Austausch mit dem Partner und alle Bearbeitungsschritte einer DMRL nachvollziehbar. Es zeigt je DMRL alle SEND- und REPLY-Stände (byte-genau herunterladbar und als Tabelle einsehbar), alle Freigabestände und einen chronologischen Workflow-Verlauf. Das Archiv ist nur lesend; nichts kann gelöscht werden (PRD: „Alle SEND- und REPLY-Stände werden dauerhaft archiviert").

## Aufbau
Archivseite je DMRL, erreichbar über die Aktion **„Archiv"** in der DMRL-Ansicht (PROJ-7). Kopf: System, MI, Issue, aktueller DMRL-Status. Drei Registerkarten:

### 1. Austausch
- Alle SENDs und REPLYs, neueste oben, als Kette (z. B. `SEND 00002-2026 → REPLY C1234 00001-2026 → SEND 00001-2026`)
- Je Eintrag: Richtung (SEND/REPLY), Versionsindex, Partner (CAGE + Name), Datum/Uhrzeit, Bearbeiter, Bezug (`dmlref`), Anzahl Einträge (bei REPLY: freigegeben/zu überarbeiten), Dateiname
- Zurückgezogene SENDs: Kennzeichen „zurückgezogen" mit Datum, Administrator und Begründung (PROJ-12)
- Aktionen:
  - **„Herunterladen"** — Original-XML, byte-genau, Original-Dateiname
  - **„Anzeigen"** — Inhalt als Tabelle wie PROJ-7 (nur lesend, Suche/Filter), Kopfdaten der Datei; bei REPLY mit Antwort und Kommentar je Eintrag sowie Partner-Bemerkung
- Leer: „Noch kein Austausch mit einem Partner"

### 2. Freigabestände
- Alle Freigabestände (PROJ-14), neueste oben: Datum, REPLY (Partner + Versionsindex), Bearbeiter, Anzahl Einträge
- Aktionen: „Anzeigen", „Als CSV exportieren", „Als XML exportieren" (wie PROJ-14)
- Leer: „Die DMRL wurde noch nie freigegeben"

### 3. Verlauf
Alle Workflow-Schritte chronologisch (neueste oben): Datum/Uhrzeit, Benutzer, Aktion, Details. Filter nach Aktionsart.

| Aktion | Details | Quelle |
|---|---|---|
| Check-out | — | PROJ-9 |
| Check-out zurückgenommen | — | PROJ-9 |
| Sperre aufgehoben durch Administrator | Sperrinhaber | PROJ-9 |
| Check-in | Anzahl neu/geändert/unverändert | PROJ-10 |
| Check-in abgelehnt | Anzahl Fehler | PROJ-10 |
| SEND | Versionsindex, Partner | PROJ-12 |
| SEND fehlgeschlagen | XSD-Prüfung | PROJ-12 |
| SEND zurückgezogen | Versionsindex, Begründung | PROJ-12 |
| REPLY übernommen | Versionsindex, Partner, Anzahl freigegeben/zu überarbeiten, ggf. „DMRL freigegeben" | PROJ-13 |
| REPLY abgelehnt | Dateiname, „XSD: n Fehler" bzw. „Regelwerk: n Fehler" | PROJ-13 |
| Kopfdaten geändert | Feld alt → neu (Sicherheitseinstufung, Originator, DML-Typ) | PROJ-6 |

Nicht protokolliert: abgebrochene Check-ins/REPLYs, Berechtigungsänderungen (PROJ-17), Exporte (PROJ-18), Prüfberichte selbst.

Leer: „Noch keine Workflow-Schritte"

## Zugriff
- Berechtigte Bearbeiter (PROJ-17) und Administratoren; nur lesend
- Nichts kann gelöscht oder geändert werden
- Archiv bleibt auch erhalten, wenn Benutzer deaktiviert oder Organisationen umbenannt werden (Namen werden aktuell angezeigt, CAGE-Code bleibt)

## Demo-Daten
- PHUNGUN: Austausch mit den 3 Beispieldateien (SEND 00001-2026, REPLY C1234 00001-2026, SEND 00002-2026) (PROJ-1)
- PHUNGUN-Verlauf: passende Einträge „SEND", „REPLY übernommen", „SEND" mit Demo-Bearbeiter und den Datumsangaben der Dateien
- Fahrzeug/Fluggerät: leeres Archiv

## User Stories
- Als **Bearbeiter** möchte ich alle SEND- und REPLY-Stände einer DMRL sehen, damit ich den Austausch mit dem Partner nachvollziehen kann.
- Als **Bearbeiter** möchte ich jede archivierte Datei unverändert herunterladen, damit ich sie erneut an den Partner senden oder als Nachweis verwenden kann.
- Als **Bearbeiter** möchte ich den Inhalt eines archivierten Stands als Tabelle einsehen, ohne die Datei herunterzuladen.
- Als **Bearbeiter** möchte ich im Verlauf sehen, wer wann ausgecheckt, eingecheckt, gesendet oder einen REPLY übernommen hat.
- Als **Bearbeiter** möchte ich frühere Freigabestände abrufen und exportieren.
- Als **Product Owner** möchte ich an PHUNGUN die vollständige Austauschkette vorführen.

## Out of Scope
- Archivübersicht über alle DMRLs → ggf. PROJ-16 (Dashboard)
- Vergleich (Diff) zweier Stände
- Löschen oder Bearbeiten von Archiveinträgen
- Speichern der Prüfberichte abgelehnter Dateien
- Archivierung der CSV-Dateien aus Check-out/Check-in
- Protokoll von Berechtigungsänderungen und Exporten
- Export des Verlaufs
- Volltextsuche über alle archivierten Dateien

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein berechtigter Bearbeiter öffnet die DMRL-Ansicht, wenn er „Archiv" wählt, dann öffnet sich die Archivseite mit den Registerkarten Austausch, Freigabestände, Verlauf
- [ ] Angenommen ein Bearbeiter ist für die DMRL nicht berechtigt, wenn er das Archiv direkt aufruft, dann erscheint „Keine Berechtigung"
- [ ] Angenommen das Archiv ist geöffnet, wenn es angezeigt wird, dann gibt es keine Aktion zum Löschen oder Ändern

### Austausch
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn das Archiv von PHUNGUN geöffnet wird, dann zeigt „Austausch" drei Einträge: SEND 00002-2026, REPLY C1234 00001-2026, SEND 00001-2026 (neueste oben) mit Partner, Datum, Bearbeiter, Bezug und Anzahl Einträge
- [ ] Angenommen ein archivierter Stand wird „Herunterladen", wenn die Datei gespeichert wird, dann ist sie byte-genau identisch mit der gesendeten bzw. importierten Datei und trägt den Original-Dateinamen
- [ ] Angenommen ein REPLY wird „Anzeigen", wenn die Tabelle geöffnet wird, dann zeigt sie alle Einträge mit Antwort und Kommentar sowie die Partner-Bemerkung, nur lesend
- [ ] Angenommen ein SEND wurde zurückgezogen, wenn „Austausch" angezeigt wird, dann ist er als „zurückgezogen" mit Datum, Administrator und Begründung gekennzeichnet
- [ ] Angenommen eine DMRL wurde nie gesendet, wenn „Austausch" angezeigt wird, dann erscheint „Noch kein Austausch mit einem Partner"

### Freigabestände
- [ ] Angenommen eine DMRL wurde zweimal freigegeben, wenn „Freigabestände" angezeigt wird, dann erscheinen beide mit Datum, REPLY und Bearbeiter, neueste oben
- [ ] Angenommen ein Freigabestand wird angezeigt, wenn „Als CSV exportieren" oder „Als XML exportieren" gewählt wird, dann wird die Datei wie in PROJ-14 heruntergeladen
- [ ] Angenommen eine DMRL wurde nie freigegeben, wenn „Freigabestände" angezeigt wird, dann erscheint „Die DMRL wurde noch nie freigegeben"

### Verlauf
- [ ] Angenommen ein Check-out, Check-in, SEND oder REPLY wurde ausgeführt, wenn der Verlauf angezeigt wird, dann enthält er den Schritt mit Datum, Benutzer, Aktion und Details laut Tabelle
- [ ] Angenommen ein Check-in wurde wegen Fehlern abgelehnt, wenn der Verlauf angezeigt wird, dann steht dort „Check-in abgelehnt — [n] Fehler"
- [ ] Angenommen ein REPLY wurde abgelehnt, wenn der Verlauf angezeigt wird, dann steht dort „REPLY abgelehnt" mit Dateiname und Art/Anzahl der Fehler
- [ ] Angenommen ein Check-in wurde in der Zusammenfassung abgebrochen, wenn der Verlauf angezeigt wird, dann gibt es dafür keinen Eintrag
- [ ] Angenommen ein Administrator ändert die Sicherheitseinstufung der DMRL von 01 auf 02, wenn der Verlauf angezeigt wird, dann steht dort „Kopfdaten geändert: Sicherheitseinstufung 01 → 02"
- [ ] Angenommen der Verlauf hat viele Einträge, wenn nach „SEND" gefiltert wird, dann werden nur SEND-bezogene Einträge angezeigt
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn der Verlauf von PHUNGUN angezeigt wird, dann enthält er SEND, REPLY übernommen, SEND passend zu den Archivdateien

## Edge Cases
- **Benutzer deaktiviert:** Name bleibt im Archiv/Verlauf sichtbar (ggf. mit „inaktiv").
- **Organisation umbenannt:** Archiv zeigt CAGE-Code und aktuellen Namen; die archivierte Datei bleibt unverändert.
- **Sehr viele Archiveinträge / Verlaufseinträge:** Liste blättert oder lädt nach; keine spürbare Verzögerung.
- **Archivierte Datei mit CRLF-Zeilenenden (Beispieldateien):** Download behält die Zeilenenden (byte-genau).
- **DMRL wird gelöscht:** nur ohne Workflow möglich (PROJ-6) — dann gibt es kein Archiv.
- **Demo-Daten neu laden:** Archiv und Verlauf werden auf den Demo-Stand zurückgesetzt.
- **Speicher voll:** Archivierung beim SEND/REPLY schlägt fehl → Vorgang abgebrochen (PROJ-12/13); bestehendes Archiv bleibt.

## Technical Requirements (optional)
- Archivierte Dateien unveränderlich, byte-genau
- Anzeige eines archivierten Stands mit 1.000 Einträgen ohne spürbare Verzögerung
- Darstellung archivierter XML-Dateien aller drei Issues (2.3/4.2/5.0)

## Open Questions
- [x] Soll es eine Archivübersicht über alle DMRLs geben (z. B. im Dashboard, PROJ-16)? → Nein, nicht im MVP; Archiv je DMRL reicht (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Archivseite je DMRL mit Registerkarten Austausch, Freigabestände, Verlauf | Vorgabe Product Owner | 2026-11-12 |
| Herunterladen byte-genau und Anzeigen als Tabelle | PRD: jederzeit Zugriff auf jede DMRL-Version | 2026-11-12 |
| Nur lesend, nichts löschbar | PRD: dauerhafte Archivierung | 2026-11-12 |
| Admin-Änderungen an Kopfdaten werden protokolliert | Nachvollziehbarkeit (offene Frage aus PROJ-9) | 2026-11-12 |
| Abgelehnte Check-ins/REPLYs und fehlgeschlagene SENDs werden protokolliert, ohne Prüfbericht | Nachvollziehbarkeit bei geringem Speicherbedarf | 2026-11-12 |
| Abgebrochene Vorgänge, Berechtigungsänderungen und Exporte werden nicht protokolliert | Kein fachlicher Schritt / bewusst ausgeschlossen (PROJ-17) | 2026-11-12 |
| Demo-Verlauf für PHUNGUN passend zu den Archivdateien | Durchgängige Demo | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Archivseite `/dmrl/[ID]/archiv` mit Registerkarten, gewählte Karte in der Adresse | Verlinkbar, Zurück-Taste | 2026-11-12 |
| Eigene Seite für archivierten Stand `/dmrl/[ID]/archiv/[Stand-ID]` | Platz für große Tabellen, verlinkbar | 2026-11-12 |
| Anzeige liest archivierte Datei mit DML-Leser (PROJ-8) neu ein | Exakt der archivierte Inhalt | 2026-11-12 |
| Namen über IDs aktuell angezeigt, Datei unverändert | Umbenennung sichtbar, Nachweis byte-genau | 2026-11-12 |
| Ausschließlich Lesen; Wiederverwendung Eintragstabelle, Download-Helfer, Freigabestand-Export | Keine neuen Bausteine | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Das Archiv ist eine **reine Anzeigeseite je DMRL** mit drei Registerkarten. Es nutzt ausschließlich vorhandene Bausteine: Eintragstabelle (PROJ-7), DML-Leser (PROJ-8), Download-Helfer (PROJ-9), Freigabestand-Seite und -Export (PROJ-14), Rechte-Regel (PROJ-2). Nichts wird geschrieben. Alles im Browser, kein Backend nötig.

### A) Seiten und Komponentenstruktur
```
Seite „Archiv" (/dmrl/[ID]/archiv?ansicht=austausch|freigaben|verlauf)
+-- Zugriffswächter „DMRL erlaubt?" (PROJ-2)
+-- Kopf: System · MI · Issue · aktueller DMRL-Status · Link zurück zur DMRL
+-- Registerkarten (shadcn Tabs; gewählte Karte steht in der Adresse)
    +-- „Austausch"
    |   +-- Liste der Archivstände, neueste oben (shadcn Table)
    |   |   +-- Richtung (Badge SEND/REPLY) · Versionsindex · Partner (CAGE + Name) · Datum · Bearbeiter
    |   |   +-- Bezug (`dmlref`) · Einträge (bei REPLY: freigegeben / zu überarbeiten) · Dateiname
    |   |   +-- Kennzeichen „zurückgezogen" mit Datum, Administrator, Begründung (Tooltip/Zeile)
    |   |   +-- Aktionen: „Anzeigen" · „Herunterladen"
    |   +-- Leer: „Noch kein Austausch mit einem Partner"
    +-- „Freigabestände"
    |   +-- Liste: Datum · REPLY · Bearbeiter · Anzahl Einträge
    |   +-- Aktionen: „Anzeigen" (→ Freigabestand-Seite PROJ-14) · „Als CSV exportieren" · „Als XML exportieren"
    |   +-- Leer: „Die DMRL wurde noch nie freigegeben"
    +-- „Verlauf"
        +-- Filter nach Aktionsart (shadcn Select)
        +-- Tabelle: Datum/Uhrzeit · Benutzer · Aktion · Details (seitenweise)
        +-- Leer: „Noch keine Workflow-Schritte"

Seite „Archivierter Stand" (/dmrl/[ID]/archiv/[Stand-ID])
+-- Kopf: Richtung · Versionsindex · Partner · Datum · Bearbeiter · Bezug · Bemerkung (dml/remarks) · „Herunterladen"
+-- Eintragstabelle (PROJ-7, nur lesend) — bei REPLY mit Spalten Antwort und Kommentar
+-- Falls die Datei nicht lesbar ist: Hinweis „Inhalt kann nicht angezeigt werden" — Download bleibt möglich
```

### B) Datenmodell (in Klartext)
Keine Änderung, nur Lesen (PROJ-1): Archivstände (inkl. Originaldatei, Zuordnung REPLY ↔ SEND, Kennzeichen „zurückgezogen"), Freigabestände, Verlaufseinträge. **Namen** von Benutzern und Organisationen werden über die gespeicherte ID mit dem **aktuellen** Namen angezeigt; inaktive Benutzer mit Badge „inaktiv". Die archivierte Datei selbst bleibt unverändert.

### C) Abläufe
- **Herunterladen:** Download-Helfer liefert die gespeicherte Originaldatei unverändert mit Original-Dateinamen.
- **Anzeigen:** archivierte Datei mit dem DML-Leser für das Issue des Systems lesen → Eintragstabelle. Kein erneutes Prüfen.
- **Verlauf filtern:** Filter wirkt nur auf die Anzeige.

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Registerkarten mit eigener Adresse je Karte | Direkt verlinkbar (z. B. „Verlauf" aus dem Dashboard); Zurück-Taste funktioniert. |
| Eigene Seite für einen archivierten Stand | Große Tabellen brauchen Platz; verlinkbar. |
| Anzeige liest die gespeicherte Datei neu ein | Zeigt garantiert genau den archivierten Inhalt — keine separat gespeicherte Kopie, die abweichen könnte. |
| Aktuelle Namen über IDs, Datei unverändert | Umbenennungen sind sichtbar, der Nachweis bleibt byte-genau. |
| Nur Lesen, keine Lösch-/Änderungsaktionen | PRD: dauerhafte Archivierung. |
| Wiederverwendung vorhandener Bausteine | Kein neuer Code für Tabellen, Lesen oder Downloads. |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.**

### F) Testbarkeit
- Unit-Tests: Sortierung und Kettenanzeige, zurückgezogener SEND, Namensauflösung (inaktiv, umbenannt), Verlaufsfilter.
- E2E: Demo PHUNGUN — 3 Archivstände, Download byte-genau (CRLF erhalten), Anzeige REPLY C1234 mit Antworten, Verlauf mit 3 Einträgen; DMRL ohne Austausch zeigt Leerhinweise; Bearbeiter ohne Berechtigung.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-15`_

**Umgesetzt**
- `src/lib/dmrl/archive.ts`:
  - Archivstände neueste oben, Kette „SEND … → REPLY … → SEND …".
  - Bezug lesbar („eigener Stand (erster SEND)" bzw. „C1234 00001-2026").
  - Aktuelle Namen über IDs (Benutzer mit Kennzeichen „inaktiv", Organisation mit CAGE-Code und aktuellem Namen).
  - Archivierte Datei neu einlesen (DML-Leser des Issues; nicht lesbar → null).
  - **Byte-genauer Download**: Bytes in der Kodierung laut XML-Deklaration (UTF-8 inkl. BOM, ISO-8859-1; Zeilenenden bleiben).
  - Verlauf mit Aktionsnamen und Filtergruppen (Check-out/Check-in, SEND, REPLY, Kopfdaten).
- `src/components/archive/archive-view.tsx` + Seite `/dmrl/[id]/archiv?ansicht=austausch|freigaben|verlauf` — Registerkarten, die gewählte Karte steht in der Adresse.
  - **Austausch:** Tabelle mit Stand (Badge SEND/REPLY + Versionsindex), Partner, Datum, Bearbeiter, Bezug, Einträge (REPLY: freigegeben/zu überarbeiten), Datei; Kennzeichen „zurückgezogen am … von … — Begründung"; „Anzeigen" und „Herunterladen".
  - **Freigabestände:** neueste oben, mit „Anzeigen" (→ Freigabestand-Seite), „Als CSV exportieren" und „Als XML exportieren".
  - **Verlauf:** neueste oben, Filter nach Aktionsart, je 50 Einträge mit „Weitere anzeigen".
  - Leerhinweise laut Spec.
- `src/components/archive/archived-file-view.tsx` + Seite `/dmrl/[id]/archiv/[standId]`:
  - Kopfdaten und Bemerkung der Datei; Kennzeichen „zurückgezogen"; „Herunterladen".
  - Eintragstabelle in der neuen **Datei-Ansicht** (ohne Status, mit Spalte „Antwort" und Partner-Kommentar).
  - Nicht lesbare Datei → „Inhalt kann nicht angezeigt werden" (Download bleibt möglich).
- `src/components/dmrl/entry-table.tsx` / `entry-detail-sheet.tsx` — Option `fileView` (keine Zählerleiste, kein Statusfilter, keine Statusspalte).
- `src/components/dmrl/release-export.tsx` — Export eines Freigabestands (CSV/XML mit XSD-Prüfung) als gemeinsamer Baustein für die Freigabestand-Seite (PROJ-14) und das Archiv.
- `src/lib/files/download.ts` — `downloadBytes`.
- Aktion „Archiv" in der DMRL-Ansicht öffnet die Archivseite.

**Tests**
- Unit: `archive.test.ts` (7), `archive-view.test.tsx` (8); insgesamt 388 Unit-Tests grün.
- E2E: `tests/PROJ-15-archiv.spec.ts` (2) — Kette, **Download byte-identisch mit der Originaldatei (CRLF)**, Anzeige REPLY mit Antworten, Verlauf über die Adresse, fehlende Berechtigung.

**Hinweise**
- In der Austausch-Tabelle zeigt ein SEND die Anzahl der Einträge der Datei; ein REPLY zeigt freigegeben/zu überarbeiten (gespeicherte Anzahlen der Übernahme).
- Kein Verlaufseintrag für Archiv-Downloads (Out of Scope: Protokoll von Exporten).

### Folgeänderung aus BUG-QA1-1 (PROJ-20) (2026-11-15) — UTF-16-Dateien
- `declaredEncoding` (`src/lib/workflows/reply.ts`) erkennt UTF-16 jetzt am BOM (`FF FE` / `FE FF`) oder — ohne BOM — am Bytemuster von „<?“ (Little/Big Endian); sonst wie bisher die XML-Deklaration (Standard UTF-8). Gemeinsamer Baustein für REPLY-Import (PROJ-13) und „XML prüfen“ (PROJ-20).
- Archiv-Download (`archiveFileBytes`, PROJ-15): UTF-16-Stände werden wieder als UTF-16 LE mit BOM ausgegeben (byte-genau für die übliche LE-Datei mit BOM; bei BE oder fehlendem BOM als LE mit BOM).
- Tests: `reply.test.ts` (LE/BE, mit/ohne BOM), `archive.test.ts` (Rundlauf Download ↔ Lesen), `qa-proj20.test.ts` (UTF-16-Test aktiviert), E2E `PROJ-20-qa.spec.ts` „UTF-16-Datei“ mit echter xmllint-Prüfung; 483 Unit-Tests grün.

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
- [x] Zugriff (3/3), Austausch (5/5) inkl. **byte-identischem Download** (E2E-Vergleich mit Originaldatei, CRLF), Freigabestände (3/3), Verlauf (7/7) — Unit, Komponententests, E2E (`PROJ-15-archiv.spec.ts`)

### Edge Cases Status
- [x] Deaktivierter Benutzer („inaktiv"), umbenannte Organisation, CRLF, DMRL-Löschung nur ohne Workflow, Demo neu laden
- [ ] **Sehr viele Archiveinträge / große DMRLs:** siehe BUG-QA2-2

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

#### BUG-QA2-2: Browser-Speicher reicht bei großen DMRLs nur für wenige Austauschzyklen
- **Severity:** Medium
- **Betrifft:** Archiv (PROJ-15) und alle Workflows, die archivieren (PROJ-12, PROJ-13, PROJ-14); Ursache Datenhaltung im `localStorage` (PROJ-1)
- **Messung (Chrome):** Kapazität ≈ **5,16 Mio. Zeichen** je Adresse (E2E `QA-proj7-19.spec.ts`). Eine DMRL mit **1.000 Einträgen** belegt ca. 0,49 Mio. (Einträge), je Check-out weitere 0,49 Mio. (Sperrkopie), je SEND-/REPLY-Datei ca. 0,93 Mio., je Freigabestand 0,49 Mio.
- **Steps to Reproduce:**
  1. DMRL mit ca. 1.000 Einträgen anlegen (Check-in)
  2. Zwei vollständige Zyklen SEND → REPLY durchlaufen
  3. Expected: Alle Stände werden dauerhaft archiviert (PRD)
  4. Actual: Ab etwa dem zweiten Zyklus meldet die App „Der Browser-Speicher ist voll"; SEND/REPLY sind nicht mehr möglich (kein Datenverlust, Änderung wird verworfen)
- **Hinweis:** Mit den Demo-Daten (32/10/10 Einträge, ≈ 0,09 Mio. Zeichen) reicht der Speicher für sehr viele Zyklen. Abhilfe z. B. IndexedDB (deutlich größere Kapazität) — Architekturentscheidung (`/architecture`)
- **Priority:** Fix in next sprint (für die Vorführung mit Demo-Daten unkritisch)

### Summary
- **Acceptance Criteria:** 18/18 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
