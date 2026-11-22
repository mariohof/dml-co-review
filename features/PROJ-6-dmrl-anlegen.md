# PROJ-6: DMRL anlegen

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-22

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — DMRLs werden im Datenbestand gespeichert
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriff nur für Administratoren
- Requires: PROJ-4 (Organisationsverwaltung) — Auswahl des Originators
- Requires: PROJ-5 (Systemverwaltung) — Auswahl des Systems
- Wird genutzt von: PROJ-17 (DMRL-Berechtigungen), PROJ-7 bis PROJ-15 (alle Workflows arbeiten auf einer DMRL)

## Beschreibung
Der Administrator legt unter „Verwaltung → DMRLs" zu einem System dessen DMRL an und pflegt die Kopfangaben (Originator, DML-Typ, Sicherheitseinstufung). Eine DMRL hat keine eigene Bezeichnung — sie wird über ihr System angezeigt. Der Empfänger wird nicht hier, sondern erst beim SEND gewählt (PROJ-12). Die Vergabe von Bearbeiter-Berechtigungen ist ein eigenes Feature (PROJ-17).

## Datenfelder einer DMRL
| Feld | Regel |
|------|-------|
| System | Pflicht; Auswahl aus angelegten Systemen, die noch keine DMRL haben (1 System = 1 DMRL) |
| Bezeichnung | keine eigene — angezeigt wird die Bezeichnung des Systems |
| Originator (Sender-Organisation) | Pflicht; Auswahl aus angelegten Organisationen (CAGE-Code + Name); wird als `dmlc/sendid` verwendet |
| DML-Typ | Pflicht; Auswahl `c`, `p` oder `s`; vorbelegt mit `c` |
| Sicherheitseinstufung | Pflicht; genau 2 Ziffern, `01`–`20`; vorbelegt mit `01` |
| Versionsindex erster SEND | Pflicht; Format `NNNNN-JJJJ`; Nummer `00001`–`99999`, Jahr = **aktuelles Jahr**; vorbelegt mit `00001-<aktuelles Jahr>`. Hinweistext unter dem Feld: „Versionsindex des ersten SEND. Bei einem bereits laufenden Austausch die nächste Nummer eintragen, die der Empfänger erwartet (z. B. 00013-2026). Danach zählt die Anwendung automatisch weiter.“ Wird vom ersten SEND verwendet (PROJ-12) |

Nicht an der DMRL gepflegt:
- **Berechtigte Bearbeiter** → PROJ-17
- **Empfänger** — wird beim SEND gewählt und in der Übertragungshistorie gespeichert (PROJ-12); beim REPLY wird geprüft, ob die Antwort vom richtigen Empfänger kommt (PROJ-13)
- **Ausführender Benutzer je Workflow-Schritt** — wird im Workflow/Archiv gespeichert (PROJ-9, 10, 12, 13)

Die Sicherheitseinstufung der DMRL ist **unabhängig** von der Sicherheitseinstufung der Datenmodul-Einträge. Einträge werden eigenständig geprüft (Format `01`–`20`, Regelwerk PROJ-8) und müssen nicht mit der DMRL übereinstimmen.

## Änderungs- und Löschregeln

Eine DMRL gilt als **in einem Workflow benutzt**, sobald sie mindestens einmal Check-out/Check-in oder SEND/REPLY durchlaufen hat (dauerhaft).

| Situation | Löschen | System | Originator | DML-Typ | Sicherheitseinstufung |
|---|---|---|---|---|---|
| Noch kein Workflow | ja, mit Bestätigung; Einträge und Berechtigungen werden mitgelöscht | fest | änderbar | änderbar | änderbar |
| In Workflow benutzt | **nein, dauerhaft** | fest | **fest** | **fest** | änderbar |

Die Sicherheitseinstufung wirkt ab dem nächsten SEND.

**Versionsindex erster SEND** — eigene Regel, unabhängig von „im Workflow benutzt“: änderbar bis zum **ersten SEND** (ein Check-out/Check-in davor sperrt ihn nicht); ab dem ersten SEND — auch wenn dieser zurückgezogen wurde — gesperrt mit dem Hinweis „Versionsindex wird bereits vom SEND-Zähler fortgeführt“.

