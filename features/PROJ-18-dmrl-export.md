# PROJ-18: DMRL-Export (CSV/XML)

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Exportieren"
- Requires: PROJ-9 (Check-out CSV) — CSV-Aufbau
- Requires: PROJ-12 (SEND-Export) — XML-Aufbau je Issue
- Requires: PROJ-11 (XSD-Validierung) — Prüfung vor dem Download
- Requires: PROJ-17 (Berechtigungen)
- Wird genutzt von: PROJ-14 (Export des Freigabestands verwendet denselben Aufbau)

## Beschreibung
Der aktuelle Stand einer DMRL kann **jederzeit** als CSV oder S1000D-XML exportiert werden — unabhängig von Sperre und Status, ohne Workflow, ohne Versionsindex und ohne Archiveintrag. Der Export dient zur Information und Weitergabe (z. B. Vorführung, interne Abstimmung, TP-Projekt). Ein XML-Export ist als Arbeitsstand gekennzeichnet und kann nicht mit einem offiziellen SEND verwechselt werden.

## Export
Aktion **„Exportieren"** in der DMRL-Ansicht mit Auswahl **CSV** oder **XML**.

| Punkt | Festlegung |
|---|---|
| Wer | berechtigte Bearbeiter (PROJ-17) und Administratoren |
| Wann | jederzeit — auch wenn ausgecheckt (auch von anderen), *gesendet* oder *freigegeben* |
| Inhalt | aktueller Stand der DMRL in der Anwendung (bei Sperre: Stand vor dem Check-in, nicht die Änderungen in der ausgecheckten CSV) |
| Wirkung | keine: keine Sperre, keine Statusänderung, kein Versionsindex, kein Archiv, kein Verlaufseintrag (PROJ-15) |
| DMRL ohne Einträge | CSV: nur Kopfzeile. XML: nicht möglich — „Die DMRL hat keine Einträge" (Schema verlangt mindestens einen Eintrag) |

### CSV
- Aufbau wie Check-out (PROJ-9): 27 Spalten, Semikolon, UTF-8 mit BOM, alle Einträge nach DMC sortiert, inkl. `answer`/`answer_comment`
- Dateiname: `DML-{MI}-{CAGE Originator}-{DML-Typ}-Export-{JJJJ-MM-TT}.csv`, z. B. `DML-PHUNGUN-D0815-C-Export-2026-11-12.csv`
- Eine Export-CSV kann bei bestehender eigener Sperre eingecheckt werden (gleicher Aufbau); sie wird wie jede Datei geprüft (PROJ-8/10)

### XML
**Kopf**
| Feld | Wert |
|---|---|
| Richtung | `send` |
| `dmlc` | MI · CAGE Originator · DML-Typ · Jahr und seqnum des **letzten SEND**; ohne SEND: aktuelles Jahr und `00001` (Schema verlangt eine positive Zahl) |
| `issno` / `inwork` | **`000` / `01`** (S1000D-Arbeitsstand; SEND hat `001` / `00`) |
| `issdate` | Datum des Exports |
| `security` | Sicherheitseinstufung der DMRL |
| `dmlref` | wie beim nächsten SEND: auf den letzten REPLY, ohne Austausch auf sich selbst |
| `brexDmRef` | nur 4.2/5.0: Standard-BREX (PROJ-12) |
| `remarks` | „Export vom [TT.MM.JJJJ] — kein offizieller Austauschstand" |

**Einträge:** wie SEND (PROJ-12) — alle Einträge nach DMC, mit Eintragstyp und Ausgabedaten, **ohne** `answer`; Elementnamen je Issue laut `docs/dmrl-mapping.md`.

**Dateiname:** `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}-{seqnum}_000-01.XML`, z. B. `DML-PHUNGUN-D0815-C-2026-00002_000-01.XML`

**XSD-Prüfung** vor dem Download (PROJ-11); bei Fehler oder nicht verfügbarer Prüfung kein Download.

**Freigabestand (PROJ-14):** gleicher Aufbau; Einträge aus dem Freigabestand, Dateiname laut PROJ-14, `remarks` „Freigabestand vom [Datum] — Export vom [Datum]".

