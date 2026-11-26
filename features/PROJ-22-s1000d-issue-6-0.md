# PROJ-22: S1000D Issue 6.0 Unterstützung

## Status: In Progress
**Created:** 2026-11-26
**Last Updated:** 2026-11-26

## Dependencies
- Requires: PROJ-5 (Systemverwaltung) — Issue 6.0 wird je System auswählbar
- Requires: PROJ-11 (XSD-Validierung) — Prüfung gegen `schemas/s1000d/issue-6.0/dml.xsd`
- Requires: PROJ-12 (SEND-Export) — SEND-XML in der Struktur von Issue 6.0
- Requires: PROJ-13 (REPLY-Import) — REPLY-XML der Issue 6.0 lesen
- Berührt: PROJ-1 (Demo-Daten: neues Demo-System), PROJ-18 (Export XML), PROJ-14 (Freigabestand XML), PROJ-20 (XML-Prüfung), PROJ-19 / Windows-Offline-Paket (Rauchtest)

## Überblick
Das System kennt bisher die S1000D-Issues 2.3, 4.2 und 5.0. Mit PROJ-22 kommt **Issue 6.0** als vierte Version hinzu — durchgängig in allen Stellen, an denen die Issue heute eine Rolle spielt: Systemverwaltung, XSD-Prüfung, SEND, REPLY, Export, Freigabestand und XML-Prüfung. Die Schemas liegen unter `schemas/s1000d/issue-6.0/` (bereitgestellt vom Product Owner am 2026-11-26), eine Beispiel-DMRL unter `docs/beispiele/issue-6.0/DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML`.

Für die Felder der Anwendung ist die DMRL-Struktur von 6.0 identisch mit 4.2/5.0 (`dmlEntry`, `dmRef`, `responsiblePartnerCompany`, `answer`, `remarks`). Neu im 6.0-Schema sind nur optionale Elemente (`extEntityIdent`, `referenceUsage`), die die Anwendung nicht verwendet. Unterschiede beim Erzeugen: Schema-Angabe `http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd` und der BREX-Verweis.

Zusätzlich erhält die Demo ein viertes System **„Fahrrad BIKE60"** (Issue 6.0), dessen DMRL aus einem regelkonformen Ausschnitt der Beispiel-DMRL besteht.

## User Stories
- Als **Administrator** möchte ich beim Anlegen oder Bearbeiten eines Systems S1000D-Issue 6.0 auswählen, damit DMRLs für Projekte nach der aktuellen S1000D-Version geführt werden können.
- Als **Bearbeiter** möchte ich für eine DMRL eines 6.0-Systems einen SEND erzeugen, der gegen das 6.0-Schema validiert, damit der externe Empfänger eine normgerechte Datei erhält.
- Als **Bearbeiter** möchte ich die REPLY-Datei eines Empfängers in Issue 6.0 importieren und prüfen lassen, damit die Einträge wie bei den anderen Issues freigegeben oder zur Überarbeitung markiert werden.
- Als **Bearbeiter** möchte ich eine 6.0-DMRL jederzeit als XML exportieren und den Freigabestand als 6.0-XML herunterladen, damit ich dieselben Möglichkeiten habe wie bei 2.3/4.2/5.0.
- Als **Bearbeiter** möchte ich eine beliebige DMRL-XML in der XML-Prüfung gegen Issue 6.0 prüfen und als CSV herunterladen, damit ich fremde 6.0-Dateien vorab bewerten kann.
- Als **Bearbeiter** möchte ich einen Hinweis erhalten, wenn die Schema-Angabe einer importierten Datei nicht zur Issue des Systems passt, damit ich versehentlich in der falschen Version erstellte Dateien erkenne, die das XSD trotzdem akzeptiert.
- Als **Product Owner** möchte ich ein Demo-System mit Issue 6.0 vorfinden, damit ich alle Workflows auch mit 6.0 vorführen kann.

