# PROJ-1: Datenhaltung (JSON/localStorage) + Demo-Daten

## Status: Architected
**Created:** 2026-11-11
**Last Updated:** 2026-11-12

## Dependencies
- None (Basis für alle weiteren Features)

## Referenzen
- `docs/dmrl-mapping.md` — Feldmapping CSV ↔ S1000D DML (Issue 2.3, 4.2, 5.0), Kopfdaten, Beispieldateien
- `features/PROJ-14-freigabestatus.md` — Statusmodell (DMRL und Einträge)
- Beispieldateien PHUNGUN (Issue 2.3): `01_DML-PHUNGUN-D0815-C-2026-00001_001-00.XML`, `02_DML-PHUNGUN-C1234-C-2026-00001-001-00.XML`, `03_DML-PHUNGUN-D0815-C-2026-00002_001-00.XML`

## Beschreibung
Der Prototyp speichert alle Daten (Benutzer, Organisationen, Systeme, DMRLs, DMRL-Einträge, Archivstände, Freigabestände, Workflow-Verlauf) dauerhaft im Browser (localStorage, JSON). Beim ersten Start wird ein vordefinierter Demo-Datenbestand geladen, der alle drei S1000D-Versionen abdeckt und eine bereits laufende SEND/REPLY-Kette enthält. Der Administrator kann den Demo-Ausgangszustand jederzeit wiederherstellen.

## Datenobjekte (fachlich)

### Organisation
- CAGE-Code (z. B. `D0815`, `C1234`) — entspricht `sendid` im DML-Code
- Name
- (keine Art — Originator wird je DMRL festgelegt (PROJ-6), Partner je SEND (PROJ-12))

### Benutzer (simuliert)
- Name
- Rolle: Administrator / Bearbeiter
- Status: aktiv / inaktiv (PROJ-3)
- Systemkonto ja/nein — genau ein Systemkonto „Administrator" existiert immer (nicht löschbar, Rolle fest; siehe PROJ-2/PROJ-3)

### System
- Bezeichnung
- Beschreibung (optional)
- (keine Systemart; genau eine DMRL je System — PROJ-5)
- S1000D-Issue: 2.3 / 4.2 / 5.0
- Model Ident Code (`modelic`)

### DMRL
- (keine eigene Bezeichnung — Anzeige über Systembezeichnung, PROJ-6)
- System (→ S1000D-Issue)
- Originator (Sender-Organisation)
- DML-Typ (`c`/`p`/`s`, Vorgabe `c`) und Sicherheitseinstufung (`01`–`20`)
- Berechtigte Bearbeiter (PROJ-17)
- Statusdaten laut `docs/dmrl-mapping.md`: `dmlc` (modelic, sendid, dmltype, diyear, seqnum), `issno` (issno, inwork, type), `issdate`, `security`, `dmlref`, `remarks`
- Aktueller Versionsindex `NNNNN-JJJJ` (= `seqnum-diyear` des letzten SEND)
- DMRL-Status: *in Bearbeitung* / *gesendet* / *freigegeben*
- Sperre: ausgecheckt ja/nein, von wem, seit wann, **Stand der Einträge beim Check-out** (Vergleichsbasis für Check-in und erneuten Download, PROJ-9/10)
- Bemerkung des Partners aus dem letzten REPLY (`dml/remarks`, PROJ-13)
- Freigabe-Nachweis der letzten Freigabe: Zeitpunkt, REPLY (Partner, Versionsindex), übernehmender Benutzer (PROJ-14)
- „Im Workflow verwendet" (PROJ-4/5/6) wird **nicht gespeichert**, sondern aus Verlauf und Archiv abgeleitet

