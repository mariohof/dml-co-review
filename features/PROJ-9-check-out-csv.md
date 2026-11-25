# PROJ-9: Check-out (MS-Excel)

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-25

> **Refinement 2026-11-25 — Check-out als MS-Excel (.xlsx) statt CSV:** Vorgabe Product Owner. Der Check-out liefert nur noch eine **MS-Excel-Datei (.xlsx)** — Aufbau wie der Excel-Export aus PROJ-18: ein Tabellenblatt „Einträge“, dieselben 28 Spalten, Kopfzeile in Zeile 1, alle Zellen (auch ganze Spalten) als Text, Kopfzeile fixiert, Autofilter, keine Kopfdaten. Dateiname wie bisher, nur mit `.xlsx`: `DML-PHUNGUN-D0815-C-2026.xlsx`. „CSV erneut herunterladen“ heißt jetzt „Excel-Datei erneut herunterladen“. Eine CSV wird beim Check-out nicht mehr erzeugt; beim Check-in werden `.xlsx` **und** weiterhin `.csv` angenommen (PROJ-10). Geänderte Stellen sind mit *(Refinement 2026-11-25)* markiert; ältere Abschnitte (Tech Design, QA) beschreiben den CSV-Stand.

> **Refinement 2026-11-21 (über PROJ-13) — `answer_timestamp`:** Die Check-out-CSV hat 28 Spalten: `answer_timestamp` steht direkt nach `answer_comment` (ISO 8601 Ortszeit `JJJJ-MM-TTThh:mm:ss`, leer wenn keine Antwort übernommen wurde). Formelschutz gilt auch für diese Spalte.

## Dependencies
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — angemeldeter Benutzer, Rolle
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Check-out", Anzeige der Sperre
- Requires: PROJ-17 (DMRL-Berechtigungen) — nur berechtigte Bearbeiter / Administratoren
- Requires: PROJ-8 (Fachliches Regelwerk) — Spaltenaufbau (Gruppe S), Auffüllen führender Nullen
- Nutzt: PROJ-18 (DMRL-Export) — Excel-Schreiber und Aufbau der Excel-Datei *(Refinement 2026-11-25)*
- Wird genutzt von: PROJ-10 (Check-in) — Stand beim Check-out als Vergleichsbasis, Sperre aufheben
- Verwandt: PROJ-18 (DMRL-Export) — gleicher Spaltenaufbau (CSV/Excel), aber ohne Sperre

## Beschreibung
Der Bearbeiter checkt die DMRL als **MS-Excel-Datei (.xlsx)** aus, um die Einträge extern in Excel zu bearbeiten *(Refinement 2026-11-25)*. Der Check-out **sperrt** die DMRL, bis sie wieder eingecheckt (PROJ-10), der Check-out zurückgenommen oder die Sperre durch einen Administrator aufgehoben wird. Der Stand beim Check-out ist die Vergleichsbasis für die Prüfung beim Check-in (PROJ-8, Gruppe F).

## Excel-Datei *(Refinement 2026-11-25 — bisher „CSV-Datei“)*
| Punkt | Festlegung |
|---|---|
| Format | nur **MS-Excel (.xlsx)** — keine CSV mehr beim Check-out *(Refinement 2026-11-25)* |
| Dateiname | `DML-{MI}-{CAGE Originator}-{DML-Typ}-{Jahr}.xlsx`, z. B. `DML-PHUNGUN-D0815-C-2026.xlsx` (DML-Typ in Großbuchstaben, Jahr = Jahr des Check-outs) |
| Tabellenblätter | genau eines: **„Einträge“** *(Refinement 2026-11-25)* |
| Kopfdaten | **keine** — nur die Eintragstabelle |
| Zeile 1 | die 28 Feldnamen in fester Reihenfolge (PROJ-8, Gruppe S), je Feld eine Spalte: `dmentryType`, `modelic`, `sdc`, `chapnum`, `section`, `subsect`, `subject`, `discode`, `discodev`, `incode`, `incodev`, `itemloc`, `techname`, `infoname`, `language`, `country`, `security`, `rpc`, `rpcname`, `issno`, `type`, `day`, `month`, `year`, `answer`, `answer_comment`, `answer_timestamp`, `remarks` |
| ab Zeile 2 | je Eintrag eine Zeile, **alle** Einträge (auch Eintragstyp `d` und DM-Ausgabetyp `deleted`), sortiert nach DMC |
| Werte | wie in der Anwendung gespeichert, mit führenden Nullen; `answer`/`answer_comment`/`answer_timestamp` zur Information enthalten |
| Zellformat | **alle Zellen als Text** — auch die leeren Zellen der 28 Spalten, sodass neu eingetippte Werte ebenfalls Text bleiben (`01` bleibt `01`, keine Datums-/Zahlenumwandlung) *(Refinement 2026-11-25)* |
| Komfort | Kopfzeile fett und fixiert, Autofilter auf der Kopfzeile, Spaltenbreiten an den Inhalt angepasst (wie PROJ-18) *(Refinement 2026-11-25)* |
| Formelschutz | Werte, die mit `=`, `+`, `-` oder `@` beginnen, sind Textzellen und werden nie als Formel ausgewertet — **kein** vorangestelltes `'` wie in der CSV (BUG-QA2-1) *(Refinement 2026-11-25)* |
| Umlaute/Sonderzeichen | ohne Kodierungsfragen korrekt (kein BOM nötig) *(Refinement 2026-11-25)* |
| DMRL ohne Einträge | nur Kopfzeile |