## Out of Scope
- **Neue 6.0-Elemente** (`extEntityIdent`, `referenceUsage` u. a.): werden weder gelesen, angezeigt noch erzeugt; die CSV-/Excel-Spalten bleiben unverändert (28 bzw. mit Informationsfeldern wie in PROJ-9/10).
- **Konvertierung zwischen Issues** (z. B. 5.0-DMRL in 6.0 umwandeln): nicht vorgesehen; der Wechsel der Issue eines Systems richtet sich weiter nach den Sperrregeln von PROJ-5.
- **Übernahme aller 79 Einträge** der Beispiel-DMRL in die Demo: bewusst nur ein regelkonformer Ausschnitt (siehe Product Decisions).
- **Hochlade-Demodateien für BIKE60** (fertige REPLY-/Check-in-Dateien unter `public/demo-dateien/`): gibt es auch für 4.2/5.0 nicht; die Demo-Dateien bleiben bei PHUNGUN (PROJ-1, Abschnitt E).
- **Automatische Umstellung bereits gespeicherter Browser-Daten**: das neue Demo-System erscheint erst nach „Demo-Daten zurücksetzen" (wie bei früheren Demo-Änderungen, PROJ-1).
- **Abweisen** einer Datei wegen abweichender Schema-Angabe: nur Hinweis, kein Fehler.
- **Regeländerungen** am Regelwerk (PROJ-8): gelten für 6.0 unverändert.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### A. Systemverwaltung (PROJ-5)
- [ ] Angenommen der Administrator legt ein neues System an, wenn er die S1000D-Issue auswählt, dann stehen 2.3, 4.2, 5.0 und 6.0 zur Auswahl
- [ ] Angenommen ein System mit Issue 6.0 existiert, wenn die Systemliste angezeigt wird, dann wird die Issue als „6.0" angezeigt
- [ ] Angenommen ein System hat noch keine im Workflow verwendete DMRL, wenn der Administrator die Issue von 5.0 auf 6.0 (oder zurück) ändert, dann wird die Änderung gespeichert — die bestehenden Sperrregeln von PROJ-5 gelten unverändert

