# PROJ-9: Check-out CSV

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — angemeldeter Benutzer, Rolle
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Check-out", Anzeige der Sperre
- Requires: PROJ-17 (DMRL-Berechtigungen) — nur berechtigte Bearbeiter / Administratoren
- Requires: PROJ-8 (Fachliches Regelwerk) — Spaltenaufbau (Gruppe S), Auffüllen führender Nullen
- Wird genutzt von: PROJ-10 (Check-in) — Stand beim Check-out als Vergleichsbasis, Sperre aufheben
- Verwandt: PROJ-18 (DMRL-Export) — gleicher CSV-Aufbau, aber ohne Sperre

## Beschreibung
Der Bearbeiter checkt die DMRL als CSV-Datei aus, um die Einträge extern (z. B. in Excel) zu bearbeiten. Der Check-out **sperrt** die DMRL, bis sie wieder eingecheckt (PROJ-10), der Check-out zurückgenommen oder die Sperre durch einen Administrator aufgehoben wird. Der Stand beim Check-out ist die Vergleichsbasis für die Prüfung beim Check-in (PROJ-8, Gruppe F).

## CSV-Datei
| Punkt | Festlegung |
|---|---|
| Format | nur **CSV** (kein Excel-Format) |
| Dateiname | `DML-{MI}-{CAGE Originator}-{DML-Typ}-{Jahr}.csv`, z. B. `DML-PHUNGUN-D0815-C-2026.csv` (DML-Typ in Großbuchstaben, Jahr = Jahr des Check-outs) |
| Kopfdaten | **keine** — nur die Eintragstabelle |
| Zeile 1 | die 27 Feldnamen in fester Reihenfolge (PROJ-8, Gruppe S): `dmentryType;modelic;sdc;chapnum;section;subsect;subject;discode;discodev;incode;incodev;itemloc;techname;infoname;language;country;security;rpc;rpcname;issno;type;day;month;year;answer;answer_comment;remarks` |
| ab Zeile 2 | je Eintrag eine Zeile, **alle** Einträge (auch Eintragstyp `d` und DM-Ausgabetyp `deleted`), sortiert nach DMC |
| Werte | wie in der Anwendung gespeichert, mit führenden Nullen; `answer`/`answer_comment` zur Information enthalten |
| Trennzeichen | Semikolon `;` |
| Zeichensatz | UTF-8 **mit BOM** (Umlaute in Excel korrekt) |
| Anführungszeichen | Werte mit `;`, `"` oder Zeilenumbruch in `"…"`, `"` wird verdoppelt (CSV-Standard) |
| DMRL ohne Einträge | nur Kopfzeile |

**Führende Nullen / Excel:** Öffnet der Bearbeiter die CSV in Excel, gehen führende Nullen verloren (`01` → `1`). Beim Check-in werden deshalb bei `security`, `issno`, `day`, `month` fehlende führende Nullen **aufgefüllt** und im Prüfbericht als Hinweis genannt (Ergänzung PROJ-8, Gruppe A). DMC-Teile werden nicht aufgefüllt.

## Regeln
| Situation | Check-out |
|---|---|
| Berechtigter Bearbeiter (PROJ-17) oder Administrator | möglich |
| DMRL bereits ausgecheckt (von wem auch immer) | nicht möglich — „Ausgecheckt von [Name] seit [Datum, Uhrzeit]" |
| DMRL-Status „gesendet" (wartet auf REPLY) | nicht möglich — „Die DMRL wartet auf die Antwort des Partners (REPLY). Ein neuer Bearbeitungszyklus ist erst danach möglich." |
| DMRL freigegeben | möglich; Freigabe bleibt bestehen, bis ein Check-in etwas ändert (PROJ-14) |
| DMRL ohne Einträge | möglich |

**Sperre aufheben ohne Check-in**
| Wer | Aktion | Wirkung |
|---|---|---|
| Sperrinhaber | „Check-out zurücknehmen" (mit Bestätigung) | Sperre aufgehoben, DMRL unverändert |
| Administrator | „Sperre aufheben" (mit Bestätigung, Hinweis auf Sperrinhaber) | Sperre aufgehoben, DMRL unverändert — für jede gesperrte DMRL |
| anderer Bearbeiter | — | nicht möglich |
| Sperrinhaber | „CSV erneut herunterladen" | Datei mit dem Stand beim Check-out |

Zurücknehmen/Aufheben ist keine Änderung der DMRL: Freigabestatus bleibt erhalten.