**Führende Nullen / Excel:** Da alle Zellen Text sind, bleiben führende Nullen in Excel erhalten *(Refinement 2026-11-25)*. Gehen sie trotzdem verloren (z. B. Werte aus einem anders formatierten Blatt hineinkopiert oder eine CSV eingecheckt), werden beim Check-in bei `security`, `issno`, `day`, `month` fehlende führende Nullen weiterhin **aufgefüllt** und im Prüfbericht als Hinweis genannt (PROJ-8, Gruppe A). DMC-Teile werden nicht aufgefüllt.

## Regeln
| Situation | Check-out |
|---|---|
| Berechtigter Bearbeiter (PROJ-17) oder Administrator | möglich |
| DMRL bereits ausgecheckt (von wem auch immer) | nicht möglich — „Ausgecheckt von [Name] seit [Datum, Uhrzeit]" |
| DMRL-Status „gesendet" (wartet auf REPLY) | nicht möglich — „Die DMRL wartet auf die Antwort des Empfängers (REPLY). Ein neuer Bearbeitungszyklus ist erst danach möglich." |
| DMRL freigegeben | möglich; Freigabe bleibt bestehen, bis ein Check-in etwas ändert (PROJ-14) |
| DMRL ohne Einträge | möglich |

**Sperre aufheben ohne Check-in**
| Wer | Aktion | Wirkung |
|---|---|---|
| Sperrinhaber | „Check-out zurücknehmen" (mit Bestätigung) | Sperre aufgehoben, DMRL unverändert |
| Administrator | „Sperre aufheben" (mit Bestätigung, Hinweis auf Sperrinhaber) | Sperre aufgehoben, DMRL unverändert — für jede gesperrte DMRL |
| anderer Bearbeiter | — | nicht möglich |
| Sperrinhaber | „Excel-Datei erneut herunterladen" *(Refinement 2026-11-25)* | Datei mit dem Stand beim Check-out (`.xlsx`, auch für Check-outs, die vor der Umstellung als CSV ausgecheckt wurden) |

Zurücknehmen/Aufheben ist keine Änderung der DMRL: Freigabestatus bleibt erhalten.

**Nachvollziehbarkeit**
- Sperre speichert Benutzer und Zeitpunkt.
- Workflow-Verlauf der DMRL erhält je Schritt Datum, Benutzer und Aktion: „Check-out", „Check-out zurückgenommen", „Sperre aufgehoben durch Administrator (Sperrinhaber: [Name])". Anzeige des Verlaufs → PROJ-15.
- Die Excel-Datei wird nicht archiviert (nur SEND/REPLY, PRD).
- „Im Workflow verwendet" (PROJ-4/5/6) gilt erst nach einem **abgeschlossenen Check-in**; Check-out allein oder zurückgenommener Check-out zählt nicht.

## User Stories
- Als **Bearbeiter** möchte ich die DMRL als MS-Excel-Datei auschecken, damit ich die Einträge direkt in Excel bearbeiten kann — ohne CSV-Import, ohne verlorene führende Nullen und ohne Kodierungsprobleme *(Refinement 2026-11-25)*.
- Als **Bearbeiter** möchte ich, dass die DMRL während meiner Bearbeitung gesperrt ist, damit niemand parallel ändert und meine Änderungen nicht überschrieben werden.
- Als **Bearbeiter** möchte ich meinen Check-out zurücknehmen, wenn ich mich vertan habe, damit die DMRL wieder für andere frei ist.
- Als **Bearbeiter** möchte ich die ausgecheckte Excel-Datei erneut herunterladen, falls ich die Datei verloren habe.
- Als **Administrator** möchte ich eine verwaiste Sperre aufheben, damit die Arbeit weitergehen kann, wenn der Sperrinhaber ausfällt.
- Als **Bearbeiter** möchte ich sehen, wer die DMRL seit wann ausgecheckt hat, damit ich mich mit ihm abstimmen kann.

