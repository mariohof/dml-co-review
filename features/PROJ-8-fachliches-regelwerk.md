# PROJ-8: Fachliches Regelwerk

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung) — Einträge, Feldnamen, Archiv (letzter SEND)
- Requires: PROJ-5 (Systemverwaltung) — MI des Systems
- Requires: PROJ-6 (DMRL anlegen) — DML-Typ der DMRL
- Requires: PROJ-7 (DMRL-Ansicht) — Begriffe Eintragstyp / DM-Ausgabetyp, Eintragsstatus
- Wird genutzt von: PROJ-10 (Check-in Excel/CSV), PROJ-13 (REPLY-Import)
- Abgrenzung: PROJ-11 (XSD-Validierung) läuft beim REPLY **vor** diesem Regelwerk

## Beschreibung
Das fachliche Regelwerk ist die gemeinsame Prüfung, die eine eingecheckte Excel/CSV-Datei (PROJ-10) bzw. eine importierte REPLY-DMRL (PROJ-13) durchläuft, **bevor** Daten in die Anwendung übernommen werden. Es prüft Dateistruktur, Feldformate, Pflichtfelder und fachliche Zusammenhänge der Einträge und liefert einen vollständigen Prüfbericht. Enthält der Bericht einen Fehler, wird die gesamte Datei abgelehnt.

Quellen: `docs/dmrl-mapping.md`, Anforderungen DMRLMS 01/02, NSG-Verfahrensbeschreibung DMRL.

## Regelkatalog

| Gruppe | Regel | Check-in | REPLY |
|---|---|:-:|:-:|
| S | Dateistruktur | ✓ | — (XSD, PROJ-11) |
| A | Feldformat | ✓ | ✓ |
| B | Pflichtfelder | ✓ | ✓ (mit Ausnahme, s. u.) |
| C | DMC eindeutig in der Datei | ✓ | ✓ |
| D | MI des Eintrags = MI des Systems | ✓ | ✓ |
| E | SNS → Tech Name eindeutig | ✓ | ✓ |
| I | Infocode → Info Name eindeutig | ✓ | ✓ |
| F | Eintragstyp plausibel zum bisherigen Stand | ✓ | — |
| K | `answer`/`answer_comment` unverändert | ✓ | — |
| G | REPLY passt zum letzten SEND | — | ✓ |
| H | Antworten vollständig | — | ✓ |

Alle Regelverstöße sind **Fehler**; es gibt keine Warnungen.

### S — Dateistruktur (nur Check-in)
- Erste Zeile ist die Kopfzeile mit **genau** diesen Spalten in **genau** dieser Reihenfolge:
  `dmentryType, modelic, sdc, chapnum, section, subsect, subject, discode, discodev, incode, incodev, itemloc, techname, infoname, language, country, security, rpc, rpcname, issno, type, day, month, year, answer, answer_comment, remarks`
- Fehlende, zusätzliche, doppelte oder vertauschte Spalten → Fehler; die Datei wird nicht weiter geprüft.
- Leere Zeilen werden übersprungen.
- Keine Eintragszeile → Fehler „Die Datei enthält keine Einträge".
- Gilt gleichermaßen für Excel und CSV (unterstützte Formate legt PROJ-10 fest).

### A — Feldformat
| Feld | Regel |
|---|---|
| dmentryType | leer, `n`, `c`, `d` |
| modelic | 2–14 Zeichen, alphanumerisch |
| sdc | 1–4, alphanumerisch |
| chapnum | 2–3, alphanumerisch |
| section | 1, alphanumerisch |
| subsect | 1, alphanumerisch |
| subject | 2–4, alphanumerisch |
| discode | 2, alphanumerisch |
| discodev | 1–3, alphanumerisch |
| incode | 3, alphanumerisch |
| incodev | 1, alphanumerisch |
| itemloc | 1, alphanumerisch |
| techname, infoname | Text |
| language | 2 Kleinbuchstaben, gültiger Sprachcode nach **ISO 639-1** (z. B. `de`, `en`) |
| country | 2 Großbuchstaben, gültiger Ländercode nach **ISO 3166** (Alpha-2, z. B. `DE`, `US`) |
| security | 2 Ziffern, `00`–`99` (nur Format; kein Vergleich mit der DMRL-Einstufung) |
| rpc, rpcname | Text |
| issno | 3 Ziffern, führende Nullen |
| type (DM-Ausgabetyp) | `new`, `changed`, `revised`, `deleted` |
| day / month / year | 2 / 2 / 4 Ziffern, führende Nullen; zusammen ein gültiges Datum (kein 31.02.) |
| answer | leer, `y`, `n` |
| answer_comment, remarks | Text |