**Nachvollziehbarkeit**
- Sperre speichert Benutzer und Zeitpunkt.
- Workflow-Verlauf der DMRL erhält je Schritt Datum, Benutzer und Aktion: „Check-out", „Check-out zurückgenommen", „Sperre aufgehoben durch Administrator (Sperrinhaber: [Name])". Anzeige des Verlaufs → PROJ-15.
- Die CSV-Datei wird nicht archiviert (nur SEND/REPLY, PRD).
- „Im Workflow verwendet" (PROJ-4/5/6) gilt erst nach einem **abgeschlossenen Check-in**; Check-out allein oder zurückgenommener Check-out zählt nicht.

## User Stories
- Als **Bearbeiter** möchte ich die DMRL als CSV auschecken, damit ich die Einträge in Excel bearbeiten kann.
- Als **Bearbeiter** möchte ich, dass die DMRL während meiner Bearbeitung gesperrt ist, damit niemand parallel ändert und meine Änderungen nicht überschrieben werden.
- Als **Bearbeiter** möchte ich meinen Check-out zurücknehmen, wenn ich mich vertan habe, damit die DMRL wieder für andere frei ist.
- Als **Bearbeiter** möchte ich die ausgecheckte CSV erneut herunterladen, falls ich die Datei verloren habe.
- Als **Administrator** möchte ich eine verwaiste Sperre aufheben, damit die Arbeit weitergehen kann, wenn der Sperrinhaber ausfällt.
- Als **Bearbeiter** möchte ich sehen, wer die DMRL seit wann ausgecheckt hat, damit ich mich mit ihm abstimmen kann.

## Out of Scope
- Excel-Format (.xlsx), Kopfdaten-Blatt, zusätzliche Metadatenspalten (Aufbau der Beispiel-Excel)
- Check-in, Prüfung, Übernahme → PROJ-10, PROJ-8
- Export ohne Sperre (CSV/XML) → PROJ-18
- Archivierung der CSV-Datei
- Anzeige des Workflow-Verlaufs → PROJ-15
- Teil-Check-out (einzelne Einträge oder Kapitel)
- Check-out während die DMRL auf einen REPLY wartet (inkl. „Fehler ignorieren"-Ausnahme aus Anforderung 02)
- Automatischer Ablauf der Sperre nach Zeit

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Check-out
- [ ] Angenommen ein berechtigter Bearbeiter öffnet eine nicht gesperrte DMRL mit Status ≠ „gesendet", wenn er „Check-out" wählt, dann erscheint eine Bestätigung mit Dateiname und Hinweis „Die DMRL wird für andere gesperrt, bis Sie sie wieder einchecken"
- [ ] Angenommen der Bearbeiter bestätigt, wenn der Check-out ausgeführt wird, dann wird die CSV heruntergeladen und die DMRL ist auf ihn gesperrt
- [ ] Angenommen die Bestätigung ist offen, wenn „Abbrechen" gewählt wird, dann wird nichts heruntergeladen und die DMRL bleibt ungesperrt
- [ ] Angenommen ein Administrator öffnet eine beliebige nicht gesperrte DMRL, wenn er „Check-out" wählt, dann ist der Check-out wie für einen Bearbeiter möglich
- [ ] Angenommen ein Bearbeiter ist für die DMRL nicht berechtigt, wenn er den Check-out direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-17)
- [ ] Angenommen die DMRL ist von Bea Bearbeiter gesperrt, wenn ein anderer Benutzer sie öffnet, dann ist „Check-out" deaktiviert mit „Ausgecheckt von Bea Bearbeiter seit [Datum, Uhrzeit]"
- [ ] Angenommen die DMRL hat den Status „gesendet", wenn ein Benutzer „Check-out" wählt, dann ist dies nicht möglich mit dem Hinweis, dass auf den REPLY gewartet wird
- [ ] Angenommen die DMRL ist freigegeben, wenn sie ausgecheckt wird, dann bleibt der Status „freigegeben" bestehen
- [ ] Angenommen die DMRL hat keine Einträge, wenn sie ausgecheckt wird, dann enthält die CSV nur die Kopfzeile