### DMRL-Eintrag
- Alle CSV-Felder laut `docs/dmrl-mapping.md` (für alle S1000D-Versionen identisch): dmentryType, modelic, sdc, chapnum, section, subsect, subject, discode, discodev, incode, incodev, itemloc, techname, infoname, language, country, security, rpc, issno, type, day, month, year, answer, answer_comment
- Zusätzlich: `rpcname` (Firmenname zu `rpc`) und `remarks` (Bemerkung zum Eintrag, getrennt von `answer_comment`)
- Eintragsstatus (Statusmodell PROJ-14): *in Bearbeitung* / *gesendet* / *freigegeben* / *zu überarbeiten*

### Archivstand
- Richtung: SEND / REPLY
- DML-Code (`dmlc`) und Versionsindex
- Verweis (`dmlref`) auf die vorherige DMRL der Austauschkette
- Dateiname und unveränderter Original-Dateiinhalt (XML)
- Zeitpunkt und ausführender Benutzer
- Partner-Organisation (bei SEND gewählt, PROJ-12; bei REPLY Absender)
- Bei REPLY: zugehöriger SEND, Anzahl freigegeben / zu überarbeiten (PROJ-13)
- Bei SEND: Kennzeichen „zurückgezogen" mit Zeitpunkt, Administrator und Begründung (PROJ-12)

### Freigabestand (PROJ-14)
- Zugehörige DMRL, Zeitpunkt, REPLY (Partner, Versionsindex), übernehmender Benutzer
- Unveränderliche Momentaufnahme aller Einträge (alle Felder) zum Zeitpunkt der Freigabe
- Wird nie gelöscht

### Workflow-Verlauf (PROJ-15)
- Zugehörige DMRL, Zeitpunkt, Benutzer, Aktion, Details
- Aktionen: Check-out, Check-out zurückgenommen, Sperre aufgehoben, Check-in, Check-in abgelehnt, SEND, SEND fehlgeschlagen, SEND zurückgezogen, REPLY übernommen, REPLY abgelehnt, Kopfdaten geändert
- Wird nie gelöscht

### Anmeldung (PROJ-2)
- Angemeldeter Benutzer wird gespeichert, getrennt vom Datenbestand: bleibt nach Neuladen und beim Zurücksetzen der Demo-Daten erhalten (sofern der Benutzer im Demo-Bestand existiert)

## Demo-Datenbestand

| Objekt | Inhalt |
|--------|--------|
| Organisationen | `D0815` „Musterbehörde Technische Dokumentation" (Originator aller Demo-DMRLs); `C1234` „Partner Systemtechnik GmbH" (Partner der Kette PHUNGUN) |
| Benutzer | Systemkonto „Administrator"; Bearbeiter „Anna Bearbeitung" und „Ben Bearbeiter" (alle aktiv, keine Organisation) |
| Berechtigungen (PROJ-17) | Anna Bearbeitung → PHUNGUN, Fahrzeug; Ben Bearbeiter → Fahrzeug, Fluggerät |
| System 1 | „PHUNGUN" — MI `PHUNGUN`, Issue 2.3 |
| System 2 | „Geschütztes Transportfahrzeug" — MI `GTFDEMO`, Issue 4.2 |
| System 3 | „Transporthubschrauber" — MI `THSDEMO`, Issue 5.0 |
| DMRL PHUNGUN | Originator D0815, DML-Typ `c`, Sicherheitseinstufung `01`. Austauschkette aus den 3 Beispieldateien im Archiv (SEND 00001-2026 → REPLY C1234 00001-2026 → SEND 00002-2026, Partner C1234); aktueller Stand = SEND 00002-2026: 32 Einträge (11 `d`, 21 `n`) im Status *gesendet*, ergänzt um `issno` `001`, DM-Ausgabetyp `new`, Ausgabedatum = Datum SEND 00002; DMRL-Status *gesendet*; Verlauf: SEND, REPLY übernommen, SEND (Benutzer Anna Bearbeitung, Zeitpunkte aus den Dateien); keine Freigabestände |
| DMRL Fahrzeug | Originator D0815, `c`, `01`; 10 Einträge mit Eintragstyp `n`, Status *in Bearbeitung*, MI `GTFDEMO`, regelkonform nach PROJ-8 (Pflichtfelder, SNS→Tech Name, Infocode→Info Name, `language` `de`, `country` `DE`); kein Archiv, kein Verlauf |
| DMRL Fluggerät | wie Fahrzeug, MI `THSDEMO` |