### B. XSD-Prüfung (PROJ-11)
- [ ] Angenommen die Beispiel-DMRL `docs/beispiele/issue-6.0/DML-S1000DBIKE-B6865-S-2024-00001_001-00.XML`, wenn sie gegen Issue 6.0 geprüft wird, dann lautet das Ergebnis „bestanden"
- [ ] Angenommen eine 6.0-Datei mit Schemafehler (z. B. fehlendes Pflichtelement), wenn sie gegen Issue 6.0 geprüft wird, dann lautet das Ergebnis „Schemafehler" mit Zeilenangaben wie bei den anderen Issues
- [ ] Angenommen die XSD-Prüfung wird mit einer unbekannten Issue (z. B. „7.0") aufgerufen, dann wird die Anfrage abgewiesen und die Meldung nennt die erlaubten Issues 2.3, 4.2, 5.0 und 6.0
- [ ] Angenommen der Ordner `schemas/s1000d/issue-6.0/` fehlt oder ist unvollständig, wenn eine 6.0-Prüfung angefordert wird, dann erscheint „XSD-Prüfung nicht durchgeführt" mit verständlichem Grund wie bei den anderen Issues

### C. SEND (PROJ-12), Export (PROJ-18), Freigabestand (PROJ-14)
- [ ] Angenommen eine DMRL eines 6.0-Systems, wenn der Bearbeiter einen SEND erzeugt, dann enthält die XML die Schema-Angabe `http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd`, die Struktur von 4.2/5.0 und den BREX-Verweis für Issue 6.0
- [ ] Angenommen ein SEND einer 6.0-DMRL wurde erzeugt, wenn er gegen das 6.0-Schema geprüft wird, dann ist er gültig (Voraussetzung für Download und Archivierung wie in PROJ-12)
- [ ] Angenommen eine 6.0-DMRL, wenn der Bearbeiter sie als XML exportiert (PROJ-18) oder den Freigabestand als XML herunterlädt (PROJ-14), dann ist die Datei 6.0-XSD-gültig und trägt die 6.0-Schema-Angabe
- [ ] Angenommen eine DMRL eines 2.3-, 4.2- oder 5.0-Systems, wenn ein SEND oder Export erzeugt wird, dann ist die Ausgabe unverändert gegenüber dem Stand vor PROJ-22

### D. REPLY (PROJ-13) und XML-Prüfung (PROJ-20)
- [ ] Angenommen ein gültiger 6.0-REPLY zu einem SEND einer 6.0-DMRL, wenn der Bearbeiter ihn importiert, dann werden die Antworten (freigegeben / zu überarbeiten, Begründung) wie bei 4.2/5.0 übernommen
- [ ] Angenommen der Bearbeiter öffnet die XML-Prüfung, wenn er die Issue auswählt, dann steht 6.0 zur Auswahl
- [ ] Angenommen die Beispiel-DMRL 6.0, wenn sie in der XML-Prüfung gegen Issue 6.0 geprüft wird, dann werden alle 79 Einträge gelesen, die XSD-Prüfung ist bestanden und die Regelverstöße der Datei (leere Sicherheitseinstufung, uneinheitliche Tech/Info Names) werden im Bericht aufgeführt

### E. Hinweis bei abweichender Schema-Angabe (alle Issues)
- [ ] Angenommen ein 6.0-System, wenn eine XSD-gültige Datei mit Schema-Angabe `…/S1000D_5-0/…` als REPLY importiert wird, dann erscheint im Prüfbericht der Hinweis, dass die Schema-Angabe der Datei (Issue 5.0) nicht zur Issue des Systems (6.0) passt — der Import wird dadurch nicht abgewiesen
- [ ] Angenommen die XML-Prüfung mit gewählter Issue 6.0, wenn die Datei die Schema-Angabe einer anderen Issue trägt, dann erscheint derselbe Hinweis im Bericht
- [ ] Angenommen eine Datei ohne Schema-Angabe oder mit einer Schema-Angabe, die keiner bekannten Issue zugeordnet werden kann, wenn sie importiert oder geprüft wird, dann erscheint kein solcher Hinweis
- [ ] Angenommen eine Datei, deren Schema-Angabe zur gewählten Issue passt, wenn sie importiert oder geprüft wird, dann erscheint kein solcher Hinweis
- [ ] Angenommen ein 2.3-, 4.2- oder 5.0-System, wenn eine Datei mit abweichender Schema-Angabe importiert oder geprüft wird, dann erscheint der Hinweis ebenso (gleiche Regel für alle Issues)

### F. Demo-System BIKE60 (PROJ-1)
- [ ] Angenommen der Ausgangszustand der Demo-Daten, wenn der Administrator die Systeme öffnet, dann gibt es zusätzlich das System „Fahrrad BIKE60" mit Modell-Ident-Code `S1000DBIKE`, Issue 6.0 und der Beschreibung „Fiktives Demo-Fahrrad (S1000D Issue 6.0)"
- [ ] Angenommen der Ausgangszustand, wenn der Administrator die Organisationen öffnet, dann gibt es zusätzlich die Organisation `B6865` „Aerospace, Security and Defence Industries Association of Europe"
- [ ] Angenommen der Ausgangszustand, wenn die DMRL von BIKE60 geöffnet wird, dann hat sie Originator B6865, DML-Typ c, Sicherheitseinstufung 01, Status „in Bearbeitung", Bearbeiterin Anna Bearbeitung, kein Archiv, keinen Verlauf und die 12 Einträge aus der Tabelle unten
- [ ] Angenommen der Ausgangszustand, wenn Anna die DMRL BIKE60 auscheckt und die Datei unverändert wieder eincheckt, dann meldet das Regelwerk keine Fehler
- [ ] Angenommen der Ausgangszustand, wenn Anna für BIKE60 einen SEND erzeugt, dann ist er 6.0-XSD-gültig und erhält den Versionsindex `00001-<aktuelles Jahr>`
- [ ] Angenommen im Browser sind Daten aus einem Stand vor PROJ-22 gespeichert, wenn die Anwendung geladen wird, dann bleiben sie unverändert erhalten (kein BIKE60) — erst „Demo-Daten zurücksetzen" legt BIKE60 an
- [ ] Angenommen der Ausgangszustand, wenn das Dashboard (PROJ-16) angezeigt wird, dann erscheint BIKE60 als vierte DMRL mit Status „in Bearbeitung"

#### Einträge der Demo-DMRL BIKE60
Ausschnitt aus der Beispiel-DMRL (Modell-Ident-Code `S1000DBIKE`, SDC `AAA`, Sprache `en`/`US`, RPC `B6865`). Je SNS genau ein Tech Name, je Infocode genau ein Info Name (PROJ-8 Gruppen E/I).

| # | DMC (ohne Modell-Ident-Code und SDC) | Tech Name | Info Name |
|---|---|---|---|
| 1 | D00-00-00-00AA-001A-A | Bicycle | Title page |
| 2 | D00-00-00-00AA-002A-A | Bicycle | List of effective data modules |
| 3 | D00-00-00-00AA-042A-A | Bicycle | Description of function |
| 4 | D00-00-00-00AA-130A-A | Bicycle | Riding a bicycle |
| 5 | D00-00-01-00AA-520A-A | Fork | Remove procedures |
| 6 | D00-00-01-00AA-720A-A | Fork | Install procedures |
| 7 | DA0-10-20-00AA-215A-A | Tire | Fill with air |
| 8 | DA0-10-20-00AA-362B-A | Tire | Check pressure |
| 9 | DA1-00-00-00AA-041A-A | Brake system | Description of how it is made |
| 10 | DA1-20-00-00AA-520A-A | Front brake | Remove procedures |
| 11 | DA1-20-00-00AA-720A-A | Front brake | Install procedures |
| 12 | DA4-10-00-00AA-241A-A | Chain | Oil |

Fehlende Pflichtwerte (Sicherheitseinstufung je Eintrag `01`, Eintragstyp, Ausgabenummer, Ausgabetyp, Ausgabedatum) werden wie bei den Demo-Systemen 4.2/5.0 gesetzt, sodass der Bestand regelkonform ist.

### G. Betrieb und Dokumentation
- [ ] Angenommen das Windows-Offline-Paket wird gebaut, wenn der Rauchtest läuft, dann prüft er die XSD-Prüfung auch mit der 6.0-Beispiel-DMRL
- [ ] Angenommen `docs/dmrl-mapping.md`, wenn ein Entwickler das Mapping nachschlägt, dann ist Issue 6.0 dort beschrieben (gemeinsames Mapping mit 4.2/5.0 plus Abweichungen)

## Edge Cases
- **5.0-Datei bei einem 6.0-System (und umgekehrt):** Die Schemas 5.0 und 6.0 akzeptieren die Dateien der jeweils anderen Version (am 2026-11-26 mit den Beispieldateien nachgewiesen). Die XSD-Prüfung erkennt die Verwechslung daher nicht → Hinweis über die Schema-Angabe (Abschnitt E), kein Abweisen.
- **Datei ohne `xsi:noNamespaceSchemaLocation`:** kein Hinweis; nur die XSD-Prüfung zählt.
- **Schema-Angabe mit abweichender Schreibweise** (z. B. `https`, `S1000D_6-0`, lokaler Pfad): Zuordnung zur Issue anhand der Versionskennung im Pfad; nicht zuordenbar → kein Hinweis.
- **Beispiel-DMRL als Statusliste (`dmlType="s"`, ohne Sicherheitseinstufung je Eintrag):** Beim Import als REPLY in BIKE60 passt der DML-Code nicht zum SEND (Typ c, anderer Originator) → Verhalten wie bisher bei fremden DML-Codes in PROJ-13; die Datei ist kein REPLY-Testfall.
- **Issue-Wechsel eines Systems 5.0 → 6.0 nach bereits erfolgtem SEND:** unterliegt den Sperrregeln von PROJ-5 (Issue nicht mehr änderbar, sobald die DMRL im Workflow verwendet wurde).
- **Archivierte 5.0-Stände:** bleiben byte-genau unverändert und abrufbar; PROJ-22 ändert nichts an bestehenden Archiven.
- **Gespeicherte Daten mit Issue „6.0" in einer älteren App-Version:** nicht relevant (Prototyp, eine Installation); keine Abwärtskompatibilität nötig.

## Technical Requirements (optional)
- Gleiche Antwortzeiten und Dateigrößengrenzen wie bei den übrigen Issues (PROJ-11: höchstens 5 MB).
- Keine neue Formatversion der Datenhaltung erforderlich, sofern die Issue-Liste beim Laden auch 6.0 akzeptiert (Entscheidung in `/architecture`).
- Bestehende Tests für 2.3/4.2/5.0 bleiben unverändert grün.

## Open Questions
- [x] BREX-Verweis für Issue 6.0 → `S1000D-H-04-10-0301-00A-022A-D`, Fortschreibung von F (4.2) und G (5.0); vom Product Owner bestätigt (2026-11-26)
- [x] Prüft das Startskript (PROJ-19) die Schema-Ordner einzeln? → Nein, es prüft nur den Ordner `schemas` als Ganzes; keine Änderung nötig (/architecture, 2026-11-26)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Priorität P0, eigenes Feature PROJ-22 | Erfolgskriterien sollen alle vier Issues abdecken; Querschnittsänderung über mehrere Features, daher ein eigener Spec statt verteilter Refinements | 2026-11-26 |
| Neues Demo-System „Fahrrad BIKE60" statt Mehrzweckboot | Vorgabe Product Owner; passt zur mitgelieferten 6.0-Beispiel-DMRL | 2026-11-26 |
| Modell-Ident-Code `S1000DBIKE`, Name „Fahrrad BIKE60" | PROJ-8 Gruppe D verlangt Übereinstimmung von Eintrags- und System-Code; so bleiben die Einträge der Beispieldatei unverändert | 2026-11-26 |
| Nur regelkonformer Ausschnitt (12 von 79 Einträgen) | Die Beispiel-DMRL verletzt PROJ-8 (79× leeres Pflichtfeld, 48× Gruppe E, 23× Gruppe I); ein unveränderter Ausschnitt mit konsistenten Namen hält die Demo regelkonform ohne erfundene Namensänderungen | 2026-11-26 |
| Originator neue Organisation B6865, DML-Typ c | Bezug zur Beispieldatei (B6865) bleibt; Typ c wie bei den übrigen Demo-DMRLs und passend zum SEND/REPLY-Abstimmungsprozess | 2026-11-26 |
| Bearbeiterin Anna Bearbeitung | Vorschlag aus dem Interview, vom Product Owner nicht geändert; Anna betreut bereits PHUNGUN und (mit Ben) das Fahrzeug, Ben allein den Transporthubschrauber | 2026-11-26 |
| Abweichende Schema-Angabe nur als Hinweis | XSD-gültige Dateien sollen nicht abgewiesen werden; der Hinweis macht die von xmllint nicht erkennbare Verwechslung 5.0/6.0 sichtbar | 2026-11-26 |
| Schema-Angabe-Hinweis für alle Issues, nicht nur 6.0 | Einheitliches Verhalten; das Problem betrifft grundsätzlich jede Issue-Kombination mit ähnlichem Schema | 2026-11-26 |
| Originaldatei bleibt unter `docs/beispiele/issue-6.0/` als Prüf-Testfall | Wie bei 4.2/5.0: XSD-Test, Rauchtest des Offline-Pakets und Negativ-Testfall für das Regelwerk | 2026-11-26 |
| Neue Demo erst nach „Demo-Daten zurücksetzen" | Gleiches Vorgehen wie bei früheren Demo-Änderungen (PROJ-1, Refinement 2026-11-16); kein Eingriff in gespeicherte Daten | 2026-11-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| 6.0 als Eintrag in der zentralen Issue-Liste | Auswahlfelder, Prüf-Schnittstelle, Dashboard-Filter und Ladeprüfung leiten sich schon heute davon ab; eine Stelle statt vieler | 2026-11-26 |
| 6.0 nutzt Leser und Schreiber von 4.2/5.0 | Für die Felder der Anwendung identische Struktur, mit den Beispieldateien belegt; kein doppelter Code | 2026-11-26 |
| Schema-Angabe und BREX je Issue als Tabelleneintrag | Einziger Unterschied beim Erzeugen; folgt dem bestehenden Muster für 4.2/5.0 | 2026-11-26 |
| Keine neue Formatversion der Datenhaltung | Die Werteliste wird nur erweitert; alte Stände bleiben gültig, also kein Datenverlust | 2026-11-26 |
| Erkennung der Schema-Angabe als gemeinsamer Baustein für REPLY-Import und XML-Prüfung | Gleiche Regel an beiden Stellen und für alle Issues; einzeln testbar | 2026-11-26 |
| Zuordnung über die Versionskennung im Pfad statt über die exakte URL | Toleriert `http`/`https`, lokale Pfade und die Schreibweisen `S1000D_6` und `S1000D_6-0` | 2026-11-26 |
| Hinweis in Gruppe „XSD" | Inhaltlich eine Ergänzung der Schemaprüfung; keine neue Regelgruppe im Regelwerk PROJ-8 | 2026-11-26 |
| BREX-Verweis 6.0: `S1000D-H-04-10-0301-00A-022A-D` | Fortschreibung des Musters F (4.2) / G (5.0); vom Product Owner bestätigt | 2026-11-26 |
| Startskript unverändert | Es prüft den Ordner `schemas` als Ganzes; der neue Unterordner ist automatisch enthalten | 2026-11-26 |
| 6.0-Schema: Import von `xml.xsd` auf die mitgelieferte lokale Kopie umgestellt | Das Original lädt `http://www.w3.org/2001/xml.xsd` aus dem Netz; mit `xmllint --nonet` ließ sich das Schema sonst nicht übersetzen (Ergebnis „Schema fehlt“). Gleiches Vorgehen wie bei 5.0 (PROJ-11, Commit c21c157) | 2026-11-26 |
| Zwei Meldungstexte für den Schema-Hinweis | REPLY-Import: „…das System verwendet Issue X…“; XML-Prüfung: „…gewählt ist Issue X — bitte Issue prüfen.“ Im Werkzeug gibt es kein System | 2026-11-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Grundidee
Issue 6.0 wird als **vierte Version in die zentrale Issue-Liste** aufgenommen. Diese Liste steuert schon heute alle Auswahlfelder (Systemformular, XML-Prüfung, Dashboard-Filter), die Prüf-Schnittstelle und die Gültigkeitsprüfung beim Laden der Daten. Für Lesen und Schreiben der XML nutzt 6.0 den **bestehenden gemeinsamen Weg von 4.2/5.0**, denn die Struktur ist für die Felder der Anwendung identisch. Neu sind nur drei Dinge: die Schema-Angabe und der BREX-Verweis beim Erzeugen, der Hinweis bei abweichender Schema-Angabe (für alle Issues) und das Demo-System BIKE60.

Kein Backend und kein neuer Speicher: Alles bleibt im Browser-Speicher (localStorage). Serverseitig nutzt nur die vorhandene XSD-Prüfung (xmllint) den zusätzlichen Schema-Ordner.

### A) Betroffene Oberflächen (keine neuen Komponenten)
```
Verwaltung → Systeme
+-- System-Dialog
    +-- Auswahl „S1000D-Issue": 2.3 · 4.2 · 5.0 · 6.0   ← automatisch aus der Issue-Liste

DMRL-Ansicht (System mit Issue 6.0)
+-- SEND-Dialog            → 6.0-XML, XSD-Prüfung gegen issue-6.0
+-- REPLY-Import-Dialog    → Prüfbericht ggf. mit neuem Hinweis „Schema-Angabe passt nicht"
+-- Export XML / Freigabestand XML → 6.0-XML

XML-Prüfung (Werkzeug)
+-- Auswahl „Issue": 2.3 · 4.2 · 5.0 · 6.0          ← automatisch
+-- Prüfbericht            → ggf. neuer Hinweis „Schema-Angabe passt nicht"

Dashboard
+-- Filter „Issue": um 6.0 ergänzt                   ← automatisch
+-- vierte DMRL „Fahrrad BIKE60" (nach Demo-Reset)
```

### B) Bausteine und was sich ändert
| Baustein | Änderung |
|---|---|
| Zentrale Issue-Liste (Datenmodell) | „6.0" ergänzt; alle Auswahllisten, die Prüf-Schnittstelle und die Ladeprüfung übernehmen das automatisch |
| XML-Leser | 6.0 nutzt den Leser für 4.2/5.0 |
| XML-Schreiber (SEND, Export, Freigabestand) | 6.0 nutzt den Schreiber für 4.2/5.0; dazu je ein Tabelleneintrag für Schema-Angabe (`…/S1000D_6/xml_schema_flat/dml.xsd`) und BREX-Verweis |
| XSD-Prüfung (Server, xmllint) | findet das Schema über den Ordnernamen `issue-6.0`, also kein eigener Code; die Fehlermeldung für unbekannte Issues nennt alle vier |
| **Neu:** Erkennung der Schema-Angabe | kleiner gemeinsamer Baustein: liest `xsi:noNamespaceSchemaLocation` (bei 2.3 auch die gleichwertige Angabe) und ordnet sie über die Versionskennung im Pfad (`S1000D_2-3`, `S1000D_4-2`, `S1000D_5-0`, `S1000D_6` bzw. `S1000D_6-0`) einer Issue zu; nicht zuordenbar ergibt „unbekannt" |
| REPLY-Prüfung und XML-Prüfung | rufen die Erkennung auf; weicht die erkannte Issue von der gewählten ab, kommt **ein** Hinweis (kein Fehler) in den Prüfbericht, Gruppe „XSD" |
| Demo-Daten | zusätzliche Organisation B6865, System „Fahrrad BIKE60", DMRL mit 12 festen Einträgen nach dem Muster der 4.2/5.0-Demos |
| Mapping-Dokument `docs/dmrl-mapping.md` | Abschnitt „Mapping Issue 4.2 / 5.0" wird zu „4.2 / 5.0 / 6.0" mit den Abweichungen (Schema-Angabe, BREX) und der Zuordnung der Schema-Angaben |
| Windows-Offline-Paket (Rauchtest) | XSD-Rauchtest läuft zusätzlich mit der 6.0-Beispiel-DMRL |
| Startskript (PROJ-19) | keine Änderung: Es prüft den Ordner `schemas` als Ganzes, nicht einzelne Issues |

### C) Datenmodell
- **System:** Feld „S1000D-Issue" hat jetzt vier erlaubte Werte (2.3, 4.2, 5.0, 6.0). Sonst ändert sich nichts.
- **Keine neue Formatversion:** Bereits gespeicherte Daten enthalten nur 2.3/4.2/5.0 und bleiben gültig. Gespeicherte Stände werden nicht umgestellt, BIKE60 erscheint erst nach „Demo-Daten zurücksetzen".
- **Demo-Bestand (Ausgangszustand) zusätzlich:**
  - Organisation: B6865 „Aerospace, Security and Defence Industries Association of Europe"
  - System: „Fahrrad BIKE60", Code S1000DBIKE, Issue 6.0, Beschreibung „Fiktives Demo-Fahrrad (S1000D Issue 6.0)"
  - DMRL: Originator B6865, Typ c, Sicherheitseinstufung 01, Bearbeiterin Anna, Status „in Bearbeitung", erster Versionsindex `00001-<aktuelles Jahr>`, kein Archiv, kein Verlauf
  - 12 Einträge laut Tabelle in Abschnitt F, mit SDC AAA, Sprache en/US, RPC B6865 samt Name, Sicherheitseinstufung 01; Eintragstyp, Ausgabenummer, Ausgabetyp und Ausgabedatum wie bei den 4.2/5.0-Demos
- **Prüfbericht:** Der neue Hinweis nutzt die bestehende Form eines Befunds (Schwere „Hinweis", Gruppe „XSD", Text). Am Speicherformat ändert sich nichts.

### D) Ablauf der Hinweis-Prüfung
```
Datei hochgeladen (REPLY-Import oder XML-Prüfung)
  1. XSD-Prüfung gegen die gewählte Issue        (wie bisher)
  2. Schema-Angabe aus der Datei lesen → Issue erkennen
       - erkannt und ≠ gewählte Issue → Hinweis:
         „Die Schema-Angabe der Datei verweist auf S1000D Issue 5.0, das System verwendet Issue 6.0."
       - erkannt und = gewählte Issue → nichts
       - fehlt / unbekannt            → nichts
  3. Regelwerk                                     (wie bisher)
```
Der Hinweis verhindert weder Import noch CSV-Download. Bei nicht wohlgeformten Dateien entfällt er, weil die Datei nicht gelesen werden kann.

### E) Qualitätssicherung (automatische Tests)
- Die 6.0-Beispiel-DMRL ist gegen das 6.0-Schema gültig (xmllint).
- SEND, Export und Freigabestand einer 6.0-DMRL sind gegen das 6.0-Schema gültig, mit 6.0-Schema-Angabe und 6.0-BREX.
- Ausgaben für 2.3/4.2/5.0 bleiben unverändert; die bestehenden Tests bleiben grün.
- Erkennung der Schema-Angabe: alle vier Kennungen, Varianten (`S1000D_6-0`, `https`), keine bzw. fremde Angabe.
- Hinweis: 5.0-Beispiel in einem 6.0-Kontext ergibt einen Hinweis, das 6.0-Beispiel in einem 6.0-Kontext keinen.
- Demo-Bestand: BIKE60 ist vorhanden, und ein Check-in des unveränderten Check-outs ergibt keine Regelfehler.
- XML-Prüfung des 6.0-Beispiels: 79 Einträge, XSD bestanden, Regelverstöße erkannt.

### F) Abhängigkeiten (Pakete)
Keine neuen Pakete.

## Implementation Notes (Frontend, 2026-11-26)
Kein Backend nötig: Die XSD-Serverfunktion nutzt den neuen Schema-Ordner ohne Codeänderung.

**Geändert**
- `src/lib/data/schema.ts`: `S1000D_ISSUES` um „6.0“ ergänzt. Systemformular, Werkzeug, Dashboard-Filter, XSD-Schnittstelle und Ladeprüfung übernehmen das automatisch; die Formatversion bleibt 2.
- `src/lib/data/dml-writer.ts`: Schema-Angabe `http://www.s1000d.org/S1000D_6/xml_schema_flat/dml.xsd` und BREX `H` für 6.0. Leser und Schreiber von 4.x werden mitbenutzt.
- **Neu** `src/lib/rules/check/schema-location.ts`: liest die Schema-Angabe aus dem Wurzelelement (`noNamespaceSchemaLocation` mit beliebigem Präfix, sonst letzte URL von `schemaLocation`) und ordnet sie über die Versionskennung einer Issue zu. Erkannt werden auch `S1000D2.3` (NSG-Pfad der PHUNGUN-Dateien), `S1000D_6-0` und Kleinschreibung. Weicht die Issue ab, entsteht genau ein Hinweis in Gruppe XSD.
- `src/lib/rules/check/reply.ts` und `src/lib/workflows/xml-check.ts` rufen den Abgleich auf. Im Werkzeug erscheint der Hinweis auch, wenn die Datei mit dem gewählten Leser nicht lesbar ist, aber nicht bei nicht wohlgeformten Dateien.
- `src/lib/data/demo-data.ts`: Organisation B6865, System „Fahrrad BIKE60“ (S1000DBIKE, 6.0), DMRL `dmrl-bike60` mit 12 Einträgen laut Abschnitt F.
- `schemas/s1000d/issue-6.0/dml.xsd`: Import von `xml.xsd` lokal (siehe Technical Decisions).
- Meldung der XSD-Schnittstelle für unbekannte Issues nennt jetzt 2.3, 4.2, 5.0 und 6.0. Kommentare in xmllint, Leser und Typen sind angepasst.
- Dokumentation: `docs/dmrl-mapping.md` (Mapping 4.2/5.0/6.0, Schema-Angaben, BREX, Wertebereiche) und die Schema-Tabelle in PROJ-11.
- Windows-Offline-Paket: Der Rauchtest in `build-package.sh` und `SKILL.md` prüft zusätzlich die XSD-Prüfung mit 6.0. Ein neues Paket ist noch nicht gebaut.

**Nebenwirkung (gewollt, aber erwähnenswert)**
- B6865 erscheint als möglicher SEND-Empfänger bei allen anderen DMRLs, weil jede Organisation außer dem Originator wählbar ist. Bei BIKE60 sind C1234 und D0815 wählbar.
- B6865 ist nicht „im Workflow benutzt“. Löschen ist trotzdem gesperrt, solange die Organisation der DMRL BIKE60 als Originator zugeordnet ist.

**Tests**
- Neu: `schema-location.test.ts` (Lesen, Zuordnung, Hinweis, keine Hinweise für die PHUNGUN-Demodateien).
- Zyklus 6.0 SEND → REPLY für BIKE60 in `reply.test.ts`: Schema-Angabe und BREX H im SEND; REPLY ohne Befund; REPLY mit 5.0-Angabe ergibt genau einen Hinweis, der Import bleibt möglich.
- xmllint: 6.0-Beispiel gültig gegen 6.0; 5.0 und 6.0 akzeptieren sich gegenseitig.
- Werkzeug: 6.0-Beispiel mit 79 Einträgen und Fehlern nur in den Gruppen B (`security`), E und I; 5.0-Beispiel gegen 6.0 ergibt den Hinweis.
- Demo-Daten: BIKE60 hat Kopf und Berechtigung laut Spec, und das Regelwerk des Check-ins (`checkCommon`) meldet für alle drei fest hinterlegten Demo-DMRLs keine Fehler. Einen Excel-Check-out mit anschließendem Check-in gibt es für BIKE60 nicht als eigenen Test; das bleibt für /qa.
- Die Writer-XSD-Tests laufen über alle Issues und decken 6.0 damit automatisch ab (SEND, Export mit Antworten, mit/ohne Bezug).
- Bestehende Unit- und E2E-Tests mit fest erwarteten Demo-Zählungen (3 → 4 Bestände, Organisationen, Systeme, Berechtigungen, Kacheln 20 → 32 offene Änderungen) sind angepasst.
- Neu: E2E `tests/PROJ-22-issue-6-0.spec.ts` (Issue-Auswahl, SEND BIKE60 mit echter XSD-Prüfung, Werkzeug mit 6.0- und 5.0-Beispiel).
- Ergebnis 2026-11-26: Vitest 745 bestanden (1 übersprungen); Playwright nach den Anpassungen alle bestanden. Lint: 0 Fehler.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