### CSV-Inhalt
- [ ] Angenommen die DMRL PHUNGUN (Originator D0815, DML-Typ c) wird 2026 ausgecheckt, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-2026.csv`
- [ ] Angenommen eine CSV wurde ausgecheckt, wenn sie geöffnet wird, dann enthält Zeile 1 genau die 27 Feldnamen in der festgelegten Reihenfolge, getrennt durch `;`, ohne Kopfdaten
- [ ] Angenommen die DMRL hat 32 Einträge, darunter Eintragstyp `d`, wenn ausgecheckt wird, dann enthält die CSV 32 Datenzeilen, sortiert nach DMC
- [ ] Angenommen ein Eintrag hat `security` = `01` und `issno` = `001`, wenn ausgecheckt wird, dann stehen die Werte mit führenden Nullen in der Datei
- [ ] Angenommen ein Tech Name enthält Umlaute, wenn die CSV per Doppelklick in Excel geöffnet wird, dann werden die Umlaute korrekt angezeigt
- [ ] Angenommen ein Wert enthält `;` oder `"`, wenn ausgecheckt wird, dann ist er korrekt in Anführungszeichen gesetzt und wird beim Check-in unverändert gelesen
- [ ] Angenommen ein Eintrag hat `answer` und `answer_comment` aus einem REPLY, wenn ausgecheckt wird, dann sind beide Werte in der CSV enthalten
- [ ] Angenommen die Demo-DMRL PHUNGUN wird ausgecheckt und unverändert eingecheckt, wenn geprüft wird, dann ist die Datei fehlerfrei (PROJ-8)
- [ ] Angenommen die ausgecheckte CSV wird in Excel geöffnet und gespeichert, sodass `01` zu `1` wird, wenn eingecheckt wird, dann werden die Nullen aufgefüllt und kein Fehler gemeldet

### Sperre aufheben
- [ ] Angenommen der Sperrinhaber öffnet die DMRL, wenn er „Check-out zurücknehmen" wählt und bestätigt, dann ist die Sperre aufgehoben und die DMRL unverändert
- [ ] Angenommen der Sperrinhaber öffnet die DMRL, wenn er „CSV erneut herunterladen" wählt, dann erhält er die Datei mit dem Stand beim Check-out
- [ ] Angenommen ein Administrator öffnet eine von einem Bearbeiter gesperrte DMRL, wenn er „Sperre aufheben" wählt, dann erscheint eine Bestätigung mit dem Namen des Sperrinhabers; nach Bestätigung ist die Sperre aufgehoben
- [ ] Angenommen ein Bearbeiter ist nicht Sperrinhaber, wenn er die gesperrte DMRL öffnet, dann sieht er weder „Check-out zurücknehmen" noch „Sperre aufheben"
- [ ] Angenommen eine freigegebene DMRL wird ausgecheckt und der Check-out zurückgenommen, wenn danach der Status betrachtet wird, dann ist sie weiterhin „freigegeben"

### Nachvollziehbarkeit
- [ ] Angenommen ein Check-out, eine Rücknahme oder eine Aufhebung durch den Administrator erfolgt, wenn danach der Workflow-Verlauf betrachtet wird, dann enthält er Datum, Benutzer und Aktion
- [ ] Angenommen eine Organisation/ein System/eine DMRL war bisher nicht im Workflow verwendet, wenn die DMRL ausgecheckt und der Check-out zurückgenommen wird, dann gelten sie weiterhin als „nicht im Workflow verwendet" (PROJ-4/5/6)
- [ ] Angenommen die DMRL ist gesperrt, wenn der Benutzer gewechselt wird oder die Seite neu geladen wird, dann bleibt die Sperre bestehen (PROJ-2)

## Edge Cases
- **Sperrinhaber wird deaktiviert:** nicht möglich, solange er eine DMRL ausgecheckt hat (PROJ-3); Administrator kann die Sperre aufheben.
- **Berechtigung des Sperrinhabers entziehen:** nicht möglich (PROJ-17).
- **Sperrinhaber wird zum Administrator / Administrator zum Bearbeiter:** Sperre bleibt; Inhaber kann weiter zurücknehmen bzw. einchecken.
- **Download schlägt fehl / wird vom Browser blockiert:** Sperre ist gesetzt; Sperrinhaber nutzt „CSV erneut herunterladen" oder „Check-out zurücknehmen".
- **Admin ändert DMRL-Kopfdaten (Sicherheitseinstufung) während der Sperre:** erlaubt; betrifft nicht die Einträge.
- **Demo-Daten neu laden während einer Sperre:** Sperren der Demo-Daten gelten (PROJ-1); offene Check-outs gehen verloren.
- **Zwei Tabs gleichzeitig „Check-out":** der zweite Versuch erkennt die bestehende Sperre (Prototyp, letzter Speicherstand gilt, PROJ-1).