## User Stories
- Als **Bearbeiter** möchte ich den aktuellen Stand jederzeit als CSV exportieren, damit ich ihn intern weitergeben kann, ohne die DMRL zu sperren.
- Als **Bearbeiter** möchte ich den aktuellen Stand als S1000D-XML exportieren, auch während die DMRL auf einen REPLY wartet.
- Als **Empfänger** einer exportierten XML möchte ich erkennen, dass es sich um einen Arbeitsstand und nicht um einen offiziellen SEND handelt.
- Als **Product Owner** möchte ich in der Demo jederzeit Stände in beiden Formaten zeigen können.

## Out of Scope
- Export mehrerer DMRLs auf einmal
- Excel-Format (.xlsx)
- Export mit Kopfdaten in der CSV
- Auswahl einzelner Einträge oder Spalten
- Protokollierung von Exporten (PROJ-15)
- Export archivierter SEND/REPLY-Stände → Download im Archiv (PROJ-15)
- Export als offizieller Austauschstand → SEND (PROJ-12)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein berechtigter Bearbeiter öffnet die DMRL-Ansicht, wenn er „Exportieren" wählt, dann kann er CSV oder XML auswählen
- [ ] Angenommen ein Bearbeiter ist nicht berechtigt, wenn er den Export direkt aufruft, dann erscheint „Keine Berechtigung"
- [ ] Angenommen die DMRL ist von einem anderen Benutzer ausgecheckt, wenn exportiert wird, dann ist der Export möglich und enthält den Stand der Anwendung
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn exportiert wird, dann ist der Export möglich

### CSV
- [ ] Angenommen PHUNGUN wird am 12.11.2026 als CSV exportiert, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-Export-2026-11-12.csv` und hat den Aufbau von PROJ-9
- [ ] Angenommen eine DMRL wird als CSV exportiert, wenn danach der Status betrachtet wird, dann ist sie nicht gesperrt und unverändert

### XML
- [ ] Angenommen PHUNGUN (letzter SEND 00002-2026) wird als XML exportiert, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-2026-00002_000-01.XML` und hat `issno` `000`, `inwork` `01`
- [ ] Angenommen eine DMRL wurde nie gesendet, wenn als XML exportiert wird, dann hat `dmlc` die seqnum `00001` und das aktuelle Jahr, und `dmlref` verweist auf sich selbst
- [ ] Angenommen ein XML-Export wird erzeugt, wenn er geöffnet wird, dann enthält `remarks` „Export vom [Datum] — kein offizieller Austauschstand" und kein Eintrag hat `answer`
- [ ] Angenommen das System hat Issue 2.3 / 4.2 / 5.0, wenn als XML exportiert wird, dann besteht die Datei die XSD-Prüfung des jeweiligen Issues
- [ ] Angenommen die XSD-Prüfung schlägt fehl oder ist nicht verfügbar, wenn als XML exportiert wird, dann wird nichts heruntergeladen und eine Meldung erscheint
- [ ] Angenommen eine DMRL hat keine Einträge, wenn als XML exportiert wird, dann erscheint „Die DMRL hat keine Einträge" und nichts wird heruntergeladen
- [ ] Angenommen ein XML-Export wurde erstellt, wenn das Archiv und der Verlauf betrachtet werden, dann gibt es dafür keinen Eintrag und keinen neuen Versionsindex

## Edge Cases
- **Export während eines laufenden Check-ins (Zusammenfassung offen):** exportiert den Stand vor der Übernahme.
- **Jahreswechsel:** `dmlc` behält Jahr/seqnum des letzten SEND; Export-Datum ist das aktuelle Datum.
- **Zurückgezogener letzter SEND:** `dmlc` verwendet den letzten nicht zurückgezogenen SEND (bzw. `00001`).
- **Gleicher Dateiname bei mehreren Exporten am selben Tag:** Browser vergibt ggf. Zusatz; kein Problem für die Anwendung.
- **Sehr große DMRL:** Fortschrittsanzeige während XML-Erzeugung und Prüfung.

## Technical Requirements (optional)
- CSV-Export im Browser; XML-Prüfung serverseitig (PROJ-11)
- Gleiche XML-Erzeugung wie SEND (PROJ-12), nur Kopfwerte abweichend