## Out of Scope
- ~~Excel-Format (.xlsx)~~ → jetzt im Umfang *(Refinement 2026-11-25)*
- CSV beim Check-out (auch nicht wahlweise) — CSV gibt es weiterhin über den Export (PROJ-18) *(Refinement 2026-11-25)*
- Kopfdaten-Blatt, weitere Tabellenblätter, zusätzliche Metadatenspalten (Aufbau der Beispiel-Excel)
- Altes Excel-Format (.xls), Makro-Mappen (.xlsm), OpenDocument (.ods) *(Refinement 2026-11-25)*
- Check-in, Prüfung, Übernahme → PROJ-10, PROJ-8
- Export ohne Sperre (CSV/XML) → PROJ-18
- Archivierung der Excel-Datei
- Anzeige des Workflow-Verlaufs → PROJ-15
- Teil-Check-out (einzelne Einträge oder Kapitel)
- Check-out während die DMRL auf einen REPLY wartet (inkl. „Fehler ignorieren"-Ausnahme aus Anforderung 02)
- Automatischer Ablauf der Sperre nach Zeit

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Check-out
- [ ] Angenommen ein berechtigter Bearbeiter öffnet eine nicht gesperrte DMRL mit Status ≠ „gesendet", wenn er „Check-out" wählt, dann erscheint eine Bestätigung mit Dateiname und Hinweis „Die DMRL wird für andere gesperrt, bis Sie sie wieder einchecken"
- [ ] Angenommen der Bearbeiter bestätigt, wenn der Check-out ausgeführt wird, dann wird die Excel-Datei (.xlsx) heruntergeladen und die DMRL ist auf ihn gesperrt *(Refinement 2026-11-25)*
- [ ] Angenommen die Bestätigung ist offen, wenn „Abbrechen" gewählt wird, dann wird nichts heruntergeladen und die DMRL bleibt ungesperrt
- [ ] Angenommen ein Administrator öffnet eine beliebige nicht gesperrte DMRL, wenn er „Check-out" wählt, dann ist der Check-out wie für einen Bearbeiter möglich
- [ ] Angenommen ein Bearbeiter ist für die DMRL nicht berechtigt, wenn er den Check-out direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-17)
- [ ] Angenommen die DMRL ist von Bea Bearbeiter gesperrt, wenn ein anderer Benutzer sie öffnet, dann ist „Check-out" deaktiviert mit „Ausgecheckt von Bea Bearbeiter seit [Datum, Uhrzeit]"
- [ ] Angenommen die DMRL hat den Status „gesendet", wenn ein Benutzer „Check-out" wählt, dann ist dies nicht möglich mit dem Hinweis, dass auf den REPLY gewartet wird
- [ ] Angenommen die DMRL ist freigegeben, wenn sie ausgecheckt wird, dann bleibt der Status „freigegeben" bestehen
- [ ] Angenommen die DMRL hat keine Einträge, wenn sie ausgecheckt wird, dann enthält die Excel-Datei nur die Kopfzeile