### Demo-Dateien zum Hochladen (nicht Teil des Datenbestands)
Ablage im Projektordner `demo-dateien/`:
| Datei | Zweck |
|---|---|
| `DML-PHUNGUN-C1234-C-2026-00002_001-00.XML` | **Demo-REPLY** auf SEND 00002-2026 (PROJ-13): alle 11 `d` und 19 `n` mit `y`; 2 `n` mit `n` („Tech Name entspricht nicht der SNS — bitte prüfen", „Infocode nicht im beauftragten Leistungsumfang"); `dml/remarks` „Bitte abgelehnte Einträge überarbeiten."; Ergebnis: 30 freigegeben, 2 zu überarbeiten, DMRL *in Bearbeitung* |
| Testdatei „Pflichtelement fehlt" | XSD-Fehler (PROJ-11) |
| Testdatei „Falsches Issue" | XSD-Fehler (PROJ-11) |
| Testdatei „Kein gültiges XML" | Wohlgeformtheitsfehler (PROJ-11) |
| Testdatei „Falscher Absender" | XSD-gültig, Regelwerk-Fehler (PROJ-8/11) |

Firmennamen aus den Originaldateien (`rpcname`) werden in den Demo-Daten durch neutrale Namen ersetzt.

## User Stories
- Als **Product Owner** möchte ich, dass der Prototyp beim ersten Start sofort mit realistischen Demo-Daten befüllt ist, damit ich ohne Vorbereitung alle Workflows vorführen kann.
- Als **Product Owner** möchte ich Systeme in allen drei S1000D-Versionen (2.3, 4.2, 5.0) vorfinden, damit ich die Versionsunterschiede demonstrieren kann.
- Als **Bearbeiter** möchte ich, dass meine Änderungen nach einem Neuladen der Seite erhalten bleiben, damit ich über mehrere Sitzungen hinweg arbeiten kann.
- Als **Administrator** möchte ich die Demo-Daten auf den Ausgangszustand zurücksetzen, damit eine Demo beliebig oft wiederholt werden kann.
- Als **Bearbeiter** möchte ich, dass die bisherige SEND/REPLY-Kette der Demo-DMRL im Archiv vorhanden ist, damit ich den Austauschverlauf nachvollziehen kann.
- Als **Benutzer** möchte ich bei beschädigten Daten einen verständlichen Hinweis statt eines Absturzes bekommen, damit ich die Anwendung wieder nutzbar machen kann.
- Als **Product Owner** möchte ich vorbereitete Demo-Dateien (passender REPLY, fehlerhafte Testdateien) vorfinden, damit ich REPLY-Import und Prüfungen ohne Vorbereitung vorführen kann.
- Als **Bearbeiter** möchte ich, dass Verlauf und Freigabestände dauerhaft gespeichert sind, damit die Abstimmung jederzeit nachvollziehbar bleibt.

