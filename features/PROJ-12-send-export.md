# PROJ-12: SEND-Export

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „SEND", Statusanzeige
- Requires: PROJ-11 (XSD-Validierung) — Prüfung vor Download und Archivierung
- Requires: PROJ-4 (Organisationen) — Partnerauswahl
- Requires: PROJ-5 / PROJ-6 — MI, Issue, Originator, DML-Typ, Sicherheitseinstufung
- Requires: PROJ-17 (Berechtigungen)
- Wird genutzt von: PROJ-13 (REPLY prüft gegen letzten SEND), PROJ-15 (Archiv), PROJ-18 (XML-Aufbau für Export)

## Beschreibung
Der Bearbeiter sendet die DMRL an einen externen Partner: Die Anwendung erzeugt eine S1000D-DMRL-XML in der Issue-Version des Systems (2.3, 4.2 oder 5.0), vergibt einen neuen Versionsindex `NNNNN-JJJJ`, prüft die Datei gegen das Schema (PROJ-11), stellt sie zum Download bereit und archiviert sie byte-genau. Die DMRL wartet danach auf die Antwort (REPLY) des Partners. Der Versand selbst erfolgt manuell außerhalb der Anwendung.

## Voraussetzungen
| Voraussetzung | Wenn nicht erfüllt |
|---|---|
| Berechtigter Bearbeiter oder Administrator | Aktion nicht verfügbar / „Keine Berechtigung" |
| DMRL nicht ausgecheckt | „Die DMRL ist ausgecheckt von [Name]" |
| DMRL-Status ≠ *gesendet* | „Es wird noch auf die Antwort zum SEND [Versionsindex] gewartet" |
| Kein Eintrag *zu überarbeiten* | „[n] abgelehnte Einträge sind noch nicht überarbeitet" (per Check-in ändern, mit `d` kennzeichnen oder erneut mit `n` versehen) |
| Mindestens ein Eintrag mit Eintragstyp `n`, `c` oder `d` | „Es gibt keine Änderungen, die der Partner prüfen müsste" |

Eine freigegebene DMRL ist damit erst nach einem Check-in mit Änderungen wieder sendefähig.

## SEND-Dialog
| Feld / Anzeige | Festlegung |
|---|---|
| Partner | Pflicht; alle Organisationen außer dem Originator; vorbelegt mit dem Partner des letzten SEND; bei Abweichung Hinweis „Abweichend vom letzten Partner [CAGE Name]" |
| Bemerkung | optional, Freitext → `dml/remarks` |
| Vorschau | neuer Versionsindex (z. B. `00003-2026`), Dateiname, Anzahl Einträge gesamt / `n` / `c` / `d` |
| Aktionen | „Senden" / „Abbrechen" |

## XML-Inhalt
**Kopf**
| Feld | Wert |
|---|---|
| Richtung | `send` |
| `dmlc` | MI des Systems · CAGE Originator · DML-Typ der DMRL · aktuelles Jahr · seqnum |
| seqnum | nächste freie Nummer je DMRL und Absender im aktuellen Jahr; beginnt bei `00001`, im neuen Jahr wieder bei `00001`; zurückgezogene SENDs belegen ihre Nummer weiterhin |
| `issno` / `inwork` / `type` | `001` / `00` / `new` |
| `issdate` | Datum des SEND |
| `security` | Sicherheitseinstufung der DMRL |
| `dmlref` | erster SEND: verweist auf sich selbst; sonst auf den letzten REPLY; jeweils mit `issno` `001` (NSG). Nach einem zurückgezogenen SEND: auf den letzten gültigen Stand |
| `brexDmRef` | nur 4.2/5.0: Standard-BREX — 4.2 `S1000D-F-04-10-0301-00A-022A-D`, 5.0 `S1000D-G-04-10-0301-00A-022A-D` |
| `remarks` | Bemerkung aus dem Dialog (falls angegeben) |

**Einträge**
- **Alle** Einträge der DMRL, sortiert nach DMC
- Mit Eintragstyp (`n`/`c`/`d`, leer = ohne Attribut), DMC, Titel, Sprache, Sicherheitseinstufung, rpc/rpcname, Bemerkung
- **Mit** Ausgabedaten: `issno`, DM-Ausgabetyp, Ausgabedatum (bei 4.2/5.0 zusätzlich `inWork="00"`)
- **Ohne** `answer` (Sende-DMRL enthält keine Antworten, NSG)
- Elementnamen je Issue laut `docs/dmrl-mapping.md`