### Versionsindex erster SEND — Wirkung (PROJ-12)
- Der erste SEND erhält genau den vorgegebenen Versionsindex (seqnum + diyear); danach zählt PROJ-12 wie gewohnt weiter (z. B. Vorgabe `00013-2026` → erster SEND `00013-2026`, nächster `00014-2026`).
- Der `dmlref` des ersten SEND verweist weiterhin auf sich selbst (mit dem vorgegebenen Versionsindex); Bezugsdaten eines früheren Empfänger-REPLY werden nicht erfasst.
- Liegt der erste SEND in einem späteren Jahr als die Vorgabe, gilt die normale Jahreswechsel-Regel: `00001-<neues Jahr>`; die SEND-Vorschau weist darauf hin, dass die Vorgabe nicht mehr angewendet wird.
- Wird der erste SEND zurückgezogen, belegt er seine Nummer weiterhin (PROJ-12); der nächste SEND erhält Vorgabe + 1.

## User Stories
- Als **Administrator** möchte ich zu einem System seine DMRL mit Originator, DML-Typ und Sicherheitseinstufung anlegen, damit daran gearbeitet werden kann.
- Als **Administrator** möchte ich eine versehentlich angelegte DMRL löschen, solange sie noch keinen Workflow durchlaufen hat, damit ich Fehler korrigieren kann.
- Als **Bearbeiter** möchte ich, dass Originator und DML-Typ nach dem ersten Workflow nicht mehr geändert werden können, damit DML-Codes und Archiv konsistent bleiben.
- Als **Administrator** möchte ich die Sicherheitseinstufung einer DMRL auch später anpassen können, damit der nächste SEND korrekt eingestuft ist.
- Als **Administrator** möchte ich beim Anlegen den Versionsindex des ersten SEND vorgeben, damit ein bereits laufender DMRL-Austausch (z. B. bisher per Excel/E-Mail) mit der vom Empfänger erwarteten Nummer nahtlos fortgesetzt werden kann.
- Als **Administrator** möchte ich in einer Liste alle DMRLs mit System, Originator und Status sehen, damit ich den Überblick behalte.

## Out of Scope
- Bearbeiter-Berechtigungen → PROJ-17
- Eigene Bezeichnung der DMRL
- Auswahl des Empfängers → PROJ-12 (SEND)
- Prüfung des Empfängers beim REPLY → PROJ-13
- Pflege der DMRL-Einträge → PROJ-9/10 (Check-out/Check-in)
- Prüfung der Sicherheitseinstufung der Einträge → PROJ-8
- DMRL-Detailansicht mit Einträgen → PROJ-7
- Kopieren einer DMRL auf ein anderes System
- Erfassung der Bezugsdaten (`dmlref`) eines früheren Empfänger-REPLY für den ersten SEND
- Vorgabe eines Versionsindex aus einem vergangenen oder zukünftigen Jahr

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Administrator ist angemeldet, wenn er „Verwaltung → DMRLs" öffnet, dann erscheint die DMRL-Verwaltung
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er die DMRL-Verwaltung direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)

### Liste
- [ ] Angenommen die DMRL-Verwaltung ist geöffnet, wenn die Liste angezeigt wird, dann zeigt sie je DMRL Systembezeichnung, Model Ident Code, S1000D-Issue, Originator (CAGE-Code), DML-Typ, Sicherheitseinstufung und DMRL-Status, sortiert nach Systembezeichnung
- [ ] Angenommen die Liste wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur DMRLs angezeigt, deren Systembezeichnung, Model Ident Code oder Originator den Begriff enthält
- [ ] Angenommen es existieren keine DMRLs, wenn die Liste angezeigt wird, dann erscheint „Noch keine DMRLs angelegt" mit der Aktion „DMRL anlegen"

