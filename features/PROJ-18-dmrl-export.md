# PROJ-18: DMRL-Export (CSV/XML/Excel)

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-24

> **Refinement 2026-11-24 — Excel-Export (.xlsx):** Der aktuelle Stand einer DMRL kann zusätzlich als MS-Excel-Datei (.xlsx) exportiert werden — ein Tabellenblatt „Einträge“ mit denselben 28 Spalten wie der CSV-Export, alle Zellen als Text, fixierte Kopfzeile, Autofilter, angepasste Spaltenbreiten. Nur zur Information/Weitergabe: **kein Check-in von .xlsx** (PROJ-10 unverändert), **kein Excel-Export des Freigabestands** (PROJ-14 unverändert). Anlass: Vorgabe Product Owner. Geänderte Stellen sind mit *(Refinement 2026-11-24)* markiert.

> **Refinement 2026-11-21 (über PROJ-13) — `answer_timestamp`:** Der CSV-Export enthält die 28. Spalte `answer_timestamp`; der XML-Export nicht (kein S1000D-Element, XSD-konform).

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Exportieren"
- Requires: PROJ-9 (Check-out CSV) — CSV-Aufbau
- Requires: PROJ-12 (SEND-Export) — XML-Aufbau je Issue
- Requires: PROJ-11 (XSD-Validierung) — Prüfung vor dem Download
- Requires: PROJ-17 (Berechtigungen)
- Wird genutzt von: PROJ-14 (Export des Freigabestands verwendet denselben Aufbau)

## Beschreibung
Der aktuelle Stand einer DMRL kann **jederzeit** als CSV, S1000D-XML oder MS-Excel (.xlsx) *(Refinement 2026-11-24)* exportiert werden — unabhängig von Sperre und Status, ohne Workflow, ohne Versionsindex und ohne Archiveintrag. Der Export dient zur Information und Weitergabe (z. B. Vorführung, interne Abstimmung, TP-Projekt). Ein XML-Export ist als Arbeitsstand gekennzeichnet und kann nicht mit einem offiziellen SEND verwechselt werden.

## Export
Aktion **„Exportieren"** in der DMRL-Ansicht mit Auswahl **CSV**, **XML** oder **Excel** *(Refinement 2026-11-24)*.

| Punkt | Festlegung |
|---|---|
| Wer | berechtigte Bearbeiter (PROJ-17) und Administratoren |
| Wann | jederzeit — auch wenn ausgecheckt (auch von anderen), *gesendet* oder *freigegeben* |
| Inhalt | aktueller Stand der DMRL in der Anwendung (bei Sperre: Stand vor dem Check-in, nicht die Änderungen in der ausgecheckten CSV) |
| Wirkung | keine: keine Sperre, keine Statusänderung, kein Versionsindex, kein Archiv, kein Verlaufseintrag (PROJ-15) |
| DMRL ohne Einträge | CSV und Excel: nur Kopfzeile. XML: nicht möglich — „Die DMRL hat keine Einträge" (Schema verlangt mindestens einen Eintrag) |

### CSV
- Aufbau wie Check-out (PROJ-9): 27 Spalten, Semikolon, UTF-8 mit BOM, alle Einträge nach DMC sortiert, inkl. `answer`/`answer_comment`
- Dateiname: `DML-{MI}-{CAGE Originator}-{DML-Typ}-Export-{JJJJ-MM-TT}.csv`, z. B. `DML-PHUNGUN-D0815-C-Export-2026-11-12.csv`
- Eine Export-CSV kann bei bestehender eigener Sperre eingecheckt werden (gleicher Aufbau); sie wird wie jede Datei geprüft (PROJ-8/10)