**Dateiname:** `DML-{MI}-{CAGE Originator}-{DML-Typ}-{Jahr}-{seqnum}_001-00.XML`, z. B. `DML-PHUNGUN-D0815-C-2026-00003_001-00.XML`

## Wirkung nach erfolgreichem SEND
| Was | Danach |
|---|---|
| Einträge mit `n`/`c`/`d` | Status *gesendet* |
| Einträge ohne Eintragstyp | unverändert |
| DMRL | Status *gesendet* (Check-out und weiterer SEND gesperrt bis REPLY) |
| Archiv | XML byte-genau mit Versionsindex, Partner, Bearbeiter, Zeitpunkt (PROJ-15) |
| Workflow-Verlauf | „SEND [Versionsindex] an [Partner]" |
| Partner-Organisation | „im Workflow verwendet" (PROJ-4) |
| Antworten früherer REPLYs (`answer`) | bleiben in der Anwendung erhalten |

Besteht das XML die XSD-Prüfung nicht: kein Download, kein Versionsindex, kein Archiv, keine Statusänderung (PROJ-11).

## SEND zurückziehen
Nur **Administrator**, nur bei Status *gesendet*:
- Bestätigung + **Pflicht-Begründung**
- DMRL → *in Bearbeitung*; Einträge *gesendet* → *in Bearbeitung*
- Archiveintrag bleibt, markiert „zurückgezogen" (mit Benutzer, Zeitpunkt, Begründung)
- Workflow-Verlauf: „SEND [Versionsindex] zurückgezogen — [Begründung]"
- Ein REPLY auf einen zurückgezogenen SEND wird abgelehnt (PROJ-8 G)
- Nächster SEND erhält eine neue seqnum

## User Stories
- Als **Bearbeiter** möchte ich die DMRL als S1000D-XML an einen Partner senden, damit er die Änderungen prüfen kann.
- Als **Bearbeiter** möchte ich vor dem Senden sehen, welcher Versionsindex vergeben wird und wie viele Einträge neu, geändert oder zur Löschung sind.
- Als **Bearbeiter** möchte ich, dass jede SEND-Datei schemakonform und archiviert ist, damit ich jederzeit nachweisen kann, was an wen gesendet wurde.
- Als **Bearbeiter** möchte ich daran gehindert werden, eine DMRL mit unbearbeiteten abgelehnten Einträgen zu senden.
- Als **Administrator** möchte ich einen SEND zurückziehen können, wenn der Partner nicht antwortet oder falsch gewählt wurde, damit die DMRL nicht dauerhaft blockiert ist.
- Als **Product Owner** möchte ich den SEND für Systeme mit Issue 2.3, 4.2 und 5.0 vorführen.

## Out of Scope
- Automatischer Versand (E-Mail/Schnittstelle) — Non-Goal laut PRD
- Excel-Export beim SEND (Anforderung 02 nennt Excel + XML) — nur XML
- XML-Export ohne Workflow → PROJ-18
- Anzeige/erneuter Download aus dem Archiv → PROJ-15
- Partielle DMRL (nur geänderte Einträge) — immer alle Einträge
- Projektspezifischer BREX je System
- „Fehler ignorieren"-Ausnahmen aus Anforderung 02 (Freigabe ohne REPLY)
- Data Dispatch Note (DDN)
- Zurückziehen durch Bearbeiter

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Voraussetzungen
- [ ] Angenommen die DMRL ist ausgecheckt, wenn „SEND" gewählt wird, dann ist es nicht möglich mit „Die DMRL ist ausgecheckt von [Name]"
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn „SEND" gewählt wird, dann ist es nicht möglich mit Hinweis auf den ausstehenden REPLY
- [ ] Angenommen ein Eintrag hat Status *zu überarbeiten*, wenn „SEND" gewählt wird, dann ist es nicht möglich mit „[n] abgelehnte Einträge sind noch nicht überarbeitet"
- [ ] Angenommen kein Eintrag hat Eintragstyp `n`, `c` oder `d`, wenn „SEND" gewählt wird, dann ist es nicht möglich mit „Es gibt keine Änderungen, die der Partner prüfen müsste"
- [ ] Angenommen ein Bearbeiter ist für die DMRL nicht berechtigt, wenn er SEND aufruft, dann erscheint „Keine Berechtigung"