## Open Questions
- (keine)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Export jederzeit, ohne Sperre, Status, Versionsindex, Archiv oder Verlauf | Vorgabe Product Owner (PROJ-9) | 2026-11-12 |
| XML-Export mit `issno` 000 / `inwork` 01 und Hinweis in `remarks` | Kennzeichnung als Arbeitsstand, keine Verwechslung mit SEND | 2026-11-12 |
| `dmlc` übernimmt den letzten SEND (ohne SEND: 00000) | Kein neuer Versionsindex | 2026-11-12 |
| Ohne SEND seqnum `00001` statt `00000` | Alle drei Schemas (2.3/4.2/5.0) erlauben für `seqnum` nur positive Zahlen; `00000` scheitert an der XSD-Prüfung. Arbeitsstand bleibt durch `issno` 000 / `inwork` 01, Dateiname `_000-01` und `remarks` vom SEND unterscheidbar — Entscheidung Product Owner | 2026-11-13 |
| Einträge wie SEND, ohne `answer` | Gleicher Aufbau, keine Sonderlogik | 2026-11-12 |
| CSV-Export mit Zusatz „Export" und Datum im Dateinamen | Unterscheidbar von der Check-out-Datei | 2026-11-12 |
| Freigabestand-Export nutzt denselben Aufbau | Konsistenz mit PROJ-14 | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Export ohne Schreibzugriff auf den Datenbestand | Keine Wirkung laut Spec | 2026-11-12 |
| Kopf-Variante „Export" des DML-Schreibers (PROJ-12), auch für Freigabestand (PROJ-14) | Einträge identisch, nur Kopf abweichend | 2026-11-12 |
| XSD-Prüfung vor jedem XML-Export (PROJ-11) | Schemakonforme Dateien | 2026-11-12 |
| Aufklappmenü „Exportieren" mit CSV/XML | Eine Aktion in der Leiste | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Der Export ist **keine Workflow-Aktion**: Er liest nur und schreibt nichts in den Datenbestand. Er kombiniert ausschließlich vorhandene Bausteine — CSV-Schreiber (PROJ-9), DML-Schreiber je Issue (PROJ-12), XSD-Prüfdienst (PROJ-11) und Download-Helfer (PROJ-9). Neu ist nur die **Kopf-Variante „Export"** des DML-Schreibers, die auch der Freigabestand-Export (PROJ-14) nutzt. Alles im Browser; nur die XSD-Prüfung läuft auf dem Server.

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Aktionsleiste
+-- „Exportieren" (shadcn DropdownMenu)
    +-- „Als CSV exportieren" → sofortiger Download
    +-- „Als XML exportieren" → Fortschritt „XML wird erzeugt und geprüft…"
        +-- gültig → Download
        +-- XSD-Fehler → Prüfbericht-Anzeige (PROJ-8/11) als Anwendungsfehler
        +-- Prüfung nicht verfügbar / keine Einträge → Fehlermeldung (Toast), kein Download
```

### B) Datenmodell (in Klartext)
Keine Änderung, keine Speicherung: kein Versionsindex, kein Archiv, kein Verlauf, keine Sperre. Gelesen werden DMRL, Einträge, System, Originator und das Archiv (letzter nicht zurückgezogener SEND für `dmlc`, letzter REPLY für `dmlref`).

### C) Bausteine
| Baustein | Herkunft | Verwendung im Export |
|---|---|---|
| Verfügbarkeitsregel „Exportieren" | neu (einfach) | berechtigt (PROJ-2) — sonst keine Einschränkung |
| CSV-Schreiber | PROJ-9 | aktuelle Einträge; Dateiname `…-Export-{JJJJ-MM-TT}.csv` |
| DML-Schreiber je Issue | PROJ-12 | mit **Kopf-Variante „Export"**: `issno` 000 / `inwork` 01, `dmlc` aus letztem SEND bzw. seqnum `00001` + aktuelles Jahr, `remarks` mit Export-Hinweis |
| Bezugs-Ermittlung `dmlref` | PROJ-12 | wie beim nächsten SEND |
| XSD-Prüfdienst | PROJ-11 | vor jedem XML-Download |
| Download-Helfer | PROJ-9 | Dateien speichern |

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Export schreibt nichts in den Datenbestand | Spec: keine Wirkung; jederzeit gefahrlos nutzbar. |
| Kopf-Variante „Export" im DML-Schreiber statt eigenem Schreiber | Einträge identisch zum SEND; nur der Kopf unterscheidet sich (Arbeitsstand). |
| Gleiche Kopf-Variante für Freigabestand-Export (PROJ-14) | Eine Regel für alle Nicht-SEND-XML-Dateien. |
| XSD-Prüfung auch beim Export | Jede XML, die die Anwendung verlässt, ist schemakonform (PROJ-11). |
| Auswahl CSV/XML über ein Aufklappmenü | Eine Schaltfläche in der Aktionsleiste. |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.**

### F) Testbarkeit
- Unit-Tests: Export-Kopf (mit/ohne SEND, nach zurückgezogenem SEND), Dateinamen, keine Datenänderung nach Export.
- Integration mit xmllint: Export-XML für 2.3/4.2/5.0 schemagültig (inkl. `issno` 000 / `inwork` 01).
- E2E: Export während Sperre durch anderen Benutzer und bei Status *gesendet*; XML-Export ohne Einträge → Meldung.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-18`_