### Inhalt der Excel-Datei *(Refinement 2026-11-25 — bisher „CSV-Inhalt“)*
- [ ] Angenommen die DMRL PHUNGUN (Originator D0815, DML-Typ c) wird 2026 ausgecheckt, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-2026.xlsx` und lässt sich per Doppelklick in MS Excel ohne Reparaturmeldung öffnen
- [ ] Angenommen eine Datei wurde ausgecheckt, wenn sie in Excel geöffnet wird, dann enthält sie genau ein Tabellenblatt „Einträge“, dessen Zeile 1 genau die 28 Feldnamen in der festgelegten Reihenfolge enthält, je Feld eine Spalte, ohne Kopfdaten
- [ ] Angenommen die DMRL hat 32 Einträge, darunter Eintragstyp `d`, wenn ausgecheckt wird, dann enthält das Blatt 32 Datenzeilen, sortiert nach DMC
- [ ] Angenommen ein Eintrag hat `security` = `01` und `issno` = `001`, wenn die Datei in Excel geöffnet wird, dann stehen die Werte mit führenden Nullen als Text in den Zellen
- [ ] Angenommen der Bearbeiter tippt in Excel in einer neuen Zeile `01` in die Spalte `security`, wenn er speichert und eincheckt, dann kommt `01` an (Spalte ist als Text formatiert)
- [ ] Angenommen die Excel-Datei wird geöffnet, dann ist die Kopfzeile fett und fixiert und hat einen Autofilter
- [ ] Angenommen ein Tech Name enthält Umlaute, wenn die Datei in Excel geöffnet wird, dann werden die Umlaute korrekt angezeigt
- [ ] Angenommen ein Wert beginnt mit `=`, `+`, `-` oder `@` (z. B. Begründung aus einem REPLY), wenn die Datei in Excel geöffnet wird, dann wird er als Text angezeigt, keine Formel ausgewertet, und beim Check-in unverändert gelesen
- [ ] Angenommen ein Wert enthält `;`, `"` oder einen Zeilenumbruch, wenn ausgecheckt und unverändert eingecheckt wird, dann ist der Wert unverändert
- [ ] Angenommen ein Eintrag hat `answer`, `answer_comment` und `answer_timestamp` aus einem REPLY, wenn ausgecheckt wird, dann sind alle drei Werte in der Datei enthalten
- [ ] Angenommen die Demo-DMRL PHUNGUN wird ausgecheckt und unverändert eingecheckt, wenn geprüft wird, dann ist die Datei fehlerfrei (PROJ-8)
- [ ] Angenommen die ausgecheckte Excel-Datei wird in Excel geöffnet, bearbeitet und gespeichert, wenn eingecheckt wird, dann wird sie angenommen (Rundlauf Check-out → Excel → Check-in)

### Sperre aufheben
- [ ] Angenommen der Sperrinhaber öffnet die DMRL, wenn er „Check-out zurücknehmen" wählt und bestätigt, dann ist die Sperre aufgehoben und die DMRL unverändert
- [ ] Angenommen der Sperrinhaber öffnet die DMRL, wenn er „Excel-Datei erneut herunterladen" wählt, dann erhält er die `.xlsx`-Datei mit dem Stand beim Check-out
- [ ] Angenommen eine DMRL wurde vor der Umstellung als CSV ausgecheckt, wenn der Sperrinhaber „Excel-Datei erneut herunterladen" wählt, dann erhält er eine `.xlsx`-Datei mit dem Stand beim Check-out; die alte CSV kann weiterhin eingecheckt werden (PROJ-10) *(Refinement 2026-11-25)*
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
- **Download schlägt fehl / wird vom Browser blockiert:** Sperre ist gesetzt; Sperrinhaber nutzt „Excel-Datei erneut herunterladen" oder „Check-out zurücknehmen".
- **Offener Check-out aus der Zeit vor der Umstellung (CSV):** Sperre und Kopie bleiben gültig; erneuter Download liefert `.xlsx`, Check-in nimmt die alte CSV oder die neue Excel-Datei an *(Refinement 2026-11-25)*.
- **Sehr lange Feldinhalte:** Spaltenbreite begrenzt, voller Inhalt bleibt in der Zelle (Excel-Grenze 32 767 Zeichen je Zelle wird von DMRL-Werten nicht erreicht) *(Refinement 2026-11-25)*.
- **Datei wird in LibreOffice/Numbers statt MS Excel geöffnet:** nicht Ziel der Abnahme; Aufbau ist Standard-.xlsx *(Refinement 2026-11-25)*.
- **Admin ändert DMRL-Kopfdaten (Sicherheitseinstufung) während der Sperre:** erlaubt; betrifft nicht die Einträge.
- **Demo-Daten neu laden während einer Sperre:** Sperren der Demo-Daten gelten (PROJ-1); offene Check-outs gehen verloren.
- **Zwei Tabs gleichzeitig „Check-out":** der zweite Versuch erkennt die bestehende Sperre (Prototyp, letzter Speicherstand gilt, PROJ-1).

## Technical Requirements (optional)
- Download direkt im Browser, keine Serverfunktion nötig, offline lauffähig (Windows-Offline-Paket)
- Excel-Erzeugung für 1.000 Einträge in unter einer Sekunde *(Refinement 2026-11-25)*
- Kein neues Paket nötig, falls der Excel-Schreiber aus PROJ-18 genutzt wird — Bestätigung in `/architecture` *(Refinement 2026-11-25)*