## Out of Scope
- Echte Datenbank / Backend / Synchronisation zwischen Browsern oder Geräten (PRD Non-Goal)
- Echte Anmeldung — Benutzerauswahl und Rollenwechsel → PROJ-2
- Pflegemasken für Benutzer, Organisationen, Systeme, DMRLs, Berechtigungen → PROJ-3 bis PROJ-6, PROJ-17
- Anzeige der DMRL und ihrer Einträge → PROJ-7
- Prüfregeln, Check-out/Check-in, SEND/REPLY-Logik, Freigabelogik → PROJ-8 bis PROJ-14
- Archiv-Ansicht und Download → PROJ-15
- XML-Erzeugung/-Import je Issue → PROJ-12 / PROJ-13 / PROJ-18
- Anzeige von Verlauf und Freigabeständen → PROJ-15 / PROJ-14
- Export/Import des gesamten Datenbestands (Backup)
- Mehrere Demo-Szenarien zur Auswahl

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Erststart & Demo-Daten
- [ ] Angenommen im Browser sind keine Anwendungsdaten gespeichert, wenn die Anwendung erstmals geöffnet wird, dann wird der Demo-Datenbestand automatisch geladen und gespeichert
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Daten betrachtet werden, dann existieren genau 3 Systeme mit den S1000D-Issues 2.3, 4.2 und 5.0
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Daten betrachtet werden, dann existieren die Organisationen D0815 und C1234, das Systemkonto „Administrator", die Bearbeiter „Anna Bearbeitung" und „Ben Bearbeiter" sowie deren Berechtigungen laut Tabelle
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL des Systems PHUNGUN betrachtet wird, dann enthält ihr Archiv 3 Stände in der Reihenfolge SEND 00001-2026, REPLY C1234 00001-2026, SEND 00002-2026 mit unverändertem Original-XML-Inhalt
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL des Systems PHUNGUN betrachtet wird, dann hat sie den Versionsindex 00002-2026, den Status *gesendet* und 32 Einträge (11 mit Eintragstyp `d`, 21 mit `n`) im Status *gesendet*, jeweils mit `issno` `001`, DM-Ausgabetyp `new` und Ausgabedatum
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn der Verlauf von PHUNGUN betrachtet wird, dann enthält er SEND, REPLY übernommen und SEND passend zu den Archivständen
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRLs des Fahrzeugs (4.2) und des Fluggeräts (5.0) betrachtet werden, dann haben sie je 10 Einträge mit Eintragstyp `n` im Status *in Bearbeitung*, kein Archiv und keinen Verlauf
- [ ] Angenommen die Demo-DMRL Fahrzeug oder Fluggerät wird ausgecheckt und unverändert eingecheckt, wenn geprüft wird, dann ist die Datei fehlerfrei (PROJ-8)
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Demo-REPLY aus `demo-dateien/` für PHUNGUN importiert wird, dann besteht sie XSD-Prüfung und Regelwerk und ergibt 30 freigegeben / 2 zu überarbeiten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn nach Firmennamen aus den Originaldateien gesucht wird, dann sind diese durch neutrale Namen ersetzt
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Archivstände betrachtet werden, dann verweist jeder `dmlref` auf die unmittelbar vorherige DMRL der Austauschkette (initialer SEND: auf sich selbst)

### Persistenz
- [ ] Angenommen ein Benutzer hat Daten geändert, wenn die Seite neu geladen oder der Browser neu gestartet wird, dann sind die Änderungen weiterhin vorhanden
- [ ] Angenommen gespeicherte Daten existieren, wenn die Anwendung geöffnet wird, dann werden die Demo-Daten nicht erneut geladen und die vorhandenen Daten nicht überschrieben
- [ ] Angenommen Archivstände, Freigabestände und Verlaufseinträge existieren, wenn die Seite neu geladen wird, dann sind sie unverändert vorhanden
- [ ] Angenommen ein Benutzer ist angemeldet, wenn die Seite neu geladen wird, dann ist er weiterhin angemeldet (PROJ-2)
- [ ] Angenommen ein DMRL-Eintrag wird gespeichert, wenn er wieder geladen wird, dann sind alle CSV-Felder inkl. `rpcname` und `remarks` unverändert und unabhängig von der S1000D-Version identisch benannt

### Zurücksetzen
- [ ] Angenommen der aktive Benutzer ist Administrator, wenn er „Demo-Daten zurücksetzen" wählt, dann erscheint ein Bestätigungsdialog mit dem Hinweis, dass alle Änderungen verloren gehen
- [ ] Angenommen der Bestätigungsdialog ist geöffnet, wenn der Administrator bestätigt, dann wird der Demo-Ausgangszustand vollständig wiederhergestellt und eine Erfolgsmeldung angezeigt
- [ ] Angenommen der Bestätigungsdialog ist geöffnet, wenn der Administrator abbricht, dann bleiben alle Daten unverändert
- [ ] Angenommen der aktive Benutzer ist Bearbeiter, wenn er die Anwendung nutzt, dann ist die Funktion „Demo-Daten zurücksetzen" nicht sichtbar