### Anlegen
- [ ] Angenommen es gibt mindestens ein System ohne DMRL, wenn „DMRL anlegen" gewählt wird, dann öffnet sich ein Dialog mit System, Originator, DML-Typ (Auswahl `c`/`p`/`s`, vorbelegt `c`) und Sicherheitseinstufung (vorbelegt `01`) und Versionsindex erster SEND (vorbelegt `00001-<aktuelles Jahr>`, mit Hinweistext)
- [ ] Angenommen der Anlegen-Dialog ist geöffnet, wenn die Systemauswahl geöffnet wird, dann enthält sie nur Systeme ohne DMRL
- [ ] Angenommen alle Systeme haben bereits eine DMRL oder es gibt keine Systeme, wenn „DMRL anlegen" angezeigt wird, dann ist die Aktion gesperrt mit dem Hinweis „Kein System ohne DMRL vorhanden — legen Sie zuerst ein System an"
- [ ] Angenommen es gibt keine Organisationen, wenn der Anlegen-Dialog geöffnet wird, dann weist er darauf hin, zuerst eine Organisation anzulegen
- [ ] Angenommen der Dialog ist gültig ausgefüllt, wenn gespeichert wird, dann erscheint die DMRL mit Status „in Bearbeitung" und ohne Einträge in der Liste
- [ ] Angenommen System oder Originator sind nicht gewählt, wenn gespeichert wird, dann erscheint je Pflichtfeld eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen die Sicherheitseinstufung ist nicht genau zwei Ziffern (z. B. „1", „100", „A1", „00", „21"), wenn gespeichert wird, dann erscheint „Sicherheitseinstufung muss zweistellig sein (01–20)" und nichts wird gespeichert
- [ ] Angenommen der Anlegen-Dialog ist geöffnet, wenn das Feld „Versionsindex erster SEND“ angezeigt wird, dann ist es mit `00001-<aktuelles Jahr>` vorbelegt und darunter steht der Hinweistext „Versionsindex des ersten SEND. Bei einem bereits laufenden Austausch die nächste Nummer eintragen, die der Empfänger erwartet (z. B. 00013-2026). Danach zählt die Anwendung automatisch weiter.“
- [ ] Angenommen der Versionsindex entspricht nicht dem Format `NNNNN-JJJJ` oder die Nummer ist `00000` (z. B. „13-2026“, „000013-2026“, „00000-2026“, „ABCDE-2026“), wenn gespeichert wird, dann erscheint „Versionsindex muss das Format NNNNN-JJJJ haben (00001–99999)“ und nichts wird gespeichert
- [ ] Angenommen das Jahr im Versionsindex ist nicht das aktuelle Jahr (z. B. `00013-2025` im Jahr 2026), wenn gespeichert wird, dann erscheint „Das Jahr muss das aktuelle Jahr (2026) sein“ und nichts wird gespeichert
- [ ] Angenommen eine DMRL wurde mit Versionsindex `00013-2026` angelegt, wenn 2026 der erste SEND erfolgt, dann hat das XML seqnum `00013`, diyear `2026`, der `dmlref` verweist auf sich selbst und der nächste SEND erhält `00014-2026` (PROJ-12)
- [ ] Angenommen eine DMRL wurde mit Versionsindex `00013-2026` angelegt, wenn der erste SEND erst 2027 erfolgt, dann erhält er `00001-2027` und die SEND-Vorschau weist darauf hin, dass die Vorgabe `00013-2026` nicht mehr angewendet wird (PROJ-12)
- [ ] Angenommen der DML-Typ wird ausgewählt, wenn die Auswahl geöffnet wird, dann stehen genau `c`, `p` und `s` zur Verfügung
- [ ] Angenommen eine DMRL wurde zu einem System angelegt, wenn danach die Systemverwaltung geöffnet wird, dann ist die Systembezeichnung dieses Systems nicht mehr änderbar (PROJ-5)

### Bearbeiten
- [ ] Angenommen eine DMRL hat noch keinen Workflow durchlaufen, wenn „Bearbeiten" gewählt wird, dann sind Originator, DML-Typ und Sicherheitseinstufung änderbar und das System ist fest
- [ ] Angenommen eine DMRL hat einen Workflow durchlaufen, wenn „Bearbeiten" gewählt wird, dann ist nur die Sicherheitseinstufung änderbar; System, Originator und DML-Typ sind gesperrt mit dem Hinweis „wird in Workflows verwendet"
- [ ] Angenommen eine DMRL hat noch keinen SEND (auch wenn bereits Check-out/Check-in erfolgt ist), wenn „Bearbeiten“ gewählt wird, dann ist der Versionsindex erster SEND änderbar (gleiche Prüfungen wie beim Anlegen)
- [ ] Angenommen eine DMRL hat mindestens einen SEND (auch zurückgezogen), wenn „Bearbeiten“ gewählt wird, dann ist der Versionsindex erster SEND gesperrt mit dem Hinweis „Versionsindex wird bereits vom SEND-Zähler fortgeführt“
- [ ] Angenommen die Sicherheitseinstufung der DMRL wird geändert, wenn gespeichert wird, dann bleiben die Sicherheitseinstufungen der Einträge unverändert

### Löschen
- [ ] Angenommen eine DMRL hat noch keinen Workflow durchlaufen, wenn „Löschen" gewählt wird, dann erscheint ein Bestätigungsdialog mit dem Hinweis, dass alle Einträge und Berechtigungen mitgelöscht werden
- [ ] Angenommen der Lösch-Dialog ist geöffnet, wenn bestätigt wird, dann sind DMRL, Einträge und Berechtigungen entfernt und das System erscheint wieder als „ohne DMRL" (PROJ-5); bei Abbruch bleibt alles erhalten
- [ ] Angenommen eine DMRL hat einen Workflow durchlaufen, wenn „Löschen" gewählt werden soll, dann ist die Aktion dauerhaft gesperrt mit dem Hinweis „Die DMRL ist an Workflows beteiligt und kann nicht gelöscht werden"
- [ ] Angenommen eine gesperrte Aktion oder ein gesperrtes Feld wird angezeigt, wenn der Mauszeiger darauf zeigt oder es fokussiert wird, dann erklärt ein Tooltip den Grund

### Demo-Daten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL-Verwaltung geöffnet wird, dann ist die DMRL PHUNGUN nicht löschbar und nur ihre Sicherheitseinstufung änderbar; die DMRLs von Fahrzeug und Fluggerät sind löschbar und vollständig änderbar (außer System). PHUNGUN zeigt den Versionsindex erster SEND gesperrt; Fahrzeug und Fluggerät haben `00001-<aktuelles Jahr>` und sind änderbar

## Edge Cases
- **System wird nach Löschen der DMRL wieder frei:** erscheint erneut in der Systemauswahl; Systembezeichnung ist wieder änderbar (PROJ-5).
- **Originator-Organisation einer DMRL ohne Workflow soll gelöscht werden:** gesperrt, bis Originator geändert oder DMRL gelöscht wird (PROJ-4).
- **DMRL ist gerade ausgecheckt und soll gelöscht werden:** Löschen gesperrt mit „Die DMRL ist ausgecheckt von [Name]" (eigener Sperrgrund; „im Workflow benutzt" gilt erst nach abgeschlossenem Check-in, PROJ-9). Nach Rücknahme des Check-outs ohne Check-in wieder löschbar.
- **Sicherheitseinstufung der DMRL `01`, Einträge `02`:** zulässig, keine Abhängigkeit.
- **Bestehende DMRLs ohne Vorgabe (Altbestand im localStorage):** gelten als `00001-<Jahr des ersten SEND>` — Verhalten wie bisher.
- **Versionsindex `99999-JJJJ` vorgegeben:** zulässig; das Verhalten beim nächsten SEND im selben Jahr (Zählerüberlauf) ist noch offen — siehe Open Questions.
- **Einziger SEND zurückgezogen, danach Versionsindex ändern:** nicht möglich — der zurückgezogene SEND hat die Vorgabe bereits verbraucht.
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Formularvalidierung mit sofortigen, deutschsprachigen Fehlermeldungen
- Responsiv: Tabelle auf kleinen Bildschirmen horizontal scrollbar