## Open Questions
- [ ] Soll PROJ-20 (XML-Prüfung) künftig ebenfalls eine Excel-Datei statt/neben der CSV liefern? → eigenes Refinement von PROJ-20; bis dahin wird die CSV aus PROJ-20 beim Check-in weiter angenommen (2026-11-25)
- [x] Werden im Workflow-Verlauf auch Admin-Änderungen an den DMRL-Kopfdaten protokolliert? → Ja, „Kopfdaten geändert: Feld alt → neu" (PROJ-15)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| ~~Nur CSV, kein Excel-Format~~ — ersetzt 2026-11-25 | Vorgabe Product Owner | 2026-11-12 |
| Check-out nur noch als MS-Excel (.xlsx), keine CSV mehr (auch nicht wahlweise) | Vorgabe Product Owner; Bearbeitung direkt in Excel ohne CSV-Import, führende Nullen/Umlaute bleiben erhalten | 2026-11-25 |
| Aufbau wie Excel-Export PROJ-18: ein Blatt „Einträge“, 28 Spalten, alle Zellen Text, fixierte Kopfzeile, Autofilter, keine Kopfdaten | Ein Aufbau für Export und Check-out; Kopfdaten-Blatt verworfen (nicht nötig für den Check-in) | 2026-11-25 |
| Dateiname bleibt `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}`, Endung `.xlsx` | Kontinuität; unterscheidet sich vom Export (`…-Export-{Datum}`) | 2026-11-25 |
| Erneuter Download liefert immer `.xlsx`, auch bei Check-outs aus der CSV-Zeit | Ein Format; die alte CSV bleibt beim Check-in gültig | 2026-11-25 |
| Keine Kopfdaten in der CSV | Vorgabe Product Owner; eindeutige Prüfung beim Check-in | 2026-11-12 |
| Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}.csv` | Vorgabe Product Owner, angelehnt an XML-Dateinamen | 2026-11-12 |
| Kein Check-out bei Status „gesendet" | NSG: kein neuer Zyklus vor Abschluss des laufenden | 2026-11-12 |
| Rücknahme durch Sperrinhaber, Aufhebung durch Administrator | Verwaiste Sperren auflösbar | 2026-11-12 |
| CSV erneut herunterladbar während der Sperre | Verlorene Datei ohne neuen Check-out | 2026-11-12 |
| Fehlende führende Nullen bei `security`, `issno`, `day`, `month` werden beim Check-in aufgefüllt | Vorgabe Product Owner — Excel entfernt Nullen beim Öffnen | 2026-11-12 |
| Alle Einträge inkl. `d`/`deleted`, sortiert nach DMC | Fehlende Einträge sind beim Check-in ein Fehler (PROJ-8 F) | 2026-11-12 |
| Semikolon, UTF-8 mit BOM | Deutsches Excel öffnet die Datei direkt korrekt — gilt seit 2026-11-25 nur noch für CSV-Dateien (Export, Check-in) | 2026-11-12 |
| Workflow-Verlauf mit Benutzer/Datum/Aktion; ausgecheckte Datei nicht archiviert | Nachvollziehbarkeit (PROJ-17), Archiv nur SEND/REPLY (PRD) | 2026-11-12 |
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
| Check-out-Excel mit dem vorhandenen Excel-Schreiber aus PROJ-18 (`fflate`), kein neues Paket | Bewährt, offline, gleiches Erscheinungsbild wie der Export | 2026-11-25 |
| Gemeinsamer Baustein „Einträge als Excel“ (Blattname, Spaltenliste, DMC-Sortierung) für Export, Check-out und als Gegenstück zum Excel-Leser (PROJ-10) | Schreiben und Lesen können nicht auseinanderlaufen | 2026-11-25 |
| Datenmodell der Sperre unverändert (Kopie der Einträge, keine Datei) | Keine Migration; alte CSV-Check-outs liefern beim erneuten Download sofort `.xlsx` | 2026-11-25 |
| PROJ-9 und PROJ-10 werden gemeinsam umgesetzt und ausgeliefert | Check-out `.xlsx` ohne Excel-Check-in würde den Rundlauf brechen | 2026-11-25 |
| Excel-Datei aus der gespeicherten Kopie in der Sperre — wie bisher die CSV | Erneuter Download identisch; Check-in-Vergleich unverändert | 2026-11-25 |

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
| Check-out | berechtigt (Rechte-Regel PROJ-2) · nicht gesperrt · Status ≠ *gesendet* | „Ausgecheckt von …" bzw. „Die DMRL wartet auf die Antwort des Empfängers …" |
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

### I) Refinement 2026-11-25 — Check-out als MS-Excel (.xlsx)
Ergänzt das bestehende Design; Muster, Verfügbarkeitsregeln, Sperre und Abläufe (A–D) gelten unverändert. Es ändert sich nur, **welche Datei** aus der gespeicherten Kopie entsteht. Weiterhin alles im Browser, kein Backend, offline lauffähig.

**Komponenten (nur Texte und Dateityp ändern sich)**
```
DMRL-Ansicht (PROJ-7) — Aktionsleiste
+-- „Check-out" → Bestätigungsdialog
|   +-- Dateiname jetzt …-{Jahr}.xlsx · Sperrhinweis unverändert
+-- nur Sperrinhaber:
|   +-- „Excel-Datei erneut herunterladen" (bisher „CSV erneut herunterladen")
|   +-- „Check-out zurücknehmen" → Hinweis: Änderungen in der Excel-Datei gehen verloren
+-- nur Administrator bei fremder Sperre: „Sperre aufheben" (unverändert)
```
Keine neuen Bildschirme, keine neuen shadcn-Komponenten.

**Datenmodell**
- **Unverändert.** Die Sperre speichert weiterhin Benutzer, Zeitpunkt und die Kopie der Einträge — nicht die Datei. Deshalb ist **keine Umstellung gespeicherter Daten** nötig: Auch eine DMRL, die vor der Umstellung als CSV ausgecheckt wurde, liefert beim erneuten Download sofort eine Excel-Datei aus ihrer Kopie.
- Workflow-Verlauf unverändert („Check-out (N Einträge)").

**Gemeinsamer Baustein „Einträge als Excel-Datei"**
- Heute baut der Excel-Export (PROJ-18) die Datei aus Kopfzeile + Einträgen (sortiert nach DMC) mit dem vorhandenen Excel-Schreiber. Genau dieser Teil wird zu **einem gemeinsamen Baustein**, den Export und Check-out nutzen — mit demselben Blattnamen „Einträge" und derselben Spaltenliste wie der CSV-Schreiber/-Leser (PROJ-8).
- Blattname und Spaltenliste stehen an **einer** Stelle; der Excel-Leser des Check-ins (PROJ-10) nutzt dieselbe Definition, sodass Schreiben und Lesen nicht auseinanderlaufen können.
- Der Excel-Schreiber selbst bleibt unverändert: alle Zellen und ganzen Spalten als Text, Kopfzeile fett und fixiert, Autofilter, Spaltenbreiten, Entfernen unzulässiger Steuerzeichen, kein Formelschutz-Apostroph (Textzellen werden nie als Formel ausgewertet).

**Abläufe (Änderung gegenüber D)**
- **Check-out:** wie bisher erst speichern (Sperre + Kopie + Verlauf), dann **Excel-Datei** aus der Kopie erzeugen und herunterladen.
- **Erneuter Download:** Excel-Datei aus der Kopie; Dateiname mit dem Jahr des Check-outs → inhaltlich identische Datei.
- Der gemeinsame Download-Helfer (Bytes + Dateityp) existiert bereits aus PROJ-18.

**Auswirkung auf bestehende Teile**
| Teil | Änderung |
|---|---|
| Check-out-Workflow | Dateiname `.xlsx`; Datei aus der Kopie als Excel statt CSV |
| Aktionsleiste / Dialoge | Beschriftung „Excel-Datei erneut herunterladen", Dateiname im Dialog, Hinweistext beim Zurücknehmen |
| Excel-Export (PROJ-18) | nutzt den gemeinsamen Baustein — Ergebnis unverändert |
| CSV-Schreiber | bleibt für CSV-Export (PROJ-18), Freigabestand (PROJ-14), Prüfbericht und PROJ-20 |
| Check-in (PROJ-10) | muss `.xlsx` lesen können — **Abhängigkeit, s. Reihenfolge** |

**Reihenfolge der Umsetzung**
PROJ-9 darf **nicht allein** ausgeliefert werden: Sobald der Check-out `.xlsx` liefert, der Check-in aber nur `.csv` annimmt, kann der Bearbeiter seine eigene Datei nicht mehr einchecken (Rundlauf gebrochen). PROJ-9 und PROJ-10 werden deshalb **gemeinsam** umgesetzt (ein `/frontend`-Lauf oder PROJ-10 zuerst) und gemeinsam getestet.

**Technische Entscheidungen (für PM erklärt)**
| Entscheidung | Warum |
|---|---|
| Vorhandenen Excel-Schreiber aus PROJ-18 nutzen | Bewährt (QA bestanden), offline, kein neues Paket; Export und Check-out sehen gleich aus. |
| Gemeinsamer Baustein „Einträge als Excel" für Export und Check-out | Ein Aufbau an einer Stelle — kein Auseinanderlaufen von Export, Check-out und Check-in. |
| Datei weiterhin aus der gespeicherten Kopie, nicht gespeichert | Kein Speicherbedarf für Dateien im Browser; erneuter Download identisch; alte CSV-Check-outs funktionieren ohne Umstellung. |
| PROJ-9 und PROJ-10 gemeinsam ausliefern | Sonst kann eine ausgecheckte Datei nicht wieder eingecheckt werden. |

**Abhängigkeiten (Pakete)**
- **Keine neuen Pakete** — Excel-Schreiber (mit `fflate`, bereits installiert) aus PROJ-18.

**Testbarkeit**
- Unit: Dateiname `.xlsx` mit Jahr des Check-outs; Datei aus der Kopie enthält Blatt „Einträge", 28 Spalten in fester Reihenfolge, alle Einträge nach DMC, führende Nullen als Text, Formelwerte als Text; erneuter Download identisch; Check-out einer DMRL ohne Einträge → nur Kopfzeile; Sperre aus der CSV-Zeit → Excel-Datei; Export liefert nach Umbau dasselbe wie vorher.
- Rundlauf (zusammen mit PROJ-10): Excel aus Check-out → Excel-Leser → Prüfung ohne Änderung.
- Komponenten: Beschriftung „Excel-Datei erneut herunterladen", Dateiname im Dialog.
- E2E: Check-out Fahrzeug → Download `DML-GTFDEMO-D0815-C-[Jahr].xlsx`; Datei öffnen (Blatt, Kopfzeile, Werte); bestehende E2E-Tests, die die Check-out-CSV bearbeiten und einchecken, werden auf die Excel-Datei umgestellt (bzw. erzeugen die zu prüfende CSV über den CSV-Export).
- Manuell (Abnahme): Datei per Doppelklick in MS Excel öffnen — keine Reparaturmeldung, `01` bleibt `01`, neue Zeile tippen und speichern.

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

### Refinement 2026-11-25 — Check-out als MS-Excel (.xlsx)
_Stand 2026-11-25 — `/frontend PROJ-9 PROJ-10` (Tech Design I, gemeinsam mit PROJ-10)_

**Umgesetzt**
- `src/lib/files/entries-xlsx.ts` (neu) — gemeinsamer Baustein „Einträge als Excel“: Blattname „Einträge“ (`ENTRIES_SHEET_NAME`), Spalten und DMC-Sortierung wie der CSV-Schreiber. Genutzt von Excel-Export (PROJ-18, Ergebnis unverändert) und Check-out; der Excel-Leser des Check-ins sucht dasselbe Blatt.
- `src/lib/workflows/check-out.ts` — Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}.xlsx`; `lockXlsx` erzeugt die Excel-Datei aus der Kopie in der Sperre (ersetzt `lockCsv`). Datenmodell der Sperre unverändert — Check-outs aus der CSV-Zeit liefern beim erneuten Download sofort `.xlsx`.
- `src/components/workflows/check-out-dialogs.tsx` — Download als Excel (`downloadBytes`, Excel-MIME-Typ), Texte „Excel-Datei“ im Bestätigungs- und Zurücknehmen-Dialog.
- `src/lib/dmrl/actions.ts`, `dmrl-action-bar.tsx`, `dmrl-view.tsx` — Aktion „Excel-Datei erneut herunterladen“ (interne ID `datei_erneut_herunterladen`, vorher `csv_erneut_herunterladen`).
- `src/lib/files/xlsx-writer.ts` — Dateiinhalte vor dem Packen als `Uint8Array` dieses Realms: In der Testumgebung (jsdom, Node 26) deutete `zipSync` die Bytes sonst als Verzeichnis — **9 der 11 Writer-Tests schlugen bereits vor dieser Änderung fehl** (Umgebung, nicht Browser). Ausgabe unverändert.