### B — Pflichtfelder
- **Pflicht:** alle DMC-Teile (`modelic` … `itemloc`), `techname`, `infoname`, `language`, `country`, `security`, `rpc`, `issno`, `type`, `day`, `month`, `year`
- **Optional:** `dmentryType` (leer = abgestimmt), `rpcname`, `remarks`, `answer`, `answer_comment` (beide werden nur aus dem REPLY übernommen: `/dml/dmentry/answer/@answer` bzw. `/dml/dmentry/answer/remarks`)
- **Ausnahme REPLY:** `issno`, `type`, `day`, `month`, `year` dürfen im REPLY-XML fehlen (NSG: `addresdm/issno` in der DMRL nicht verwenden; Beispieldateien enthalten sie nicht). Fehlen sie, bleiben die Werte aus der Anwendung erhalten. Sind sie vorhanden, gelten Formatregeln (A) und Unverändert-Regel (G).

### C — DMC eindeutig
Derselbe DMC (alle 11 DMC-Teile) darf in der Datei nur einmal vorkommen.

### D — MI
`modelic` jedes Eintrags = Model Ident Code des Systems der DMRL.

### E — SNS → Tech Name
Gleiche Kombination MI + SNS (`sdc`, `chapnum`, `section`, `subsect`, `subject`) + `discode` + `discodev` ⇒ derselbe Tech Name. Derselbe Tech Name darf bei verschiedenen Kombinationen vorkommen. Geprüft wird über alle Einträge der Datei.

### I — Infocode → Info Name
Gleicher Infocode (`incode` + `incodev`) ⇒ derselbe Info Name innerhalb der DMRL. Ein Infocode darf in beliebig vielen Einträgen verwendet werden.

### F — Eintragstyp (nur Check-in)
Der Eintragstyp wird **vom Bearbeiter manuell** gesetzt. Das Regelwerk prüft nur offensichtliche Widersprüche zum Stand vor dem Check-out:

| Situation | Ergebnis |
|---|---|
| DMC neu (vorher nicht in der DMRL) und Eintragstyp ≠ `n` | Fehler |
| Bestehender Eintrag mit geänderten fachlichen Feldern, aber **ohne** Eintragstyp | Fehler |
| Bisheriger Eintrag fehlt in der Datei | Fehler (Einträge werden nicht entfernt, sondern mit `d` / `deleted` gekennzeichnet) |
| Bestehender Eintrag mit `n` | erlaubt (erneutes Senden nach Absprache, NSG) |
| Unveränderter Eintrag mit `c` oder `d` | erlaubt |
| Eintragstyp `d` ohne DM-Ausgabetyp `deleted` oder umgekehrt | erlaubt (unabhängig, PROJ-7) |

„Fachliche Felder" = alle Felder außer `dmentryType`, `answer`, `answer_comment`.

### K — Antwortfelder (nur Check-in)
`answer` und `answer_comment` dürfen vom Bearbeiter nicht verändert werden: Sie müssen dem Stand der Anwendung entsprechen; bei neuen Einträgen leer sein.