### Excel (.xlsx) *(Refinement 2026-11-24)*
- **Ein Tabellenblatt „Einträge“** mit genau dem Inhalt des CSV-Exports: dieselben 28 Spalten (inkl. `answer`, `answer_comment`, `answer_timestamp`), Kopfzeile in Zeile 1, alle Einträge nach DMC sortiert
- **Alle Zellen als Text** — keine Umwandlung durch Excel (führende Nullen bleiben erhalten, z. B. `00A`; keine automatische Datums- oder Zahlenumwandlung)
- **Komfort:** Kopfzeile fixiert, Autofilter auf der Kopfzeile, Spaltenbreiten an den Inhalt angepasst
- **Keine Kopfdaten** (System, Originator, Status, Versionsindex) — wie beim CSV-Export
- **Formel-Injection:** Werte, die mit `=`, `+`, `-` oder `@` beginnen, werden als Text abgelegt und nie als Formel ausgewertet (gleicher Schutz wie BUG-QA2-1, PROJ-9)
- Dateiname: `DML-{MI}-{CAGE Originator}-{DML-Typ}-Export-{JJJJ-MM-TT}.xlsx`, z. B. `DML-PHUNGUN-D0815-C-Export-2026-11-24.xlsx`
- **Nur zur Information und Weitergabe:** eine Excel-Datei kann **nicht** eingecheckt werden; Check-in bleibt CSV (PROJ-10)
- Keine XSD-Prüfung (kein XML)

### XML
**Kopf**
| Feld | Wert |
|---|---|
| Richtung | `send` |
| `dmlc` | MI · CAGE Originator · DML-Typ · Jahr und seqnum des **letzten SEND**; ohne SEND: **vorgegebener Versionsindex erster SEND (PROJ-6)**, sofern aus dem aktuellen Jahr, sonst aktuelles Jahr und `00001` (Schema verlangt eine positive Zahl) — gleiche Regel wie der nächste SEND (Refinement PROJ-6, 2026-11-22) |
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
- Als **Bearbeiter** möchte ich den aktuellen Stand als Excel-Datei exportieren, damit Empfänger sie direkt in Excel öffnen, filtern und lesen können — ohne CSV-Import und ohne verfälschte Werte. *(Refinement 2026-11-24)*
- Als **Product Owner** möchte ich in der Demo jederzeit Stände in allen Formaten (CSV, XML, Excel) zeigen können.

## Out of Scope
- Export mehrerer DMRLs auf einmal
- ~~Excel-Format (.xlsx)~~ → jetzt im Umfang *(Refinement 2026-11-24)*
- Check-in einer Excel-Datei (.xlsx) — Check-in bleibt CSV (PROJ-10); ggf. späteres Refinement von PROJ-10 *(Refinement 2026-11-24)*
- Excel-Export des Freigabestands (PROJ-14) — dort weiterhin nur CSV/XML *(Refinement 2026-11-24)*
- Weitere Tabellenblätter in der Excel-Datei (z. B. Kopfdaten) *(Refinement 2026-11-24)*
- Export mit Kopfdaten in der CSV
- Auswahl einzelner Einträge oder Spalten
- Protokollierung von Exporten (PROJ-15)
- Export archivierter SEND/REPLY-Stände → Download im Archiv (PROJ-15)
- Export als offizieller Austauschstand → SEND (PROJ-12)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein berechtigter Bearbeiter öffnet die DMRL-Ansicht, wenn er „Exportieren" wählt, dann kann er CSV, XML oder Excel auswählen *(Refinement 2026-11-24)*
- [ ] Angenommen ein Bearbeiter ist nicht berechtigt, wenn er den Export direkt aufruft, dann erscheint „Keine Berechtigung"
- [ ] Angenommen die DMRL ist von einem anderen Benutzer ausgecheckt, wenn exportiert wird, dann ist der Export möglich und enthält den Stand der Anwendung
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn exportiert wird, dann ist der Export möglich