**Tests**
- Unit: `check-out.test.ts` (Dateiname `.xlsx`, Blatt „Einträge“, 28 Spalten, Kopie unabhängig vom späteren Datenbestand, ZIP-Kennung), `check-out-dialogs.test.tsx` (Download als Excel, „Excel-Datei erneut herunterladen“ mit gleichem Namen und Inhalt), `qa-proj7-10.test.ts` (DMRL ohne Einträge → nur Kopfzeile).
- E2E: neu `tests/PROJ-9-10-excel.spec.ts` (Check-out-Datei: Blatt, fixierte Kopfzeile, Autofilter A1:AB11, erneuter Download); bestehende Specs, die die Check-out-Datei als Text bearbeiten, wandeln sie über die Testhilfe `checkOutXlsxToCsv` (`tests/helpers.ts`) in CSV und checken diese ein; BUG-QA2-1-Test prüft jetzt die Textzelle in der Excel-Datei und checkt die `.xlsx` direkt ein.
- Gesamt: 685 Unit-Tests (57 Dateien) und 151 E2E-Tests grün; Lint ohne Fehler.

**Hinweise**
- Die erneut heruntergeladene Datei ist **inhaltlich** identisch; die Bytes können sich durch den Zeitstempel im ZIP unterscheiden.
- Manuelle Abnahme in MS Excel (Doppelklick ohne Reparaturmeldung, `01` bleibt `01`, neue Zeile tippen) steht aus → `/qa`.

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
- [x] XSS: HTML/Script in Empfänger-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar
- [ ] **BUG-QA2-1 (Medium):** CSV-Formel-Injection — Werte, die mit `=`, `+`, `-` oder `@` beginnen, werden unverändert in CSV-Dateien geschrieben und von Excel als Formel ausgeführt