## Technical Requirements (optional)
- Download direkt im Browser, keine Serverfunktion nötig
- CSV-Erzeugung für 1.000 Einträge in unter einer Sekunde

## Open Questions
- [x] Werden im Workflow-Verlauf auch Admin-Änderungen an den DMRL-Kopfdaten protokolliert? → Ja, „Kopfdaten geändert: Feld alt → neu" (PROJ-15)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Nur CSV, kein Excel-Format | Vorgabe Product Owner | 2026-11-12 |
| Keine Kopfdaten in der CSV | Vorgabe Product Owner; eindeutige Prüfung beim Check-in | 2026-11-12 |
| Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}.csv` | Vorgabe Product Owner, angelehnt an XML-Dateinamen | 2026-11-12 |
| Kein Check-out bei Status „gesendet" | NSG: kein neuer Zyklus vor Abschluss des laufenden | 2026-11-12 |
| Rücknahme durch Sperrinhaber, Aufhebung durch Administrator | Verwaiste Sperren auflösbar | 2026-11-12 |
| CSV erneut herunterladbar während der Sperre | Verlorene Datei ohne neuen Check-out | 2026-11-12 |
| Fehlende führende Nullen bei `security`, `issno`, `day`, `month` werden beim Check-in aufgefüllt | Vorgabe Product Owner — Excel entfernt Nullen beim Öffnen | 2026-11-12 |
| Alle Einträge inkl. `d`/`deleted`, sortiert nach DMC | Fehlende Einträge sind beim Check-in ein Fehler (PROJ-8 F) | 2026-11-12 |
| Semikolon, UTF-8 mit BOM | Deutsches Excel öffnet die Datei direkt korrekt | 2026-11-12 |
| Workflow-Verlauf mit Benutzer/Datum/Aktion; CSV nicht archiviert | Nachvollziehbarkeit (PROJ-17), Archiv nur SEND/REPLY (PRD) | 2026-11-12 |
| „Im Workflow verwendet" erst nach abgeschlossenem Check-in | Zurückgenommener Check-out ändert nichts | 2026-11-12 |
| Jederzeit-Export als eigenes Feature PROJ-18 | Vorgabe Product Owner; Single Responsibility | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Workflow-Aktionen als Verfügbarkeitsregel (Grund) + atomare Ausführung inkl. Verlauf | Einheitliches Muster für PROJ-9/10/12/13 | 2026-11-12 |
| Sperre mit Kopie der Einträge ist Quelle für CSV, erneuten Download und Check-in-Vergleich | Identische Dateien, eindeutige Vergleichsbasis | 2026-11-12 |
| Erst speichern, dann Download | Kein Download ohne Sperre; blockierter Download lösbar | 2026-11-12 |
| Gemeinsamer CSV-Schreiber (PapaParse) und gemeinsame Spaltenliste mit dem CSV-Leser (PROJ-8) | Rundlauf ohne Abweichung; auch PROJ-14/18 | 2026-11-12 |
| Gemeinsamer Download-Helfer für CSV/XML/Prüfberichte | Einheitliches Herunterladen | 2026-11-12 |
| Dateiname beim erneuten Download mit Jahr des Check-outs | Identische Datei | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Der Check-out ist die erste **Workflow-Aktion**. Er legt ein Muster fest, das auch Check-in, SEND, REPLY und Zurückziehen nutzen: Jede Aktion hat eine **Verfügbarkeitsregel** (erlaubt ja/nein + Grund — angezeigt in der Aktionsleiste, PROJ-7) und eine **Ausführung**, die alle Änderungen inkl. Verlaufseintrag in **einer** Speicherung schreibt. Dazu kommt ein gemeinsamer **CSV-Schreiber** für Check-out, Freigabestand und Export. Alles im Browser, kein Backend nötig.

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Aktionsleiste
+-- „Check-out" → Bestätigungsdialog (shadcn AlertDialog)
|   +-- Dateiname · Hinweis „Die DMRL wird für andere gesperrt, bis Sie sie wieder einchecken"
|   +-- „Auschecken" · „Abbrechen"
+-- nur Sperrinhaber:
|   +-- „CSV erneut herunterladen" (ohne Dialog)
|   +-- „Check-out zurücknehmen" → Bestätigungsdialog (Hinweis: Änderungen in der CSV gehen verloren)
+-- nur Administrator bei fremder Sperre:
    +-- „Sperre aufheben" → Bestätigungsdialog mit Name des Sperrinhabers
Kopfbereich (PROJ-7): „Ausgecheckt von [Name] seit [Datum, Uhrzeit]"
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte — genutzt wird die **Sperre an der DMRL** aus PROJ-1: Benutzer, Zeitpunkt und eine **Kopie aller Einträge beim Check-out**. Aus dieser Kopie entstehen die heruntergeladene CSV, der erneute Download und die Vergleichsbasis für den Check-in (PROJ-10). Zusätzlich je Schritt ein **Verlaufseintrag** (Check-out / Check-out zurückgenommen / Sperre aufgehoben mit Sperrinhaber).

### C) Verfügbarkeitsregeln
| Aktion | Verfügbar wenn | Grund sonst |
|---|---|---|
| Check-out | berechtigt (Rechte-Regel PROJ-2) · nicht gesperrt · Status ≠ *gesendet* | „Ausgecheckt von …" bzw. „Die DMRL wartet auf die Antwort des Partners …" |
| CSV erneut herunterladen | angemeldeter Benutzer = Sperrinhaber | — (nicht angezeigt) |
| Check-out zurücknehmen | angemeldeter Benutzer = Sperrinhaber | — (nicht angezeigt) |
| Sperre aufheben | Administrator · gesperrt · Sperrinhaber ≠ angemeldeter Benutzer | — (nicht angezeigt) |

### D) Abläufe
- **Check-out:** Verfügbarkeit erneut prüfen → Sperre mit Kopie der Einträge + Verlaufseintrag in einer Speicherung → CSV aus der Kopie erzeugen → Download. Schlägt das Speichern fehl (Speicher voll), gibt es keinen Download und keine Sperre. Wird der Download vom Browser blockiert, bleibt die Sperre; „CSV erneut herunterladen" hilft.
- **Erneuter Download:** CSV aus der gespeicherten Kopie; Dateiname mit dem Jahr des Check-outs → identische Datei.
- **Zurücknehmen / Aufheben:** Sperre entfernen + Verlaufseintrag in einer Speicherung; Einträge und Status bleiben unverändert.

### E) Gemeinsamer CSV-Schreiber
- Erzeugt die CSV laut Spec: 27 Spalten in fester Reihenfolge, Semikolon, UTF-8 mit BOM, Anführungszeichen nur wo nötig, Einträge sortiert nach DMC (gemeinsame DMC-Sortierung aus PROJ-7).
- Genutzt von PROJ-9 (Check-out), PROJ-14 (Freigabestand), PROJ-18 (Export). Die Spaltenliste ist dieselbe, die der CSV-Leser in PROJ-8 erwartet — eine gemeinsame Definition.
- Ein gemeinsamer **Download-Helfer** speichert Dateien mit vorgegebenem Namen (auch für XML-Dateien in PROJ-12/14/18 und Prüfberichte).

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Muster „Verfügbarkeitsregel + atomare Ausführung" für alle Workflow-Aktionen | Aktionsleiste zeigt überall Gründe; kein halb ausgeführter Workflow. |
| Erst speichern, dann herunterladen | Ohne gespeicherte Sperre gibt es keine Datei; ein blockierter Download ist über „erneut herunterladen" lösbar. |
| CSV immer aus der gespeicherten Kopie | Erneuter Download ist identisch; Check-in vergleicht gegen genau diese Daten. |
| Gemeinsamer CSV-Schreiber mit PapaParse (PROJ-8) | Lesen und Schreiben folgen denselben Regeln; Rundlauf Check-out → Check-in ohne Abweichung. |
| Spaltenliste an einer Stelle | CSV-Leser (PROJ-8) und -Schreiber können nicht auseinanderlaufen. |
| Verfügbarkeit vor der Ausführung erneut geprüft | Schutz bei veralteter Anzeige (zweiter Tab). |

### G) Abhängigkeiten (Pakete)
- **papaparse** (bereits durch PROJ-8 vorgesehen). Keine weiteren.

### H) Testbarkeit
- Unit-Tests: Verfügbarkeitsregeln (alle Zeilen der Tabelle), CSV-Schreiber (Kopfzeile, Reihenfolge, BOM, Anführungszeichen, führende Nullen, Umlaute), Rundlauf CSV schreiben → CSV lesen (PROJ-8) ohne Änderung, Sperre/Verlauf nach Check-out, Rücknahme, Aufhebung.
- E2E: Check-out Demo PHUNGUN nicht möglich (gesendet); Check-out Fahrzeug → Datei `DML-GTFDEMO-D0815-C-[Jahr].csv`, Sperre sichtbar; anderer Benutzer sieht Sperre; Rücknahme; Admin hebt Sperre auf.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-9`_