### CSV
- [ ] Angenommen PHUNGUN wird am 12.11.2026 als CSV exportiert, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-Export-2026-11-12.csv` und hat den Aufbau von PROJ-9
- [ ] Angenommen eine DMRL wird als CSV exportiert, wenn danach der Status betrachtet wird, dann ist sie nicht gesperrt und unverändert

### XML
- [ ] Angenommen PHUNGUN (letzter SEND 00002-2026) wird als XML exportiert, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-2026-00002_000-01.XML` und hat `issno` `000`, `inwork` `01`
- [ ] Angenommen eine DMRL wurde nie gesendet, wenn als XML exportiert wird, dann hat `dmlc` seqnum und Jahr des vorgegebenen Versionsindex erster SEND (PROJ-6; Standard `00001` und aktuelles Jahr), und `dmlref` verweist auf sich selbst
- [ ] Angenommen ein XML-Export wird erzeugt, wenn er geöffnet wird, dann enthält `remarks` „Export vom [Datum] — kein offizieller Austauschstand" und kein Eintrag hat `answer`
- [ ] Angenommen das System hat Issue 2.3 / 4.2 / 5.0, wenn als XML exportiert wird, dann besteht die Datei die XSD-Prüfung des jeweiligen Issues
- [ ] Angenommen die XSD-Prüfung schlägt fehl oder ist nicht verfügbar, wenn als XML exportiert wird, dann wird nichts heruntergeladen und eine Meldung erscheint
- [ ] Angenommen eine DMRL hat keine Einträge, wenn als XML exportiert wird, dann erscheint „Die DMRL hat keine Einträge" und nichts wird heruntergeladen
- [ ] Angenommen ein XML-Export wurde erstellt, wenn das Archiv und der Verlauf betrachtet werden, dann gibt es dafür keinen Eintrag und keinen neuen Versionsindex

### Excel *(Refinement 2026-11-24)*
- [ ] Angenommen PHUNGUN wird am 24.11.2026 als Excel exportiert, wenn die Datei gespeichert wird, dann heißt sie `DML-PHUNGUN-D0815-C-Export-2026-11-24.xlsx` und lässt sich in MS Excel ohne Reparaturmeldung öffnen
- [ ] Angenommen eine DMRL wird als Excel exportiert, wenn die Datei geöffnet wird, dann enthält sie genau ein Tabellenblatt „Einträge“ mit denselben 28 Spalten, derselben Kopfzeile, denselben Werten und derselben Reihenfolge (nach DMC) wie der CSV-Export desselben Stands
- [ ] Angenommen ein Eintrag hat Werte mit führenden Nullen (z. B. `00A`) oder datums-/zahlenähnliche Werte, wenn die Excel-Datei geöffnet wird, dann stehen sie unverändert als Text in den Zellen
- [ ] Angenommen die Excel-Datei wird geöffnet, dann ist die Kopfzeile fixiert und hat einen Autofilter
- [ ] Angenommen ein Feld beginnt mit `=`, `+`, `-` oder `@`, wenn die Excel-Datei geöffnet wird, dann wird der Wert als Text angezeigt und keine Formel ausgewertet
- [ ] Angenommen eine DMRL hat keine Einträge, wenn als Excel exportiert wird, dann enthält die Datei nur die Kopfzeile
- [ ] Angenommen die DMRL ist von einem anderen Benutzer ausgecheckt oder hat Status *gesendet*, wenn als Excel exportiert wird, dann ist der Export möglich, und danach ist die DMRL unverändert (keine Sperre, kein Status, kein Archiv, kein Verlauf)
- [ ] Angenommen ein Bearbeiter hat die DMRL ausgecheckt, wenn er beim Check-in eine .xlsx-Datei hochlädt, dann erscheint „Bitte eine CSV-Datei auswählen" und es wird nichts geprüft (PROJ-10 unverändert)