### Bugs Found

#### BUG-QA2-1: CSV-Formel-Injection in exportierten CSV-Dateien
- **Severity:** Medium (Sicherheit)
- **Betrifft:** CSV-Schreiber (`src/lib/files/csv-writer.ts`) und damit Check-out (PROJ-9), DMRL-Export (PROJ-18), Freigabestand-Export (PROJ-14), Prüfbericht-Download (PROJ-8)
- **Steps to Reproduce:**
  1. Empfänger liefert im REPLY als Begründung (`answer/remarks`) z. B. `=HYPERLINK("http://angreifer.example";"Details")`; REPLY übernehmen
  2. DMRL auschecken oder als CSV exportieren und die Datei in Excel öffnen
  3. Expected: Wert wird als Text angezeigt
  4. Actual: Zelle enthält `"=HYPERLINK(""http://angreifer.example"",""Details"")"` — Excel wertet die Formel aus (Link/DDE-Angriffe möglich)
- **Hinweis zur Behebung:** Ein vorangestelltes `'` (Papa Parse `escapeFormulae`) verhindert die Ausführung, verändert aber den Wert beim Check-in — Lösung muss den Rundlauf Check-out → Check-in erhalten (z. B. Präfix beim Lesen wieder entfernen)
- **Priority:** Fix before deployment (Daten stammen von externen Empfängern)
- **Status:** Behoben 2026-11-14 (`/frontend`) — Neuer Baustein `src/lib/files/csv-formula.ts`: Werte, die mit `=`, `+`, `-`, `@`, Tab oder Wagenrücklauf beginnen (auch nach vorangestellten Apostrophen), erhalten beim Schreiben ein `'`; der CSV-Leser des Check-ins entfernt genau dieses eine Zeichen wieder → Rundlauf Check-out → Check-in verlustfrei. Gilt für alle CSV-Dateien (Check-out, Export, Freigabestand, Prüfbericht). Tests: `csv-formula.test.ts` (6) und E2E „BUG-QA2-1" in `tests/QA-proj7-19.spec.ts` (REPLY mit Formel → Check-out-CSV entschärft → Check-in ohne Änderung)