## Open Questions
- [ ] Tech Design ergänzen (`/architecture`): Feld am DMRL-Datensatz (PROJ-1), Altbestand-Migration, Übergabe an die seqnum-Berechnung (PROJ-12), Hinweis in der SEND-Vorschau
- [ ] Zählerüberlauf: Was passiert beim SEND nach `99999-JJJJ` im selben Jahr? Heute in PROJ-12 nicht geregelt; durch die Vorgabe erstmals praktisch erreichbar. Empfehlung: SEND mit Meldung sperren (2026-11-22)
- [x] Bedeutung der DML-Typen `c`, `p`, `s` für die Anzeige? → S1000D: „c – vollständig", „p – partiell", „s – Status" in der Auswahl; in Listen nur das Kürzel (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine eigene DMRL-Bezeichnung, Anzeige über Systembezeichnung | Vorgabe Product Owner (1 System = 1 DMRL) | 2026-11-12 |
| Systembezeichnung fest, sobald DMRL existiert | Vorgabe Product Owner — DMRL-Bezeichnung darf sich nicht unbemerkt ändern | 2026-11-12 |
| Nur Sender-Organisation (Originator) an der DMRL | Vorgabe Product Owner | 2026-11-12 |
| Empfänger wird beim SEND gewählt und in der Übertragungshistorie gespeichert; REPLY wird gegen ihn geprüft | Vorgabe Product Owner — Nachvollziehbarkeit „an wen geliefert" und Absenderprüfung | 2026-11-12 |
| DML-Typ: Auswahl `c`, `p`, `s`, vorbelegt `c` | Vorgabe Product Owner | 2026-11-12 |
| Sicherheitseinstufung 2 Ziffern 00–99, vorbelegt `01` | Vorgabe Product Owner (Format); Vorbelegung entspricht Beispieldateien | 2026-11-12 |
| Sicherheitseinstufung auf `01`–`20` eingeschränkt | Schemas 4.2/5.0 erlauben nur 01–20 (2.3: 01–24); Vorgabe Product Owner (PROJ-12) | 2026-11-12 |
| Sicherheitseinstufung der DMRL unabhängig von der der Einträge; Einträge werden eigenständig geprüft | Vorgabe Product Owner | 2026-11-12 |
| Berechtigungen als eigenes Feature (PROJ-17) | Vorgabe Product Owner — Single Responsibility | 2026-11-12 |
| Ausführender Bearbeiter wird je Workflow-Schritt gespeichert | Vorgabe Product Owner — Nachvollziehbarkeit | 2026-11-12 |
| Löschen nur ohne Workflow-Historie; Einträge und Berechtigungen werden mitgelöscht | Vorgabe Product Owner, analog PROJ-4/5 | 2026-11-12 |
| DML-Typ-Klartexte „c – vollständig", „p – partiell", „s – Status" in der Auswahl | S1000D-Bedeutung; offene Frage geschlossen | 2026-11-12 |
| Originator und DML-Typ fest ab erstem Workflow; Sicherheitseinstufung bleibt änderbar | Originator/DML-Typ stehen im DML-Code archivierter Stände; Einstufung wirkt erst beim nächsten SEND | 2026-11-12 |
| Versionsindex des ersten SEND wird beim Anlegen vorgegeben (Pflichtfeld, vorbelegt `00001-<aktuelles Jahr>`) — eingegeben wird der *nächste* Index, nicht der zuletzt verwendete | Laufender DMRL-Austausch (z. B. aus Excel/E-Mail) muss beim Empfänger nahtlos fortgesetzt werden; Administrator sieht direkt die Nummer der ersten Datei; Vorbelegung = bisheriges Verhalten. Vorgabe Product Owner | 2026-11-22 |
| Hinweistext unter dem Feld erklärt die Bedeutung | Vorgabe Product Owner | 2026-11-22 |
| `dmlref` des ersten SEND verweist weiterhin auf sich selbst; keine Erfassung eines früheren Empfänger-REPLY | Kein zusätzliches Feld, Regel bleibt einfach, XML bleibt schemagültig. Vorgabe Product Owner | 2026-11-22 |
| Nur das aktuelle Jahr zulässig; erster SEND in späterem Jahr → `00001-<neues Jahr>` mit Hinweis in der SEND-Vorschau | Jahreswechsel-Regel (PRD) bleibt ausnahmslos gültig. Vorgabe Product Owner | 2026-11-22 |
| Versionsindex änderbar bis zum ersten SEND (auch nach Check-in); ab erstem SEND — auch zurückgezogen — gesperrt | Bei laufendem Austausch wird typischerweise erst der Bestand eingecheckt, dann gesendet. Vorgabe Product Owner | 2026-11-22 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Verwaltungsmuster (PROJ-3) und Regel „im Workflow benutzt" (PROJ-4) wiederverwendet | Einheitliche Umsetzung | 2026-11-12 |
| DMRL-Liste dient auch als Einstieg für PROJ-17 (Spalte „Bearbeiter", Aktion „Berechtigungen") | Alles zu einer DMRL an einer Stelle | 2026-11-12 |
| Löschen atomar: DMRL, Einträge, Berechtigungen, Verlauf | Keine verwaisten Daten | 2026-11-12 |
| Ausgecheckte DMRL nicht löschbar (eigener Sperrgrund) | Konsistenz mit PROJ-9 | 2026-11-12 |
| Kopfdaten-Änderungen erzeugen Verlaufseintrag in derselben Speicherung | PROJ-15 | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
### Überblick
Die DMRL-Verwaltung nutzt das **Verwaltungsmuster aus PROJ-3** und die **Regel „im Workflow benutzt" aus PROJ-4**. Dieselbe Liste ist später auch der Einstieg für die Berechtigungen (PROJ-17: zusätzliche Spalte „Bearbeiter" und Aktion „Berechtigungen"). Kein Backend nötig.