## Edge Cases
- **Export während eines laufenden Check-ins (Zusammenfassung offen):** exportiert den Stand vor der Übernahme.
- **Jahreswechsel:** `dmlc` behält Jahr/seqnum des letzten SEND; Export-Datum ist das aktuelle Datum.
- **Zurückgezogener letzter SEND:** `dmlc` verwendet den letzten nicht zurückgezogenen SEND (bzw. `00001`).
- **Gleicher Dateiname bei mehreren Exporten am selben Tag:** Browser vergibt ggf. Zusatz; kein Problem für die Anwendung.
- **Sehr große DMRL:** Fortschrittsanzeige während XML-Erzeugung und Prüfung; ebenso während der Excel-Erzeugung, falls sie spürbar dauert. *(Refinement 2026-11-24)*
- **Sehr lange Feldinhalte (z. B. Titel, Bemerkungen):** Spaltenbreite wird begrenzt; der volle Inhalt bleibt in der Zelle erhalten. Excel-Grenze von 32 767 Zeichen je Zelle wird von DMRL-Feldern nicht erreicht. *(Refinement 2026-11-24)*
- **Sonderzeichen/Umlaute:** werden in .xlsx ohne BOM-/Kodierungsprobleme korrekt angezeigt (Vorteil gegenüber CSV). *(Refinement 2026-11-24)*

## Technical Requirements (optional)
- CSV-Export im Browser; XML-Prüfung serverseitig (PROJ-11)
- Excel-Export im Browser, offline lauffähig (kein Netzwerkzugriff, Windows-Offline-Paket); benötigt ein Paket zum Schreiben von .xlsx — Auswahl in `/architecture` *(Refinement 2026-11-24)*
- Excel-Export nutzt dieselbe Zeilen-/Spaltenaufbereitung wie der CSV-Export (eine Quelle für Spalten, Reihenfolge und Werte) *(Refinement 2026-11-24)*
- Gleiche XML-Erzeugung wie SEND (PROJ-12), nur Kopfwerte abweichend

## Open Questions
- [x] Inhalt der Excel-Datei? → ein Blatt „Einträge“, 28 Spalten wie CSV, alles Text, keine Kopfdaten (2026-11-24)
- [x] Check-in von .xlsx? → Nein, nur Information/Weitergabe; Check-in bleibt CSV (2026-11-24)
- [x] Freigabestand auch als Excel? → Nein, vorerst nicht (2026-11-24)
- [x] Welches Paket schreibt die .xlsx-Datei (Lizenz, Größe, Offline-Fähigkeit)? → eigener Excel-Schreiber + `fflate` (MIT) für das ZIP (2026-11-24, `/architecture`)

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
| Zusätzlicher Export als MS-Excel (.xlsx) | Vorgabe Product Owner; Empfänger öffnen die Datei direkt in Excel ohne CSV-Import, ohne Kodierungsprobleme und ohne verfälschte Werte | 2026-11-24 |
| Excel = ein Blatt „Einträge“ mit den 28 CSV-Spalten, alle Zellen Text, fixierte Kopfzeile, Autofilter, Spaltenbreiten; keine Kopfdaten | Inhalt identisch zum CSV-Export (keine zweite Datensicht); Text verhindert Umwandlung durch Excel (führende Nullen, Datumswerte) | 2026-11-24 |
| Kein Check-in von .xlsx | Check-in/Regelprüfung (PROJ-8/10) sind auf CSV ausgelegt und freigegeben; ein Rückweg in die Anwendung genügt; ggf. späteres Refinement von PROJ-10 | 2026-11-24 |
| Kein Excel-Export des Freigabestands (PROJ-14) | Umfang bleibt bei PROJ-18; Freigabestand ist Nachweis — CSV/XML maßgeblich; Excel-Schreiber später wiederverwendbar | 2026-11-24 |
| Dateiname `…-Export-{JJJJ-MM-TT}.xlsx`, Wirkung und Berechtigung wie CSV-Export | Konsistenz mit dem CSV-Export | 2026-11-24 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Export ohne Schreibzugriff auf den Datenbestand | Keine Wirkung laut Spec | 2026-11-12 |
| Kopf-Variante „Export" des DML-Schreibers (PROJ-12), auch für Freigabestand (PROJ-14) | Einträge identisch, nur Kopf abweichend | 2026-11-12 |
| XSD-Prüfung vor jedem XML-Export (PROJ-11) | Schemakonforme Dateien | 2026-11-12 |
| Aufklappmenü „Exportieren" mit CSV/XML | Eine Aktion in der Leiste | 2026-11-12 |
| Dritter Menüeintrag „Als Excel exportieren“ | Erweiterung des bestehenden Aufklappmenüs | 2026-11-24 |
| Excel-Erzeugung im Browser, Formelschutz wie BUG-QA2-1 | Kein Server nötig, offline; gleicher Sicherheitsstandard wie CSV | 2026-11-24 |
| Eigener Excel-Schreiber + `fflate` (ZIP) statt `exceljs` / `write-excel-file` / `xlsx` | Nur ein Blatt mit Text, Fixierung, Autofilter, Breiten nötig; `exceljs` seit 2023 unverändert mit schweren Abhängigkeiten, `write-excel-file` ohne Autofilter, `xlsx` auf npm veraltet mit Sicherheitslücken; `fflate` winzig, MIT, ohne Abhängigkeiten, offline | 2026-11-24 |
| Formelschutz in Excel durch Textzellen statt Apostroph | Textzellen werden nie als Formel ausgewertet; Excel zeigt den Originalwert. Apostroph wäre in .xlsx ein sichtbarer, verfälschender Zusatz | 2026-11-24 |
| Eintrags-Tabelle (Spalten, Sortierung, Werte) als gemeinsame Quelle für CSV und Excel | CSV und Excel können nicht auseinanderlaufen | 2026-11-24 |
| Unzulässige XML-Steuerzeichen entfernen, Sonderzeichen maskieren | Datei öffnet in Excel ohne Reparaturmeldung | 2026-11-24 |

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