### Summary
- **Acceptance Criteria:** 26/26 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low)
- **Security:** Issues found (siehe Bugs)
- **Production Ready:** YES (keine Critical/High-Bugs)

### Re-Test 2026-11-14 (Bestätigung der Bugfixes)
- [x] **BUG-QA2-1 bestätigt behoben:** Formel aus REPLY steht in der Check-out-CSV mit `'` entschärft; keine Zelle beginnt mit `=`, `+`, `-`, `@`; Check-in derselben Datei meldet „Keine Änderungen“, Wert unverändert (Unit + E2E)
- [x] Zusätzlich geprüft: Werte, die schon mit Apostroph beginnen (`'=x`, `''=x`), und harmlose Werte (`Bremse - vorne`, `A00`) überstehen den Rundlauf unverändert
- [ ] Hinweis (kein Bug): Speichert Excel die Datei neu, kann es das führende `'` als Eingabe-Präfix entfernen. Für normale Werte ist das ohne Folgen; nur ein Wert, der selbst mit `'=` beginnt, verliert dann ein Apostroph — praktisch nicht relevant
- Automatisierte Tests: 432 Unit-Tests (48 Dateien) und 69 E2E-Tests (Chromium/Chrome) grün — keine Regressionen
- Nicht getestet: Firefox und Safari (nicht installiert)

**Ergebnis Re-Test**
- **Acceptance Criteria:** 26/26 passed
- **Offene Bugs:** keine
- **Security:** Pass
- **Production Ready:** YES

## Deployment
_To be added by /deploy_