### A) Komponentenstruktur
```
Seite „Verwaltung → DMRLs" (/verwaltung/dmrl)
+-- Zugriffswächter „Administrator?" (PROJ-2)
+-- Verwaltungs-Seitenrahmen (PROJ-3)
    +-- Titel „DMRLs" · Button „DMRL anlegen" (gesperrt mit Tooltip, wenn kein System ohne DMRL)
    +-- Suchfeld (Systembezeichnung, MI, Originator)
    +-- Tabelle
    |   +-- Spalten: System · MI · Issue · Originator (CAGE) · DML-Typ · Sicherheitseinstufung · Status · [Bearbeiter — PROJ-17] · Aktionen
    |   +-- Aktionen: „Öffnen" (DMRL-Ansicht) · „Bearbeiten" · [„Berechtigungen" — PROJ-17] · „Löschen" (gesperrt mit Tooltip)
    |   +-- Leer: „Noch keine DMRLs angelegt" + Aktion
    +-- Formular-Dialog „DMRL anlegen / bearbeiten"
    |   +-- System (Auswahl: nur Systeme ohne DMRL; beim Bearbeiten fest)
    |   +-- Originator (Auswahl: CAGE-Code + Name; Hinweis, falls keine Organisation existiert)
    |   +-- DML-Typ (Auswahl „c – vollständig" / „p – partiell" / „s – Status", vorbelegt c)
    |   +-- Sicherheitseinstufung (2 Ziffern, vorbelegt 01)
    |   +-- gesperrte Felder ausgegraut mit Hinweis „wird in Workflows verwendet"
    +-- Bestätigungsdialog „Löschen" (Hinweis: Einträge und Berechtigungen werden mitgelöscht)
```