### G) Erweiterung Excel-Export (.xlsx) *(Refinement 2026-11-24)*

**Überblick:** Der Excel-Export ist eine dritte Ausgabe derselben Tabelle wie der CSV-Export — gleiche Spalten, gleiche Reihenfolge, gleiche Werte; nur das Dateiformat unterscheidet sich. Er läuft vollständig im Browser, schreibt nichts in den Datenbestand und braucht keinen Server (keine XSD-Prüfung).

**Komponentenstruktur**
```
DMRL-Ansicht (PROJ-7) — Aktionsleiste
+-- „Exportieren" (shadcn DropdownMenu)
    +-- „Als CSV exportieren"   → sofortiger Download (unverändert)
    +-- „Als XML exportieren"   → Erzeugen + XSD-Prüfung → Download (unverändert)
    +-- „Als Excel exportieren" → sofortiger Download (neu)
        +-- Fehler beim Erzeugen (unerwartet) → Fehlermeldung (Toast), kein Download
```

**Bausteine**
| Baustein | Herkunft | Aufgabe |
|---|---|---|
| Eintrags-Tabelle (Kopfzeile + Zeilen) | **aus dem CSV-Schreiber herausgelöst** | eine Quelle für Spalten (alle Eintragsfelder, derzeit 28), Sortierung nach DMC und Werte — genutzt von CSV und Excel |
| Excel-Schreiber | **neu**, allgemein (Kopfzeile + Textzeilen → .xlsx-Datei) | ein Blatt mit Namen, alle Zellen als Text, Kopfzeile fett und fixiert, Autofilter über die Kopfzeile, Spaltenbreiten aus dem längsten Inhalt (mit Mindest- und Höchstbreite) |
| Excel-Export | **neu** im Export-Ablauf (PROJ-18) | Eintrags-Tabelle → Excel-Schreiber; Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-Export-{JJJJ-MM-TT}.xlsx` |
| Menüeintrag „Als Excel exportieren" | Erweiterung Aufklappmenü | wie CSV: gleiche Verfügbarkeit (nur Berechtigung) |
| Download-Helfer | PROJ-9 (vorhanden: Binärdatei-Download) | speichert die Datei mit Excel-Dateityp |

**Datenmodell:** keine Änderung, keine Speicherung (wie CSV-Export).

**Wie eine .xlsx-Datei aufgebaut ist (für PM):** Eine .xlsx-Datei ist ein ZIP-Archiv mit wenigen festen XML-Dateien (Blatt, Formatvorlagen, Verzeichnis). Die Anwendung schreibt bereits XML (SEND); neu ist nur das Verpacken als ZIP — dafür wird ein kleines, bewährtes Paket verwendet.

**Technische Entscheidungen**
| Entscheidung | Warum |
|---|---|
| Eigener kleiner Excel-Schreiber + Paket `fflate` (nur zum ZIP-Packen) statt einer großen Excel-Bibliothek | Die Spec braucht nur ein Blatt mit Text, fixierter Kopfzeile, Autofilter und Spaltenbreiten. `exceljs` kann das, ist aber seit 2023 unverändert und zieht schwere Server-Pakete nach sich; `write-excel-file` hat **keinen Autofilter**; `xlsx` (SheetJS) ist auf npm veraltet und hat bekannte Sicherheitslücken. `fflate` ist winzig, MIT-lizenziert, ohne Abhängigkeiten und liegt bereits (indirekt) im Projekt. |
| Alle Zellen als **Textzellen** | Excel wandelt nichts um (führende Nullen, Datums-/Zahlenähnliches bleiben). |
| **Kein Apostroph-Schutz** in Excel, stattdessen Textzellen | In einer .xlsx-Datei wird eine Textzelle nie als Formel ausgewertet — der Schutz ist durch das Format gegeben. Excel zeigt deshalb den **Originalwert** (z. B. `=SUMME(1)` als Text), nicht `'=SUMME(1)` wie in der CSV. „Gleiche Werte wie der CSV-Export" bedeutet: gleiche Werte aus der Anwendung, ohne die CSV-spezifische Entschärfung. |
| Zeichen, die in XML nicht erlaubt sind (Steuerzeichen), werden beim Schreiben entfernt; `&`, `<`, `>`, `"` korrekt maskiert | Sonst meldet Excel „Datei beschädigt / reparieren". |
| Eintrags-Tabelle aus dem CSV-Schreiber herauslösen | CSV und Excel können nie auseinanderlaufen (Spalten, Reihenfolge, Sortierung). |
| Excel-Schreiber allgemein (Kopfzeile + Zeilen) | Später ohne Mehraufwand wiederverwendbar (z. B. Freigabestand, Prüfbericht) — derzeit Out of Scope. |
| Erzeugung synchron im Browser, ohne Ladeanzeige | Auch große DMRLs (tausende Einträge) sind in Sekundenbruchteilen erzeugt; Fortschrittsanzeige nur, falls sich das in Tests als spürbar erweist. |
| Offline-fähig | Reines JavaScript, keine nativen Teile — läuft im lokalen Start (PROJ-19) und im Windows-Offline-Paket. |