### Dialog
- [ ] Angenommen alle Voraussetzungen sind erfüllt, wenn „SEND" gewählt wird, dann zeigt der Dialog Partnerauswahl, Bemerkung, neuen Versionsindex, Dateiname und Anzahl gesamt/n/c/d
- [ ] Angenommen der Dialog ist offen, wenn die Partnerauswahl geöffnet wird, dann ist der Originator nicht enthalten und der Partner des letzten SEND vorausgewählt
- [ ] Angenommen ein anderer als der letzte Partner wird gewählt, wenn der Dialog angezeigt wird, dann erscheint der Hinweis „Abweichend vom letzten Partner"
- [ ] Angenommen kein Partner ist gewählt, wenn „Senden" gewählt wird, dann erscheint ein Pflichtfeldfehler
- [ ] Angenommen der Dialog ist offen, wenn „Abbrechen" gewählt wird, dann ändert sich nichts

### XML
- [ ] Angenommen PHUNGUN (2.3) hat die SENDs 00001-2026 und 00002-2026 und einen REPLY, wenn 2026 erneut gesendet wird, dann hat das XML seqnum `00003`, diyear `2026` und heißt `DML-PHUNGUN-D0815-C-2026-00003_001-00.XML`
- [ ] Angenommen der letzte SEND war 00007-2026, wenn im Jahr 2027 gesendet wird, dann ist der Versionsindex `00001-2027`
- [ ] Angenommen eine DMRL wurde noch nie gesendet, wenn sie gesendet wird, dann verweist `dmlref` auf den eigenen `dmlc`
- [ ] Angenommen ein REPLY liegt vor, wenn gesendet wird, dann verweist `dmlref` auf den `dmlc` dieses REPLY mit `issno` `001`
- [ ] Angenommen die DMRL hat 32 Einträge, davon einige ohne Eintragstyp, wenn gesendet wird, dann enthält das XML alle 32 Einträge sortiert nach DMC; Einträge ohne Eintragstyp haben kein Typ-Attribut
- [ ] Angenommen Einträge haben `answer` aus einem früheren REPLY, wenn gesendet wird, dann enthält das XML kein `answer`
- [ ] Angenommen ein Eintrag hat `issno` `002`, DM-Ausgabetyp `changed` und Datum, wenn gesendet wird, dann stehen diese Werte im XML (2.3: `addresdm/issno`, `issdate`; 4.2/5.0: `issueInfo`, `@issueType`, `issueDate`)
- [ ] Angenommen das System hat Issue 4.2 bzw. 5.0, wenn gesendet wird, dann enthält das XML den jeweiligen Standard-BREX in `brexDmRef`
- [ ] Angenommen das System hat Issue 2.3 / 4.2 / 5.0, wenn gesendet wird, dann besteht das XML die XSD-Prüfung des jeweiligen Issues (PROJ-11)
- [ ] Angenommen eine Bemerkung wurde eingegeben, wenn gesendet wird, dann steht sie in `dml/remarks`

### Wirkung
- [ ] Angenommen der SEND ist erfolgreich, wenn er abgeschlossen ist, dann wird die XML heruntergeladen, die DMRL hat Status *gesendet* und Einträge mit `n`/`c`/`d` haben Status *gesendet*
- [ ] Angenommen ein Eintrag hat keinen Eintragstyp und Status *freigegeben*, wenn gesendet wird, dann bleibt er *freigegeben*
- [ ] Angenommen der SEND ist erfolgreich, wenn das Archiv betrachtet wird, dann ist die XML byte-genau mit Versionsindex, Partner, Bearbeiter und Zeitpunkt gespeichert
- [ ] Angenommen der SEND ist erfolgreich, wenn der Kopfbereich der Ansicht betrachtet wird, dann zeigt er den neuen Versionsindex sowie Partner, Datum und Bearbeiter (PROJ-7)
- [ ] Angenommen die XML besteht die XSD-Prüfung nicht, wenn gesendet wird, dann wird nichts heruntergeladen, kein Versionsindex vergeben, nichts archiviert und kein Status geändert
- [ ] Angenommen die Partner-Organisation war noch nicht im Workflow verwendet, wenn gesendet wird, dann gilt sie danach als verwendet (PROJ-4)