**Umgesetzt**
- `src/lib/workflows/check-out.ts` — **Muster für Workflow-Aktionen**: Verfügbarkeitsregeln mit Grund (Check-out: Berechtigung, bestehende Sperre „Ausgecheckt von … seit …", Status gesendet; Sperre aufheben: nur Administrator bei fremder Sperre) und atomare Ausführung inkl. Verlaufseintrag (Check-out mit Kopie aller Einträge in der Sperre, Check-out zurücknehmen, Sperre aufheben mit Sperrinhaber im Verlauf). Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}.csv` (Jahr des Check-outs), CSV aus der gespeicherten Kopie über den gemeinsamen CSV-Schreiber (PROJ-8).
- `src/lib/dmrl/actions.ts` — Aktionsleiste nutzt die echten Regeln; Sperrinhaber sieht „Check-out zurücknehmen" und „CSV erneut herunterladen" statt „Check-out".
- `src/components/workflows/check-out-dialogs.tsx` — Bestätigungsdialoge (Dateiname + Sperrhinweis; Zurücknehmen mit Warnung; Aufheben mit Name des Sperrinhabers); Reihenfolge **erst speichern, dann herunterladen**.
- `src/components/dmrl/dmrl-view.tsx` — Aktionen an die Dialoge angebunden.

**Tests**: `check-out.test.ts` (10), `check-out-dialogs.test.tsx` (3) — insgesamt 267 Tests grün. Rundlauf Check-out-CSV → CSV-Leser (PROJ-8) geprüft; Check-out allein zählt nicht als „im Workflow verwendet".

**Hinweise**
- Der Sperrinhaber sieht „Check-out" nicht (stattdessen seine Sperr-Aktionen); andere Benutzer sehen es gesperrt mit Grund.
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
- [x] Check-out (9/9), CSV-Inhalt (9/9), Sperre aufheben (5/5), Nachvollziehbarkeit (3/3) — Unit (`check-out.test.ts`, `qa-proj7-10.test.ts`), Dialogtests, E2E (`PROJ-18-export.spec.ts` Check-out unter fremdem Benutzer)
- [x] Umlaute in Excel: UTF-8 mit BOM (Prüfung der Datei)

### Edge Cases Status
- [x] Deaktivieren/Berechtigungsentzug des Sperrinhabers verhindert (PROJ-3/17), Rollenwechsel, Download blockiert → „CSV erneut herunterladen", Kopfdaten während Sperre, Demo neu laden, zwei Tabs

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar
- [ ] **BUG-QA2-1 (Medium):** CSV-Formel-Injection — Werte, die mit `=`, `+`, `-` oder `@` beginnen, werden unverändert in CSV-Dateien geschrieben und von Excel als Formel ausgeführt

### Bugs Found

#### BUG-QA2-1: CSV-Formel-Injection in exportierten CSV-Dateien
- **Severity:** Medium (Sicherheit)
- **Betrifft:** CSV-Schreiber (`src/lib/files/csv-writer.ts`) und damit Check-out (PROJ-9), DMRL-Export (PROJ-18), Freigabestand-Export (PROJ-14), Prüfbericht-Download (PROJ-8)
- **Steps to Reproduce:**
  1. Partner liefert im REPLY als Begründung (`answer/remarks`) z. B. `=HYPERLINK("http://angreifer.example";"Details")`; REPLY übernehmen
  2. DMRL auschecken oder als CSV exportieren und die Datei in Excel öffnen
  3. Expected: Wert wird als Text angezeigt
  4. Actual: Zelle enthält `"=HYPERLINK(""http://angreifer.example"",""Details"")"` — Excel wertet die Formel aus (Link/DDE-Angriffe möglich)
- **Hinweis zur Behebung:** Ein vorangestelltes `'` (Papa Parse `escapeFormulae`) verhindert die Ausführung, verändert aber den Wert beim Check-in — Lösung muss den Rundlauf Check-out → Check-in erhalten (z. B. Präfix beim Lesen wieder entfernen)
- **Priority:** Fix before deployment (Daten stammen von externen Partnern)

### Summary
- **Acceptance Criteria:** 26/26 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Issues found (siehe Bugs)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