**Abhängigkeiten (Pakete)**
- `fflate` — ZIP-Archiv erzeugen (bisher nur indirekt über `@vitest/ui` vorhanden; wird direkte Abhängigkeit)

**Testbarkeit**
- Unit: Excel-Schreiber — Datei entpacken und prüfen: ein Blatt „Einträge", Textzellen, fixierte Kopfzeile, Autofilter über alle Spalten, Spaltenbreiten begrenzt, Sonderzeichen/Umlaute, Werte mit `=`/`+`/`-`/`@` als Text ohne Formel, Steuerzeichen entfernt, nur Kopfzeile bei leerer DMRL.
- Unit: Excel-Export — Dateiname, gleiche Kopfzeile/Werte/Reihenfolge wie CSV-Export, Datenbestand unverändert.
- E2E: Download „Als Excel exportieren" (Dateiname, Datei lesbar) bei fremder Sperre und Status *gesendet*; Check-in-Dialog lehnt .xlsx ab.
- Manuell (QA/Product Owner): Datei in MS Excel öffnen — keine Reparaturmeldung, Filter und fixierte Kopfzeile sichtbar.

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

### Excel-Export (.xlsx) *(Refinement 2026-11-24)*
_Stand 2026-11-24 — `/frontend PROJ-18`_