### Zurückziehen
- [ ] Angenommen die DMRL hat Status *gesendet*, wenn ein Administrator „SEND zurückziehen" wählt, dann muss er eine Begründung eingeben und bestätigen
- [ ] Angenommen der SEND wurde zurückgezogen, wenn danach die DMRL betrachtet wird, dann ist sie *in Bearbeitung*, die zuvor *gesendeten* Einträge sind *in Bearbeitung* und der Archiveintrag ist als „zurückgezogen" markiert
- [ ] Angenommen SEND 00003-2026 wurde zurückgezogen, wenn erneut gesendet wird, dann erhält der neue SEND `00004-2026`
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn die DMRL *gesendet* ist, dann sieht er „SEND zurückziehen" nicht

## Edge Cases
- **Download blockiert / Datei verloren:** SEND gilt als ausgeführt; erneuter Download aus dem Archiv (PROJ-15).
- **XSD-Prüfung nicht verfügbar:** SEND blockiert (PROJ-11).
- **Jahreswechsel zwischen Dialog öffnen und Senden:** Versionsindex wird beim Senden ermittelt; Vorschau ggf. aktualisieren.
- **Partner-Organisation ist Originator einer anderen DMRL:** erlaubt.
- **Nur Organisation = Originator vorhanden:** „Keine Partner-Organisation vorhanden — bitte zuerst anlegen (Verwaltung → Organisationen)".
- **Einträge mit Eintragstyp `d` und Antwort `y` aus früherem Zyklus:** bleiben ohne Eintragstyp in der DMRL und werden mitgesendet.
- **Sehr große DMRL (1.000+ Einträge):** Fortschrittsanzeige während Erzeugung und Prüfung.
- **Speicher voll beim Archivieren:** SEND schlägt fehl, keine Statusänderung (PROJ-1).

## Technical Requirements (optional)
- XML-Erzeugung je Issue (2.3 / 4.2 / 5.0) nach `docs/dmrl-mapping.md`
- XSD-Prüfung serverseitig (PROJ-11) vor Download/Archivierung
- Archivierte Datei = heruntergeladene Datei (byte-genau)