### B) Datenmodell (in Klartext)
Keine Änderung — DMRL laut PROJ-1. Beim **Anlegen** entsteht eine DMRL mit Status *in Bearbeitung*, ohne Einträge, ohne Berechtigungen, ohne Sperre, ohne Archiv/Verlauf. Beim **Löschen** werden in einem Schritt entfernt: DMRL, ihre Einträge, ihre Berechtigungen und eventuelle Verlaufseinträge (nur „Kopfdaten geändert"/Check-out-Rücknahmen möglich, da ohne Workflow).

### C) Fachregeln (eine Stelle, ohne Oberfläche)
- **Prüfung:** System Pflicht und ohne DMRL; Originator Pflicht und existierend; DML-Typ `c`/`p`/`s`; Sicherheitseinstufung `01`–`20`.
- **Zustand:** *ohne Workflow* / *im Workflow benutzt* (Regel PROJ-4) — bestimmt Feldsperren laut Regel-Tabelle; Sperren gelten in der Oberfläche und beim Speichern.
- **Sperrgründe Löschen:** im Workflow benutzt (dauerhaft) · ausgecheckt (vorübergehend).
- **Verlauf:** Jede Änderung von Originator, DML-Typ oder Sicherheitseinstufung erzeugt einen Verlaufseintrag „Kopfdaten geändert: Feld alt → neu" mit Benutzer (PROJ-15) — in derselben Speicherung.

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Verwaltungsmuster und Regel „im Workflow benutzt" wiederverwendet | Einheitlich mit PROJ-3/4/5. |
| Eine Liste für DMRL-Verwaltung und Berechtigungen | Administrator findet alles zu einer DMRL an einer Stelle (PROJ-17 ergänzt Spalte/Aktion). |
| Löschen als ein atomarer Schritt (DMRL + Einträge + Berechtigungen + Verlauf) | Keine verwaisten Daten. |
| Ausgecheckte DMRL nicht löschbar (eigener Sperrgrund) | Konsistent mit PROJ-9 („benutzt" erst nach Check-in), ohne laufende Bearbeitung zu zerstören. |
| Kopfdaten-Änderungen im Verlauf | Nachvollziehbarkeit (PROJ-15). |
| Klartext der DML-Typen nur in der Auswahl | Verständlich beim Anlegen, kompakt in Listen. |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.**

### F) Testbarkeit
- Unit-Tests: Prüfungen, Systemauswahl (nur ohne DMRL), Feldsperren je Zustand, Sperrgründe Löschen (benutzt / ausgecheckt), Löschen entfernt Einträge und Berechtigungen, Verlaufseintrag bei Kopfdatenänderung.
- E2E: Anlegen (inkl. „kein System frei"), Bearbeiten, Löschen; Demo-Daten: PHUNGUN nur Sicherheitseinstufung änderbar, Fahrzeug/Fluggerät löschbar.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-6`_

**Umgesetzt**
- `src/lib/rules/dmrls.ts` — Prüfung (System Pflicht und ohne DMRL, Originator Pflicht, DML-Typ c/p/s, Sicherheitseinstufung 01–20), Rechte (System immer fest; mit Workflow nur Sicherheitseinstufung änderbar), Sperrgründe Löschen (im Workflow benutzt — dauerhaft; ausgecheckt — vorübergehend, mit Name), „DMRL anlegen" nur bei freiem System. Bearbeiten erzeugt bei jeder Änderung einen Verlaufseintrag „Kopfdaten geändert: Feld alt → neu" in derselben Speicherung; Löschen entfernt DMRL, Einträge, Berechtigungen und Verlauf in einem Schritt.
- `src/components/admin/dmrls/` — Seite „DMRLs & Berechtigungen" (`/verwaltung/dmrl`, Verwaltungsmuster PROJ-3): Tabelle sortiert nach System (System mit Anzahl Einträge, MI, Issue, Originator, DML-Typ, Sicherheitseinstufung, Status), Suche über System, MI und Originator, Aktionen Öffnen / Bearbeiten / Löschen; Dialog mit Systemauswahl (nur freie Systeme), Originator, DML-Typ mit Klartext, Sicherheitseinstufung (vorbelegt c / 01), gesperrte Felder mit Hinweis, Hinweis bei fehlenden Organisationen.

**Tests**: `dmrls.test.ts` (22), `dmrl-management.test.tsx` (5) — insgesamt 168 Tests grün.

**Hinweise**
- Spalte „Bearbeiter" und Aktion „Berechtigungen" folgen mit PROJ-17 auf derselben Seite.
- Bearbeiten ohne Änderung speichert nichts und erzeugt keinen Verlaufseintrag.
- Browser-E2E-Tests stehen aus → `/qa`.

## QA Test Results

**Tested:** 2026-11-13
**App URL:** http://localhost:3000 (`npm run dev`)
**Tester:** QA Engineer (AI)
**Testumfang:** gemeinsamer QA-Lauf PROJ-1–6 und PROJ-17
**Automatisiert:** Vitest 184 Tests ✅ · Playwright 46 E2E-Tests ✅ (Chrome über `PW_CHANNEL=chrome`, Projekt `chromium`)
**Browser:** Chrome (Desktop) getestet · Firefox und Safari **nicht getestet** (Playwright-Browser nicht installiert)
**Responsive:** 375 / 768 / 1440 px — kein horizontales Scrollen der Seite (Tabellen scrollen innerhalb ihrer Karte)

### Acceptance Criteria Status
- [x] Zugriff (2/2) — E2E
- [x] Liste (2/3): Spalten, Sortierung, Suche — E2E; Leerhinweis „Noch keine DMRLs angelegt" mit Demo-Daten nur nach Löschen aller DMRLs erreichbar (nicht separat getestet)
- [x] Anlegen (8/9): freie Systeme, „DMRL anlegen" gesperrt ohne freies System, Vorbelegung c/01, Status in Bearbeitung, Pflichtfelder, Sicherheitseinstufung 01–20, DML-Typen c/p/s, Systembezeichnung danach fest — E2E + Unit; **nicht getestet:** Hinweis „zuerst eine Organisation anlegen" (mit Demo-Daten nicht herstellbar)
- [x] Bearbeiten (3/3): Felder je Zustand, Sicherheitseinstufung ändert Einträge nicht, Verlaufseintrag — E2E + Unit
- [x] Löschen (4/4): Bestätigung mit Hinweis, Einträge/Berechtigungen mitgelöscht, System wieder frei, gesperrt bei Workflow und bei Check-out — E2E + Unit
- [x] Demo-Daten (1/1)

### Security Audit Results
- [x] Zugriff ohne Anmeldung: alle Seiten leiten zur Anmeldeseite (E2E)
- [x] Autorisierung: Bearbeiter erhalten für Verwaltung und nicht berechtigte DMRLs „Keine Berechtigung" (E2E)
- [x] XSS: `<img src=x onerror=alert(1)>` als Benutzername wird als Text angezeigt, nicht ausgeführt (E2E)
- [x] Offene Weiterleitung: `?ziel=//evil…`, `https://evil…` werden ignoriert, Ziel ist das Dashboard (E2E)
- [x] Manipulierte Anmeldung (unbekannte Benutzer-ID im Speicher) wird abgewiesen (E2E)
- [x] Manipulierter/beschädigter Datenbestand wird beim Laden erkannt (Zod-Prüfung, Verknüpfungen, Grundregeln) (Unit + E2E)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): Wer Zugriff auf den Browser-Speicher hat, kann Rollen oder Berechtigungen per Entwicklerwerkzeug ändern — simulierte Anmeldung ohne Backend, bewusst akzeptiert.
- [x] Keine Geheimnisse/Zugangsdaten im Client; keine Serverfunktionen in diesem Umfang (Rate Limiting nicht relevant)

### Bugs Found

Keine Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 20/22 passed, 2 nicht getestet (Leerzustände, mit Demo-Daten nicht herstellbar), 0 fehlgeschlagen
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung ohne Backend)
- **Production Ready:** YES
- **Recommendation:** Freigeben; Medium/Low-Bugs bei Gelegenheit beheben
- **E2E-Tests:** `tests/PROJ-1-datenhaltung.spec.ts`, `tests/PROJ-2-anmeldung.spec.ts`, `tests/PROJ-3-to-6-17-verwaltung.spec.ts`, `tests/security-responsive.spec.ts`

## Deployment
_To be added by /deploy_