### G — REPLY passt zum letzten SEND (nur REPLY)
**Kopf**
| Prüfung | Fehler, wenn … |
|---|---|
| Richtung | `dml/@direction` ≠ `reply` |
| MI | `dmlc/modelic` ≠ MI des Systems |
| Absender | `dmlc/sendid` ≠ CAGE-Code des beim letzten SEND gewählten Partners |
| Bezug | `dmlref` verweist nicht auf den **letzten** SEND dieser DMRL |
| DML-Typ | `dmltype` ≠ DML-Typ der DMRL |
| Zustand | DMRL wartet nicht auf eine Antwort (Status ≠ „gesendet") |
| Duplikat | REPLY mit gleichem `dmlc` (Absender, Jahr, Nummer) bereits archiviert |

**Einträge**
| Prüfung | Fehler, wenn … |
|---|---|
| Vollständigkeit | DMC aus dem SEND fehlt im REPLY oder REPLY enthält DMC, der nicht im SEND war |
| Unverändert | außer `answer` und `answer/remarks` wurde ein Feld gegenüber dem SEND geändert (`issno`, `type`, Datum dürfen fehlen, s. B) |

Die Gesamtbemerkung `dml/remarks` des Partners ist erlaubt.

### H — Antworten vollständig (nur REPLY)
- Jeder Eintrag mit Eintragstyp `n`, `c` oder `d` hat `answer` = `y` oder `n`.
- Ein Eintrag **ohne** Eintragstyp darf **kein** `answer` haben.
- Bei `answer="n"` ist `answer/remarks` (Begründung) Pflicht.

## Prüfergebnis
- Die Prüfung läuft **vollständig** durch und sammelt alle Fehler (Ausnahme: Strukturfehler S brechen ab).
- **Prüfbericht** je Fehler: Zeile (Check-in) bzw. Position, DMC, Feld, Regel, Meldung mit gefundenem Wert.
  Beispiel: „Zeile 12 · PHUNGUN-A-A05-40-0000-01A-000A-A · chapnum · Format: 2–3 Stellen alphanumerisch, gefunden ‚A5B7'"
- Der Bericht kann heruntergeladen werden.
- **Mindestens ein Fehler → gesamte Datei abgelehnt.** Die DMRL bleibt unverändert; beim Check-in bleibt die Sperre bestehen.
- **Keine Fehler →** Zusammenfassung vor der Übernahme, z. B. „32 Einträge geprüft · 3 neu · 2 geändert · 1 Löschung" (Check-in) bzw. „… · 30 freigegeben · 2 zu überarbeiten" (REPLY). Die Übernahme selbst gehört zu PROJ-10 / PROJ-13.

## User Stories
- Als **Bearbeiter** möchte ich, dass eine eingecheckte Excel/CSV-Datei vor der Übernahme geprüft wird, damit keine fehlerhaften Einträge in die DMRL gelangen.
- Als **Bearbeiter** möchte ich alle Fehler auf einmal mit Zeile, DMC und Feld sehen, damit ich die Datei in einem Durchgang korrigieren kann.
- Als **Bearbeiter** möchte ich, dass ein REPLY nur angenommen wird, wenn er vom richtigen Partner kommt, sich auf meinen letzten SEND bezieht und keine Einträge verändert, damit die Abstimmung nachvollziehbar bleibt.
- Als **Bearbeiter** möchte ich auf widersprüchliche Eintragstypen (z. B. neuer DMC ohne `n`) hingewiesen werden, damit der Partner alle Änderungen zur Prüfung erhält.
- Als **Bearbeiter** möchte ich den Prüfbericht herunterladen, damit ich ihn weitergeben oder die Korrektur abarbeiten kann.
- Als **Product Owner** möchte ich demonstrieren, dass fehlerhafte Dateien zuverlässig erkannt und nicht übernommen werden.

## Out of Scope
- XSD-Validierung → PROJ-11 (läuft beim REPLY vor dem Regelwerk)
- Übernahme der Daten, Statusänderung, Entsperren → PROJ-10 (Check-in), PROJ-13 (REPLY)
- Vorbedingung „abgelehnte Einträge vor erneutem SEND bearbeitet" → PROJ-12
- Automatisches Setzen des Eintragstyps (Bearbeiter setzt ihn manuell)
- Prüfung gegen eine Infocode-Liste (NSG/projektspezifisch) — keine Liste hinterlegt
- refdm/reqdm-Prüfung, Lieferprüfung, `delivered`-Metadatum, RISP
- Multi-MI-/virtuelle DMRLs
- Warnungen bzw. „Fehler ignorieren" — nur Fehler, keine Übersteuerung
- Inhaltliche Prüfung der Sicherheitseinstufung (Wertebereiche, Vergleich mit DMRL)
- Zusätzliche Metadatenspalten im CSV
- Prüfung `issno` +1 bei Änderung/Löschung

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Dateistruktur (Check-in)
- [ ] Angenommen eine Datei hat alle Spalten in der festgelegten Reihenfolge, wenn sie geprüft wird, dann wird die Strukturprüfung bestanden
- [ ] Angenommen in der Datei fehlt eine Spalte, wenn sie geprüft wird, dann wird sie mit „Spalte ‚[Name]' fehlt" abgelehnt und nicht weiter geprüft
- [ ] Angenommen die Datei enthält eine zusätzliche Spalte, wenn sie geprüft wird, dann wird sie mit „Unbekannte Spalte ‚[Name]'" abgelehnt
- [ ] Angenommen zwei Spalten sind vertauscht, wenn die Datei geprüft wird, dann wird sie mit einem Hinweis auf die erwartete Reihenfolge abgelehnt
- [ ] Angenommen die Datei enthält leere Zeilen, wenn sie geprüft wird, dann werden diese übersprungen
- [ ] Angenommen die Datei enthält nur die Kopfzeile, wenn sie geprüft wird, dann wird sie mit „Die Datei enthält keine Einträge" abgelehnt

### Format & Pflicht (Check-in und REPLY)
- [ ] Angenommen `chapnum` hat 4 Zeichen, wenn geprüft wird, dann meldet der Bericht einen Formatfehler mit Zeile, DMC, Feld und gefundenem Wert
- [ ] Angenommen `security` ist `1` oder `A1`, wenn geprüft wird, dann wird ein Formatfehler gemeldet; `01` ist gültig
- [ ] Angenommen `dmentryType` ist `x`, wenn geprüft wird, dann wird ein Fehler gemeldet; leer, `n`, `c`, `d` sind gültig
- [ ] Angenommen der DM-Ausgabetyp ist `change`, wenn geprüft wird, dann wird ein Fehler gemeldet; `new`, `changed`, `revised`, `deleted` sind gültig
- [ ] Angenommen das Datum ist 31.02.2026, wenn geprüft wird, dann wird ein Fehler „ungültiges Datum" gemeldet
- [ ] Angenommen `language` ist `xx` oder `DE` bzw. `country` ist `XX` oder `de`, wenn geprüft wird, dann wird ein Fehler „kein gültiger Code nach ISO 639-1 / ISO 3166“ gemeldet; `de`/`DE` ist gültig
- [ ] Angenommen `infoname` oder `rpc` ist leer, wenn eine Check-in-Datei geprüft wird, dann wird ein Pflichtfeldfehler gemeldet
- [ ] Angenommen `rpcname` und `remarks` sind leer, wenn geprüft wird, dann wird kein Fehler gemeldet
- [ ] Angenommen in einer Check-in-Datei fehlt `issno`, wenn geprüft wird, dann wird ein Pflichtfeldfehler gemeldet
- [ ] Angenommen ein REPLY-Eintrag enthält kein `addresdm/issno` und kein `issdate`, wenn geprüft wird, dann wird kein Fehler gemeldet und die Werte der Anwendung bleiben erhalten

### Fachliche Zusammenhänge (Check-in und REPLY)
- [ ] Angenommen derselbe DMC kommt zweimal vor, wenn geprüft wird, dann werden beide Zeilen als Duplikat gemeldet
- [ ] Angenommen ein Eintrag hat einen anderen `modelic` als das System, wenn geprüft wird, dann wird „MI ‚[Wert]' passt nicht zum System ‚[MI]'" gemeldet
- [ ] Angenommen zwei Einträge haben dieselbe SNS-/Discode-/Discodev-Kombination und unterschiedliche Tech Names, wenn geprüft wird, dann werden beide Einträge gemeldet
- [ ] Angenommen zwei Einträge mit unterschiedlicher SNS haben denselben Tech Name, wenn geprüft wird, dann wird kein Fehler gemeldet
- [ ] Angenommen zwei Einträge haben denselben Infocode (`incode`+`incodev`) und unterschiedliche Info Names, wenn geprüft wird, dann werden beide Einträge gemeldet
- [ ] Angenommen mehrere Einträge haben denselben Infocode und denselben Info Name, wenn geprüft wird, dann wird kein Fehler gemeldet

### Eintragstyp & Antwortfelder (Check-in)
- [ ] Angenommen ein neuer DMC hat nicht den Eintragstyp `n`, wenn geprüft wird, dann wird „Neuer Eintrag muss Eintragstyp ‚n' haben" gemeldet
- [ ] Angenommen bei einem bestehenden Eintrag wurde der Tech Name geändert und kein Eintragstyp gesetzt, wenn geprüft wird, dann wird „Geänderter Eintrag ohne Eintragstyp" gemeldet
- [ ] Angenommen ein bisheriger Eintrag fehlt in der Datei, wenn geprüft wird, dann wird „Eintrag [DMC] fehlt — Einträge können nicht entfernt werden" gemeldet
- [ ] Angenommen ein bestehender, unveränderter Eintrag hat Eintragstyp `n`, `c` oder `d`, wenn geprüft wird, dann wird kein Fehler gemeldet
- [ ] Angenommen der Bearbeiter hat `answer` oder `answer_comment` verändert, wenn geprüft wird, dann wird „[Feld] darf nur durch REPLY gesetzt werden" gemeldet
- [ ] Angenommen ein neuer Eintrag hat einen Wert in `answer`, wenn geprüft wird, dann wird ein Fehler gemeldet

### REPLY gegen letzten SEND
- [ ] Angenommen der REPLY hat `direction="send"`, wenn geprüft wird, dann wird er abgelehnt
- [ ] Angenommen `sendid` entspricht nicht dem CAGE-Code des beim letzten SEND gewählten Partners, wenn geprüft wird, dann wird „REPLY stammt nicht vom Partner [CAGE]" gemeldet
- [ ] Angenommen `dmlref` verweist auf einen älteren SEND, wenn geprüft wird, dann wird „REPLY bezieht sich nicht auf den letzten SEND [Versionsindex]" gemeldet
- [ ] Angenommen `modelic` oder `dmltype` im Kopf weichen von System bzw. DMRL ab, wenn geprüft wird, dann wird ein Fehler gemeldet
- [ ] Angenommen die DMRL hat nicht den Status „gesendet", wenn ein REPLY geprüft wird, dann wird „Für diese DMRL wird keine Antwort erwartet" gemeldet
- [ ] Angenommen ein REPLY mit gleichem `dmlc` ist bereits archiviert, wenn er erneut geprüft wird, dann wird „REPLY wurde bereits importiert" gemeldet
- [ ] Angenommen im REPLY fehlt ein DMC aus dem SEND oder es gibt einen zusätzlichen DMC, wenn geprüft wird, dann wird jeder betroffene DMC gemeldet
- [ ] Angenommen der Partner hat den Tech Name eines Eintrags geändert, wenn geprüft wird, dann wird „Feld techname wurde gegenüber dem SEND verändert" gemeldet
- [ ] Angenommen der REPLY enthält `dml/remarks`, wenn geprüft wird, dann wird kein Fehler gemeldet

### Antworten vollständig (REPLY)
- [ ] Angenommen ein Eintrag mit Eintragstyp `n`, `c` oder `d` hat kein `answer`, wenn geprüft wird, dann wird „Antwort fehlt" gemeldet
- [ ] Angenommen ein Eintrag ohne Eintragstyp hat ein `answer`, wenn geprüft wird, dann wird „Antwort nur bei Eintragstyp n/c/d zulässig" gemeldet
- [ ] Angenommen ein Eintrag hat `answer="n"` ohne `answer/remarks`, wenn geprüft wird, dann wird „Begründung fehlt" gemeldet

### Prüfergebnis
- [ ] Angenommen eine Datei hat mehrere Fehler in verschiedenen Zeilen, wenn geprüft wird, dann listet der Bericht alle Fehler (nicht nur den ersten)
- [ ] Angenommen die Prüfung findet mindestens einen Fehler, wenn sie endet, dann wird nichts übernommen, die DMRL bleibt unverändert und eine Check-in-Sperre bleibt bestehen
- [ ] Angenommen ein Prüfbericht liegt vor, wenn „Bericht herunterladen" gewählt wird, dann wird er als Datei gespeichert
- [ ] Angenommen eine Check-in-Datei ist fehlerfrei, wenn die Prüfung endet, dann erscheint eine Zusammenfassung mit Anzahl geprüft/neu/geändert/Löschung
- [ ] Angenommen ein REPLY ist fehlerfrei, wenn die Prüfung endet, dann erscheint eine Zusammenfassung mit Anzahl freigegeben/zu überarbeiten
- [ ] Angenommen die Demo-Beispieldatei 02 (REPLY C1234-00001) wird gegen den passenden SEND geprüft, wenn die Prüfung läuft, dann ist sie fehlerfrei
- [ ] Angenommen die Demo-DMRL PHUNGUN wird ausgecheckt und unverändert eingecheckt, wenn geprüft wird, dann ist die Datei fehlerfrei

## Edge Cases
- **Führende Nullen in Excel:** Excel entfernt führende Nullen (z. B. `security` `01` → `1`). Das Regelwerk korrigiert nicht, sondern meldet einen Formatfehler; Check-out (PROJ-9) muss Textformat sicherstellen.
- **Groß-/Kleinschreibung:** DMC-Teile werden so geprüft, wie sie in der Datei stehen; `n`/`c`/`d`, `y`/`n` und DM-Ausgabetypen nur in Kleinschreibung gültig.
- **Leerzeichen am Anfang/Ende eines Werts:** werden vor der Prüfung entfernt.
- **E/I über alte und neue Einträge:** geprüft wird über alle Einträge der Datei, also auch über Einträge mit Eintragstyp `d` und DM-Ausgabetyp `deleted`.
- **Sehr viele Fehler:** der Bericht zeigt alle; die Anzeige darf gruppieren/blättern, der Download enthält alle.
- **Erster REPLY auf den ersten SEND:** `dmlref` des REPLY = `dmlc` des initialen SEND.
- **REPLY mit Werten in `issno`/`issdate`, die von der Anwendung abweichen:** Fehler „verändert" (Regel G).
- **Datei einer anderen DMRL eingecheckt:** fällt durch Regel D (MI) und F (fehlende Einträge) auf.

## Technical Requirements (optional)
- Prüfung von 1.000 Einträgen in wenigen Sekunden
- Regelwerk für Check-in und REPLY gemeinsam nutzbar (eine Regelquelle)
- Meldungen auf Deutsch

## Open Questions
- [ ] Weichen Feldformate/-namen in Issue 4.2 und 5.0 ab (Mapping 4.2/5.0 noch offen)? Regeln gelten bis dahin für alle Issues gleich.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ein gemeinsames Regelwerk für Check-in und REPLY, Gruppen je Quelle aktivierbar | Gleiche fachliche Regeln, ein Ort der Wahrheit | 2026-11-12 |
| SNS → Tech Name eindeutig; Tech Name darf mehrfach vorkommen | Vorgabe Product Owner / Anforderung 01/02 Kap. 5 | 2026-11-12 |
| Infocode (`incode`+`incodev`) → Info Name eindeutig; Infocode mehrfach verwendbar | Vorgabe Product Owner | 2026-11-12 |
| Eintragstyp wird manuell gesetzt; Regelwerk prüft nur Widersprüche | Vorgabe Product Owner — Bearbeiter weiß am besten, ob ein DM neu/geändert/gelöscht ist | 2026-11-12 |
| Einträge können nicht entfernt werden (Fehlen = Fehler) | Löschung nur über `d` / `deleted` (Anforderung 02, NSG) | 2026-11-12 |
| `answer` nur an Einträgen mit Eintragstyp n/c/d; Begründung bei `n` Pflicht | Vorgabe Product Owner, NSG 1.2.1 | 2026-11-12 |
| `answer`/`answer_comment` beim Check-in nicht veränderbar | Keine vorgetäuschte Partner-Freigabe | 2026-11-12 |
| Pflichtfelder inkl. `infoname`, `rpc`, `issno`, `type`, Datum | Vorgabe Product Owner | 2026-11-12 |
| `issno`/`type`/Datum im REPLY-XML optional, in der Anwendung Pflicht | NSG und Beispieldateien enthalten sie nicht; Demo-Einträge werden ergänzt | 2026-11-12 |
| REPLY: Partner, `dmlref` auf letzten SEND, gleiche DMCs, keine Feldänderungen | Nachvollziehbarer Zyklus (NSG 1.2.3, PROJ-6) | 2026-11-12 |
| `language` nach ISO 639-1, `country` nach ISO 3166 (2-stelliger Ländercode) | Vorgabe Product Owner; S1000D verwendet den 2-stelligen Ländercode | 2026-11-12 |
| Sicherheitseinstufung der Einträge: nur Format 00–99 | Vorgabe Product Owner | 2026-11-12 |
| Alles-oder-nichts, vollständiger Bericht, nur Fehler (keine Warnungen) | PRD: fehlerhafte Dateien werden nicht übernommen | 2026-11-12 |
| Spalten exakt in festgelegter Reihenfolge, keine zusätzlichen Spalten | Vorgabe Product Owner | 2026-11-12 |
| Keine Infocode-Liste, keine refdm/reqdm-/Lieferprüfung | Nicht im Prototyp-Umfang (RISP/CSDB) | 2026-11-12 |

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
