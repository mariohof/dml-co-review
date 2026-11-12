# PROJ-9: Check-out CSV

## Status: Planned
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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