### Fehlerfälle
- [ ] Angenommen die gespeicherten Daten sind beschädigt oder unvollständig, wenn die Anwendung startet, dann erscheint ein verständlicher Hinweis mit der Option, die Demo-Daten neu zu laden, und die Anwendung stürzt nicht ab
- [ ] Angenommen der Browser-Speicher ist voll, wenn Daten gespeichert werden sollen, dann erscheint eine klare Fehlermeldung und der letzte gültige Datenstand bleibt erhalten
- [ ] Angenommen die gespeicherten Daten stammen aus einer älteren, inkompatiblen Prototyp-Version, wenn die Anwendung startet, dann wird dies erkannt und wie beschädigte Daten behandelt

## Edge Cases
- **Zweiter Browser-Tab:** Änderungen in Tab A sind in Tab B erst nach Neuladen sichtbar; gleichzeitiges Bearbeiten in zwei Tabs kann zu überschriebenen Daten führen (für Prototyp akzeptiert, siehe Decision Log).
- **Anderer Browser / anderes Gerät:** startet mit eigenem Demo-Datenbestand — Daten werden nicht geteilt.
- **Browserdaten gelöscht / privater Modus:** Anwendung startet wieder mit Demo-Daten.
- **Zurücksetzen während eine DMRL ausgecheckt ist:** Sperre wird mit aufgehoben, da der Ausgangszustand vollständig wiederhergestellt wird.
- **Leere Felder in Originaldateien** (z. B. leeres `answer/remarks`, fehlendes `issno/@type` in Datei 01): werden als leer gespeichert, nicht als Fehler.
- **Doppelte Leerzeichen in `techname`** (z. B. „Sonderfrist  Schaltschrank" in Datei 01/03, einfach in Datei 02): werden unverändert übernommen; Archiv-Inhalt bleibt byte-genau.

## Technical Requirements (optional)
- Datenhaltung ausschließlich im Browser (localStorage, JSON) — PRD-Constraint
- Datenstand muss versioniert sein, um inkompatible ältere Stände zu erkennen
- Archivierte Dateien werden unverändert (Original-Inhalt) gespeichert
- Browser: aktuelle Versionen von Chrome, Edge, Firefox, Safari

## Open Questions
- [x] Mapping der Felder auf die XML-Struktur von Issue 4.2 und 5.0 → in `docs/dmrl-mapping.md` (PROJ-12, 2026-11-12)
- [x] Zulässige Werte für `dmltype/@type` → `c`, `p`, `s` (PROJ-6)
- [x] Bleiben Einträge mit Typ `d` nach Freigabe in der DMRL? → Ja, nur der Typ wird entfernt; gelöschte DMs werden über `type=deleted` gekennzeichnet (PROJ-7)
- [x] Konkrete Bezeichnungen/Model Ident Codes für die fiktiven Systeme → „Geschütztes Transportfahrzeug" `GTFDEMO`, „Transporthubschrauber" `THSDEMO` (2026-11-12)
- [ ] Tech Design (Abschnitte B und D) an die neuen Datenobjekte (Verlauf, Freigabestände, Sperre mit Stand, Archiv-Erweiterungen, Anmeldung) und Demo-Dateien anpassen → `/architecture PROJ-1`

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| CSV-Felder aus `docs/dmrl-mapping.md` sind das einheitliche interne Datenmodell für alle S1000D-Versionen | Check-out/Check-in-CSV bleibt für alle Versionen gleich; Versionsunterschiede nur beim XML-Export/-Import | 2026-11-11 |
| `rpcname` und `remarks` als zusätzliche Eintragsfelder | In den Beispieldateien vorhanden (`rpc/@rpcname`, `dmentry/remarks`), getrennt von `answer/remarks` | 2026-11-11 |
| Versionsindex = `seqnum-diyear` aus `dmlc`; Zähler je Absender (eigene Seite und Partner zählen getrennt) | Entspricht dem S1000D-DML-Code und den Beispieldateien | 2026-11-11 |
| `dmlref` verweist immer auf die unmittelbar vorherige DMRL der Austauschkette; initialer SEND auf sich selbst | Bestätigt durch Beispieldatei 03 (SEND 00002 → REPLY C1234 00001) | 2026-11-11 |
| Demo-Daten: PHUNGUN (2.3) mit echter Austauschkette, Fahrzeug (4.2) und Fluggerät (5.0) ohne Austausch | 2.3 zeigt Historie, 4.2/5.0 ermöglichen einen Live-SEND/REPLY-Zyklus in der Demo | 2026-11-11 |
| Firmennamen aus Originaldateien durch neutrale Namen ersetzt | Demo-Daten sollen keine realen Firmennamen enthalten | 2026-11-11 |
| Zurücksetzen nur durch Administrator, mit Bestätigung | Verhindert versehentlichen Datenverlust durch Bearbeiter | 2026-11-11 |
| Beschädigte Daten → Hinweis + Neuladen der Demo-Daten statt Absturz | Demo-Fähigkeit hat Vorrang; keine Datenrettung im Prototyp | 2026-11-11 |
| Kein Abgleich zwischen mehreren Tabs/Browsern | localStorage-Prototyp; echte Mehrbenutzerfähigkeit ist Non-Goal | 2026-11-11 |
| Benutzer ohne Organisation, mit Status aktiv/inaktiv | Vorgabe Product Owner (PROJ-3) | 2026-11-12 |
| Demo-Admin ist das Systemkonto „Administrator" (Kennzeichen Systemkonto); fehlt es, gilt der Datenbestand als beschädigt | Vorgabe Product Owner (PROJ-2) — jederzeit Zugang zur Verwaltung | 2026-11-12 |
| Neue Datenobjekte Freigabestand und Workflow-Verlauf; Sperre speichert Stand beim Check-out; Archiv mit Zurückziehen und REPLY↔SEND-Zuordnung | Anforderungen aus PROJ-9 bis PROJ-15 (Refine) | 2026-11-12 |
| „Im Workflow verwendet" wird abgeleitet, nicht gespeichert | Eine Quelle der Wahrheit (Verlauf/Archiv) | 2026-11-12 |
| Anmeldung getrennt vom Datenbestand gespeichert | Bleibt beim Zurücksetzen der Demo erhalten (PROJ-2) | 2026-11-12 |
| Demo-Namen: Systeme PHUNGUN / Geschütztes Transportfahrzeug (GTFDEMO) / Transporthubschrauber (THSDEMO); Bearbeiter Anna Bearbeitung / Ben Bearbeiter | Vorgabe Product Owner (Wireframe PROJ-16) | 2026-11-12 |
| Demo-REPLY auf SEND 00002 mit 2 Ablehnungen und fehlerhafte Testdateien in `demo-dateien/` | Vollständiger Demo-Zyklus und Vorführung der Prüfungen (PROJ-11/13) | 2026-11-12 |
| Demo-Einträge PHUNGUN werden um `issno` (`001`), DM-Ausgabetyp (`new`) und Ausgabedatum (Datum des SEND) ergänzt; archivierte XML-Dateien bleiben byte-genau | Pflichtfelder laut PROJ-8; Beispieldateien enthalten diese Felder nicht | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| localStorage, ein JSON-Paket unter einem festen Schlüssel | PRD-Constraint (kein Backend); atomares Schreiben verhindert inkonsistente Teilstände | 2026-11-12 |
| Formatversion im Datenpaket | Erkennt inkompatible ältere Stände nach Modelländerungen | 2026-11-12 |
| Zod-Schema zur Prüfung beim Laden | Bereits installiert; erkennt beschädigte Daten vor der Nutzung | 2026-11-12 |
| Zentraler Datenspeicher via React Context | Einheitlicher Datenstand für alle Features, keine zusätzliche State-Bibliothek nötig (CLAUDE.md: useState/Context) | 2026-11-12 |
| Alle CSV-Felder als String gespeichert | Führende Nullen (S1000D-Codes) bleiben erhalten | 2026-11-12 |
| Beispiel-XMLs als Projektdateien; PHUNGUN-Einträge zur Laufzeit aus SEND 00002 per Browser-DOMParser gelesen | Archiv und Einträge aus einer Quelle; gleiche Technik wird für REPLY-Import benötigt | 2026-11-12 |
| Firmenname in Datei 02 einmalig in der Projektkopie neutralisiert | Archiv bleibt byte-genau zur Projektkopie, ohne reale Firmennamen | 2026-11-12 |
| 4.2-/5.0-Demo-Einträge fest hinterlegt | Keine XML-Beispiele vorhanden, kein Archiv benötigt | 2026-11-12 |
| Kein Tab-Abgleich (kein storage-Event) | Prototyp; Mehrbenutzerfähigkeit ist Non-Goal | 2026-11-12 |
| Reset-Button vorübergehend auf Startseite bis PROJ-2 | PROJ-1 muss ohne Rollenkonzept testbar sein | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
PROJ-1 ist überwiegend „unsichtbare" Infrastruktur: ein zentraler Datenspeicher im Browser, auf den alle späteren Features zugreifen, plus ein Demo-Datenpaket. Sichtbar werden nur drei Dinge: ein kurzer Ladezustand beim Start, ein Fehlerbildschirm bei beschädigten Daten und der Reset-Dialog für den Administrator.

### A) Komponentenstruktur
```
App-Rahmen (umschließt alle Seiten)
+-- Datenspeicher-Bereitsteller (lädt beim Start, stellt Daten allen Seiten bereit)
    +-- Ladezustand ("Daten werden geladen…") — kurz beim ersten Rendern
    +-- Fehlerbildschirm "Daten beschädigt"
    |   +-- Erklärungstext
    |   +-- Button "Demo-Daten neu laden"
    +-- Normale Anwendung (alle weiteren Seiten, PROJ-2 ff.)
        +-- Button "Demo-Daten zurücksetzen" (nur für Administrator, Platzierung im Admin-Bereich ab PROJ-2)
            +-- Bestätigungsdialog (shadcn AlertDialog)
            +-- Erfolgs-/Fehlermeldung (Toast)
```
Bis PROJ-2 (Rollen) existiert, wird der Reset-Button vorübergehend auf der Startseite angezeigt, damit PROJ-1 testbar ist.

### B) Datenmodell (in Klartext)
Alle Daten liegen als **ein einziges JSON-Paket** unter einem festen Schlüssel im localStorage. Das Paket enthält:
- **Formatversion** — Nummer des Datenformats; passt sie nicht zur App, gilt der Bestand als inkompatibel
- **Organisationen**, **Benutzer**, **Systeme**, **DMRLs**, **DMRL-Einträge**, **Archivstände** — jeweils als Liste
- Jedes Objekt hat eine **eindeutige ID**; Verknüpfungen (z. B. Eintrag → DMRL, DMRL → System) laufen über diese IDs
- **Archivstände** enthalten den kompletten XML-Text als unveränderten Text
- **DMRL-Einträge** speichern alle CSV-Felder als Text (nicht als Zahl), damit führende Nullen (`00`, `001`, `01`) erhalten bleiben

Felder und Werte entsprechen dem Abschnitt „Datenobjekte" oben und `docs/dmrl-mapping.md`.

**Größe:** Die drei Beispiel-XMLs sind zusammen ca. 50 KB; der Browser stellt ca. 5 MB bereit → ausreichend für viele weitere SEND/REPLY-Zyklen in der Demo.

### C) Ablauf beim Start
1. App wird geöffnet → Datenspeicher prüft localStorage
2. **Nichts vorhanden** → Demo-Paket wird erzeugt und gespeichert
3. **Vorhanden und gültig** → wird geladen
4. **Vorhanden, aber ungültig oder alte Formatversion** → Fehlerbildschirm mit „Demo-Daten neu laden"

**Gültigkeitsprüfung:** Beim Laden wird das gesamte Paket gegen eine Strukturbeschreibung geprüft (Pflichtfelder vorhanden, richtige Typen, Verknüpfungen zeigen auf existierende IDs).

**Speichern:** Jede Änderung schreibt das komplette Paket in einem Schritt. Scheitert das Schreiben (Speicher voll), bleibt der vorherige Stand im Browser unangetastet und eine Fehlermeldung erscheint.

### D) Demo-Datenpaket
- Die **drei Beispiel-XMLs** werden einmalig ins Projekt kopiert (Ordner für Demo-Daten). Beim Kopieren wird der reale Firmenname in Datei 02 (11 Vorkommen in `rpcname`) durch einen neutralen Namen ersetzt. Diese bereinigten Kopien sind die „Originale" für das Archiv und werden danach byte-genau übernommen.
- Die **32 Einträge der PHUNGUN-DMRL** werden beim Erzeugen des Demo-Pakets direkt aus SEND 00002 (Datei 03) ausgelesen. Dafür nutzt die App den eingebauten XML-Leser des Browsers. Die gleiche Lesetechnik wird später für den REPLY-Import (PROJ-13) gebraucht.
- **Fahrzeug (4.2)** und **Fluggerät (5.0)** werden als fest hinterlegte Einträge (je ca. 10) mitgeliefert, da es dafür keine XML-Beispiele gibt und kein Archiv nötig ist.
- **Organisationen, Benutzer, Systeme** werden fest hinterlegt.

### E) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Ein JSON-Paket statt vieler Einzelschlüssel | Ein Schreibvorgang = alles oder nichts. Halb gespeicherte, widersprüchliche Daten können nicht entstehen. |
| Zentraler Datenspeicher für die ganze App | Alle Seiten sehen denselben Stand; spätere Features (Check-in, REPLY) ändern Daten an einer Stelle. |
| Strukturprüfung beim Laden mit Zod (bereits installiert) | Erkennt beschädigte oder veraltete Daten zuverlässig, bevor die App damit arbeitet. |
| Formatversion im Paket | Wenn sich das Datenmodell in späteren Features ändert, erkennt die App alte Stände und bietet den Neuaufbau an. |
| CSV-Felder als Text | Führende Nullen sind fachlich relevant (S1000D) und dürfen nie verloren gehen. |
| Beispiel-XMLs als Dateien im Projekt, Einträge daraus ausgelesen | Eine Quelle der Wahrheit — Archiv und Einträge können nicht auseinanderlaufen. |
| Firmenname einmalig in der Projektkopie ersetzen | Archiv bleibt „unverändert" gegenüber der Projektkopie und enthält trotzdem keine realen Firmennamen. |
| Daten werden erst im Browser geladen (nicht serverseitig) | localStorage existiert nur im Browser; deshalb kurzer Ladezustand beim Start. |

### F) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** Genutzt werden bereits installiert: Zod (Strukturprüfung), shadcn/ui AlertDialog + Button, Sonner (Toast-Meldungen).
- Das XML-Auslesen erfolgt mit dem im Browser eingebauten XML-Leser.

### G) Testbarkeit
- Unit-Tests: Demo-Paket erzeugen (Anzahlen 3 Systeme / 32 Einträge / 3 Archivstände), Gültigkeitsprüfung (gültig / beschädigt / alte Formatversion), Speicher-voll-Fehler.
- E2E-Test: Erststart → Daten vorhanden; Reload → Änderungen bleiben; Reset → Ausgangszustand.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