**Umgesetzt**
- `src/lib/workflows/export.ts` — liest nur, schreibt nichts in den Datenbestand:
  - Verfügbarkeit: nur Berechtigung, sonst jederzeit (auch bei Sperre oder Status *gesendet*).
  - CSV über den gemeinsamen CSV-Schreiber (`…-Export-{JJJJ-MM-TT}.csv`).
  - **Kopf-Variante „Export"** `writeExportDml` (Richtung `send`, `issno` 000 / `inwork` 01, Datum des Exports, ohne `answer`, Einträge nach DMC; keine Einträge → „Die DMRL hat keine Einträge.").
  - XML-Export: `dmlc` = letzter nicht zurückgezogener SEND (sonst aktuelles Jahr + `00001`), `dmlref` wie beim nächsten SEND, `remarks` „Export vom … — kein offizieller Austauschstand", Dateiname `…_000-01.XML`.
- `src/lib/workflows/release.ts` — der Freigabestand-Export (PROJ-14) nutzt jetzt dieselbe Kopf-Variante.
- `src/components/workflows/dmrl-export.tsx` — CSV sofort; XML mit Meldung „XML wird erzeugt und geprüft …", danach Download nur bei bestandener XSD-Prüfung.
  - Schemafehler: Dialog „Anwendungsfehler" mit Bericht.
  - Nicht verfügbar oder keine Einträge: Fehlermeldung.
- `src/components/dmrl/dmrl-action-bar.tsx` — „Exportieren" als Aufklappmenü („Als CSV exportieren" · „Als XML exportieren"); Ladeanzeige während der Prüfung.
- `src/lib/dmrl/actions.ts` — alle Platzhalter „Diese Funktion folgt mit …" sind ersetzt.

**Tests**
- Unit: `export.test.ts` (9, u. a. **XML-Export für 2.3/4.2/5.0 mit echtem xmllint gültig**, fremde Sperre, zurückgezogener SEND, Jahreswechsel, keine Einträge, Datenbestand unverändert), `dmrl-export.test.tsx` (4); insgesamt 401 Unit-Tests grün.
- E2E: `tests/PROJ-18-export.spec.ts` — PHUNGUN *gesendet* als CSV und XML (Datenbestand unverändert); Fahrzeug bei fremder Sperre, nie gesendet, als XML (`…-00001_000-01.XML`) mit echter XSD-Prüfung.

**Abweichung**
- seqnum `00001` statt `00000` ohne SEND (siehe Decision Log); gilt ebenso als Rückfallwert im Freigabestand-Export.

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
- [x] Zugriff (4/4), CSV (2/2), XML (7/7) — Unit (`export.test.ts`, XSD für 2.3/4.2/5.0 mit echtem xmllint), Komponententests, E2E (`PROJ-18-export.spec.ts`)
- [x] seqnum `00001` ohne SEND (Entscheidung Product Owner, Spec angepasst)

### Edge Cases Status
- [x] Export während laufendem Check-in, Jahreswechsel, zurückgezogener SEND, gleicher Dateiname, große DMRL (Fortschrittsmeldung)

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Empfänger-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar
- [x] BUG-QA2-1 (PROJ-9): CSV-Formel-Injection — behoben 2026-11-14, gilt auch für den CSV-Export

### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 13/13 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