**Umgesetzt**
- `src/lib/files/xlsx-writer.ts` — **neu**, allgemeiner Excel-Schreiber (Kopfzeile + Textzeilen → .xlsx, ZIP über `fflate`):
  - ein Blatt, alle Zellen Inline-Text mit Zahlenformat „@" (Text, auch beim Bearbeiten in Excel), keine Formel- oder Zahlenzellen
  - Kopfzeile fett und fixiert, Autofilter über den gesamten Bereich (inkl. verstecktem Namen `_xlnm._FilterDatabase`, wie Excel selbst ihn anlegt)
  - Spaltenbreite = längste Zeile + 2, mindestens 8, höchstens 60 Zeichen; voller Inhalt bleibt in der Zelle
  - in XML unzulässige Steuerzeichen und einzelne Surrogate werden entfernt; `& < > "` maskiert; Excel-Zeichencodes `_xHHHH_` im Text als `_x005F_xHHHH_` maskiert (sonst würde Excel z. B. `_x000D_` als Zeilenumbruch lesen)
  - Blattname geprüft (max. 31 Zeichen, ohne `[]:*?/\`)
- `src/lib/files/csv-writer.ts` — **Eintrags-Tabelle** `entriesTable` herausgelöst (Kopfzeile = alle Eintragsfelder, Sortierung nach DMC, Werte unverändert); CSV-Schreiber nutzt sie und entschärft danach wie bisher (BUG-QA2-1).
- `src/lib/workflows/export.ts` — `exportXlsx`: Blatt „Einträge", Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-Export-{JJJJ-MM-TT}.xlsx`; liest nur.
- `src/components/workflows/dmrl-export.tsx` — Format `xlsx`: sofortiger Download (Binärdatei-Download, Excel-Dateityp), Erfolgsmeldung „Als Excel exportiert (…)"; unerwarteter Fehler → Fehlermeldung, kein Download.
- `src/components/dmrl/dmrl-action-bar.tsx` — dritter Menüeintrag **„Als Excel exportieren"** (Symbol `Sheet`).
- `package.json` — `fflate` ^0.8.3 als direkte Abhängigkeit (bisher nur indirekt über `@vitest/ui`).

**Tests**
- Unit: `xlsx-writer.test.ts` (11: Paketaufbau, Textzellen, Formelzeichen ohne Apostroph, Fixierung/Fettdruck/Autofilter, leere Tabelle, Spaltenbreiten, Steuerzeichen, `_xHHHH_`, fehlende Zellen, Spaltenbuchstaben, ungültige Blattnamen); `export.test.ts` (+4: Dateiname, gleiche Kopfzeile/Werte/Reihenfolge wie CSV-Export, 28 Spalten, Formelzeichen/führende Nullen, leere DMRL, fremde Sperre, Datenbestand unverändert); `dmrl-export.test.tsx` (+1: Download ohne XSD-Prüfung); `csv-writer.test.ts` (+1: Eintrags-Tabelle). Insgesamt 663 Unit-Tests grün.
- E2E: `tests/PROJ-18-export.spec.ts` (+1): Excel-Download bei Status *gesendet* (Blatt „Einträge", Fixierung, Autofilter, keine Formeln, Datenbestand unverändert); Check-in der exportierten .xlsx → „Bitte eine CSV-Datei auswählen."
- Gegenprobe mit LibreOffice (headless, .xlsx → CSV): Datei öffnet, 1 Kopfzeile + 32 Einträge, führende Nullen erhalten, `=1+1 & <x> _x000D_ Ümlaut` unverändert als Text.
- `npm run build` erfolgreich.

**Abweichung / Hinweis**
- In Excel steht der **Originalwert** ohne Apostroph (Textzelle statt CSV-Entschärfung) — wie im Tech Design G festgelegt.
- **Nicht automatisiert prüfbar:** Öffnen in MS Excel ohne Reparaturmeldung (kein Excel unter Linux) → manuelle Prüfung in `/qa` bzw. durch den Product Owner.

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