## Open Questions
- [ ] Ausgabedaten der Einträge (`issno`, DM-Ausgabetyp, Datum) im SEND-XML: derzeit enthalten (Vorgabe Product Owner), NSG sieht sie nicht vor — ggf. später anpassen
- [x] Beispieldatei Issue 5.0 → `docs/beispiele/issue-5.0/DML-S1000DBIKE-B6865-S-2019-00001_001-00.XML`, schemagültig (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Standard-BREX je Issue (Model Ident Code `S1000D`), kein Feld am System | Vorgabe Product Owner | 2026-11-12 |
| Sicherheitseinstufung `01`–`20` (PROJ-6, PROJ-8 angepasst) | Schemas 4.2/5.0 erlauben nur 01–20 | 2026-11-12 |
| SEND nur ohne Check-out, nicht im Status *gesendet*, ohne Einträge *zu überarbeiten*, mit mindestens einem `n`/`c`/`d` | NSG (ein Zyklus nach dem anderen), Anforderung 02 | 2026-11-12 |
| Ausgabedaten der Einträge werden ins XML geschrieben | Vorgabe Product Owner (Option b); ggf. später anpassen | 2026-11-12 |
| Partner im Dialog, vorbelegt mit letztem Partner, Hinweis bei Abweichung | Vorgabe Product Owner (PROJ-6) | 2026-11-12 |
| Alle Einträge, ohne `answer` | Komplette DMRL (DML-Typ c), NSG | 2026-11-12 |
| `dmlref`: erster SEND auf sich selbst, sonst letzter REPLY, `issno` 001 | NSG 1.2.3, Beispieldateien | 2026-11-12 |
| seqnum je DMRL und Absender pro Jahr | PRD | 2026-11-12 |
| Einträge `n`/`c`/`d` → *gesendet*, übrige unverändert | Nur geänderte Einträge werden vom Partner geprüft | 2026-11-12 |
| SEND zurückziehen nur durch Administrator, mit Begründung; Archiveintrag bleibt markiert | Blockade durch fehlenden REPLY auflösbar, nachvollziehbar | 2026-11-12 |
| DM-Ausgabedaten je Issue schemakonform: 2.3 `addresdm/issno` (`@issno`, `@type`); 4.2/5.0 `dmRefIdent/issueInfo` (`@issueNumber`, `@inWork`) + `dmlEntry/@issueType` | In 4.2/5.0 gibt es kein `issno` und kein `@type` an `issueInfo`; geprüft mit xmllint, bestätigt durch Product Owner | 2026-11-13 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| XML-Erzeugung im Browser, XSD-Prüfung über Serverfunktion (PROJ-11) | Daten lokal; Server nur Prüfdienst | 2026-11-12 |
| DML-Schreiber je Issue als gemeinsamer Baustein (PROJ-12/14/18) | Einheitliche Dateien | 2026-11-12 |
| Schreiber und Leser nach derselben Mapping-Tabelle, Rundlauftest | REPLY-Vergleich (PROJ-8 G) zuverlässig | 2026-11-12 |
| Reihenfolge: erzeugen → XSD → atomar speichern → Download | Kein Archiv ohne gültige Datei, kein Download ohne Archiv | 2026-11-12 |
| Archiv speichert exakt den Download-Text | Byte-genau (PRD) | 2026-11-12 |
| Versionsindex beim Senden neu berechnet; zurückgezogene SENDs belegen ihre seqnum | Korrekt über Jahreswechsel, eindeutig | 2026-11-12 |
| Keine XML-Bibliothek, feste Struktur je Issue | Keine Abhängigkeit nötig | 2026-11-12 |
| Bemerkung im SEND-Dialog max. 2.000 Zeichen | Begrenzte Dateigröße | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Der SEND ist eine Workflow-Aktion nach dem Muster aus PROJ-9 (Verfügbarkeitsregel + atomare Ausführung). Neu ist der **DML-Schreiber je Issue** — das Gegenstück zum DML-Leser aus PROJ-8 —, der aus DMRL und Einträgen die S1000D-XML für 2.3, 4.2 oder 5.0 erzeugt. Er wird auch vom Export (PROJ-18) und vom Freigabestand-Export (PROJ-14) genutzt. Die erzeugte Datei wird serverseitig gegen das Schema geprüft (PROJ-11), danach im Browser archiviert und heruntergeladen. Ansonsten kein Backend nötig.

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Aktion „SEND" (gesperrt mit Grund, wenn Voraussetzungen fehlen)
+-- SEND-Dialog (shadcn Dialog + Form)
|   +-- Partner (Auswahl: Organisationen außer Originator; vorbelegt letzter Partner; Hinweis bei Abweichung)
|   +-- Bemerkung (mehrzeilig, optional)
|   +-- Vorschau: neuer Versionsindex · Dateiname · Anzahl gesamt / n / c / d
|   +-- „Senden" · „Abbrechen"
|   +-- während des Sendens: „XML wird erzeugt und geprüft…"
|   +-- bei XSD-Fehler: Prüfbericht-Anzeige (PROJ-8/11) mit Hinweis „Anwendungsfehler"
+-- nur Administrator bei Status gesendet: „SEND zurückziehen"
    +-- Dialog mit Versionsindex, Pflichtfeld „Begründung", „Zurückziehen" · „Abbrechen"
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte (PROJ-1). Ein erfolgreicher SEND schreibt in **einer** Speicherung:
- **Archivstand** (Richtung SEND): DML-Code, Versionsindex, `dmlref`, Dateiname, **XML-Text genau wie heruntergeladen**, Zeitpunkt, Bearbeiter, Partner
- **Einträge** mit `n`/`c`/`d` → *gesendet*
- **DMRL** → *gesendet*
- **Verlauf** „SEND [Versionsindex] an [Partner]"

Schlägt die XSD-Prüfung fehl: nur Verlaufseintrag „SEND fehlgeschlagen — XSD-Prüfung". **Zurückziehen** schreibt: Archivstand-Kennzeichen „zurückgezogen" (Zeitpunkt, Administrator, Begründung), Einträge *gesendet* → *in Bearbeitung*, DMRL → *in Bearbeitung*, Verlaufseintrag.

### C) Bausteine
| Baustein | Aufgabe | Auch genutzt von |
|---|---|---|
| **Versionsindex-Rechner** | nächste seqnum je DMRL + Absender + Jahr aus dem Archiv (zurückgezogene SENDs zählen mit) | Vorschau, Dashboard/Ansicht (aktueller Index) |
| **Bezugs-Ermittlung (`dmlref`)** | erster SEND → eigener DML-Code; sonst letzter REPLY; nach Zurückziehen letzter gültiger Stand | PROJ-18 (Export) |
| **DML-Schreiber je Issue** | erzeugt Kopf + Einträge nach `docs/dmrl-mapping.md`; 4.2/5.0 mit Standard-BREX; Einträge nach DMC sortiert; ohne `answer`; Sonderzeichen korrekt maskiert; UTF-8 mit XML-Deklaration | PROJ-14, PROJ-18 |
| **Dateiname-Bildung** | `DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}-{seqnum}_001-00.XML` | PROJ-18 (`_000-01`) |
| **XSD-Prüfdienst** | Prüfung über den Server (PROJ-11) | PROJ-13, 14, 18 |
| **Verfügbarkeitsregeln** | SEND und SEND zurückziehen laut Spec, mit Gründen | Aktionsleiste (PROJ-7) |

### D) Ablauf „Senden"
1. Dialog öffnen → Vorschau (Versionsindex, Dateiname, Zahlen) berechnen.
2. „Senden" → Verfügbarkeit erneut prüfen; Versionsindex mit aktuellem Datum neu ermitteln (Jahreswechsel).
3. XML erzeugen (DML-Schreiber).
4. XSD-Prüfung (Server). Nicht verfügbar → Abbruch mit Meldung, nichts gespeichert. Fehler → Verlaufseintrag „fehlgeschlagen", Bericht anzeigen.
5. Gültig → atomare Speicherung (Archiv, Einträge, DMRL, Verlauf). Scheitert sie (Speicher voll) → kein Download, Meldung.
6. Download der **identischen** XML; Dialog schließt; Ansicht zeigt neuen Versionsindex. Blockierter Download → erneut aus dem Archiv (PROJ-15).

### E) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| XML wird im Browser erzeugt, nur die Prüfung läuft auf dem Server | Daten liegen im Browser; Server bleibt ein schlanker Prüfdienst. |
| DML-Schreiber je Issue als gemeinsamer Baustein | SEND, Export und Freigabestand erzeugen identisch aufgebaute Dateien. |
| Schreiber und Leser folgen derselben Mapping-Tabelle; Rundlauftest Schreiben → Lesen | Was gesendet wird, kann beim REPLY wieder exakt gelesen und verglichen werden (PROJ-8 G). |
| Erst prüfen, dann speichern, dann herunterladen | Kein Archiv ohne gültige Datei; kein Download ohne Archiv. |
| Archiv speichert genau den heruntergeladenen Text | Byte-genauer Nachweis (PRD). |
| Versionsindex beim Senden neu berechnet | Korrekt auch über Jahreswechsel und bei parallelen Tabs. |
| Zurückgezogene SENDs belegen ihre seqnum | Keine doppelten Versionsindizes, Archiv bleibt eindeutig. |
| Bemerkung max. 2.000 Zeichen | Begrenzt die Dateigröße; reicht für Begleittext. |

### F) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** XML-Erzeugung ohne Zusatzbibliothek (feste Struktur je Issue); Prüfung über PROJ-11.

### G) Testbarkeit
- Unit-Tests: Versionsindex (fortlaufend, Jahreswechsel, zurückgezogene), `dmlref` (erster SEND, nach REPLY, nach Zurückziehen), DML-Schreiber je Issue (Kopf, Einträge, BREX bei 4.2/5.0, kein `answer`, Sonderzeichen), Rundlauf Schreiber → Leser, Statuswirkung, Zurückziehen.
- Integration mit xmllint: erzeugte Dateien für 2.3/4.2/5.0 sind schemagültig.
- E2E: Demo Fahrzeug (4.2) senden → Download `DML-GTFDEMO-D0815-C-[Jahr]-00001_001-00.XML`, Status gesendet; PHUNGUN nicht sendbar (gesendet); Admin zieht SEND zurück; erneuter SEND erhält nächste seqnum.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-12`_

**Umgesetzt**
- `src/lib/data/dml-writer.ts` — **DML-Schreiber je Issue** (gemeinsamer Baustein für PROJ-12/14/18): feste Struktur nach `docs/dmrl-mapping.md` und den Schemas; 2.3 (`dmlc`, `dmentry/addresdm/…`) bzw. 4.2/5.0 (`identAndStatusSection`, `dmlContent/dmlEntry`, Standard-BREX `S1000D-F-…` / `S1000D-G-…`); Antworten nur auf Wunsch (`answers`), beim SEND nie; Eintrag ohne Eintragstyp ohne Attribut; leere optionale Angaben (Ausgabedaten, Info Name, Sprache, Bemerkungen) werden weggelassen; mehrzeilige Bemerkungen in 4.2/5.0 als mehrere `simplePara`; Sonderzeichen maskiert, unzulässige Steuerzeichen entfernt; UTF-8 mit XML-Deklaration.
- `src/lib/workflows/send.ts` — Voraussetzungen mit Gründen (Berechtigung → ausgecheckt → gesendet → abgelehnte Einträge → keine Änderungen), Partnerliste (ohne Originator) und Vorbelegung, Versionsindex (seqnum je DMRL + Absender + Jahr, zurückgezogene zählen mit), `dmlref` (erster SEND → eigener Code, sonst letzter REPLY; `issno` 001), Dateiname, Vorschau, `prepareSend` (alle Einträge nach DMC, ohne `answer`), atomares `executeSend` (Archiv byte-genau, Einträge n/c/d → gesendet, DMRL → gesendet, Verlauf „SEND … an …"; prüft Voraussetzungen und Versionsindex erneut), `recordFailedSend`, `executeWithdrawSend`.
- `src/components/workflows/send-dialogs.tsx` — SEND-Dialog (Partner Pflicht, Hinweis „Abweichend vom letzten Partner …", Bemerkung max. 2.000 Zeichen mit Zähler, Vorschau Versionsindex/Dateiname/Anzahlen; Hinweis mit Link, wenn kein Partner existiert) → „XML wird erzeugt und geprüft …" → XSD-Prüfung (PROJ-11) → speichern → Download. Schemafehler: „Anwendungsfehler — SEND abgebrochen" + Prüfbericht, Verlauf „SEND fehlgeschlagen". Prüfung nicht verfügbar: blockiert, nichts gespeichert, „Erneut versuchen". Dialog „SEND zurückziehen" mit Pflicht-Begründung.
- `src/lib/dmrl/actions.ts`, `src/components/dmrl/dmrl-view.tsx` — Aktionen „SEND" und „SEND zurückziehen" angebunden.
- `src/test/setup.ts` — jsdom-Ergänzungen für Radix-Auswahllisten (erster Test, der eine Auswahlliste bedient).

**Tests**
- Unit: `dml-writer.test.ts` (9, u. a. Rundlauf Schreiben → Lesen für 2.3/4.2/5.0), `dml-writer.xsd.test.ts` (3, **erzeugte Dateien gegen alle drei Schemas mit echtem xmllint gültig**), `send.test.ts` (14, inkl. Rundlauf SEND → Partner-REPLY → REPLY-Prüfung PROJ-8 fehlerfrei), `send-dialogs.test.tsx` (5); insgesamt 339 Unit-Tests grün.
- E2E: `tests/PROJ-12-send.spec.ts` (2) — Fahrzeug 4.2 und Hubschrauber 5.0 senden, PHUNGUN 2.3 nach Zurückziehen erneut senden (00003); jeweils mit echter XSD-Prüfung über die Serverfunktion.

**Hinweise / Abweichungen**
- Die Vorschau im Dialog wird beim Öffnen berechnet; beim Senden wird der Versionsindex neu ermittelt. Hat er sich geändert (paralleler Tab, Jahreswechsel), wird der SEND mit Meldung abgelehnt.
- „XSD-Prüfung nicht verfügbar" wird nicht im Verlauf protokolliert (es ist kein fachlicher Fehlschlag); nur echte Schemafehler erzeugen „SEND fehlgeschlagen".
- Freigabestand-Export (PROJ-14) und Export (PROJ-18) können den Schreiber direkt nutzen (`answers: true`).

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
- [x] Voraussetzungen (5/5), Dialog (5/5), XML (10/10), Wirkung (6/6), Zurückziehen (4/4) — Unit (`send.test.ts`, `dml-writer*.test.ts`), Dialogtests, E2E (`PROJ-12-send.spec.ts`, alle drei Issues mit echter XSD-Prüfung)

### Edge Cases Status
- [x] Download blockiert (Archiv verfügbar), XSD nicht verfügbar, Jahreswechsel (Versionsindex neu ermittelt, Ablehnung mit Meldung), Partner = Originator anderer DMRL, nur Originator vorhanden (Hinweis mit Link), `d` + `y` aus früherem Zyklus, große DMRL (Fortschrittsanzeige), Speicher voll
- [ ] Siehe BUG-QA2-2 (PROJ-15): Speicherkapazität bei sehr großen DMRLs

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 30/30 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
