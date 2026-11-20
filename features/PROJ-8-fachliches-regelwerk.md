# PROJ-8: Fachliches Regelwerk

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-18

> **Refinement 2026-11-18 (über `/refine PROJ-10`):** Regel F — die Zeile „DMC neu und Eintragstyp ≠ `n` → Fehler“ entfällt. Neue Einträge dürfen `n`, `c`, `d` oder keinen Eintragstyp haben (Bestand aus laufendem Projekt übernehmen); neue Einträge ohne Eintragstyp werden beim Check-in *freigegeben* (Details PROJ-10). Umgesetzt 2026-11-18 zusammen mit PROJ-10 (`checkin.ts`: F1 entfernt, `isReleasedOnTakeover`).

> **Refinement 2026-11-16 (über `/refine PROJ-10`):** Regel A erlaubt zusätzlich den DM-Ausgabetyp `status`. Regel F prüft beim Check-in, ob DM-Ausgabetyp und Eintragstyp zusammenpassen (`n` → `new`; `c` → `changed`/`revised`/`status`; `d` → `deleted`; ohne Eintragstyp keine Prüfung). Ersetzt die bisherige Zeile „unabhängig, erlaubt“. Umgesetzt 2026-11-16 zusammen mit PROJ-10 (`checkin.ts`: `checkIssueTypeMatchesEntryType`; `src/lib/dmrl/issue-type.ts`).

> **Refinement 2026-11-14 (über `/refine PROJ-10`, Anlass PROJ-20):** Regel K ist kein Fehler mehr — abweichende Antwortfelder werden beim Check-in zur optionalen Übernahme angeboten (Details PROJ-10). Umgesetzt 2026-11-14 zusammen mit PROJ-10 (`checkin.ts`: `answerDeviations`, `answerTakeoverBlockers`; Details in PROJ-10, Implementation Notes).

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
| K | `answer`/`answer_comment` abweichend → **kein Fehler**, Abweichungen werden ermittelt und im Check-in zur Übernahme angeboten (PROJ-10) *(Refinement 2026-11-14)* | ✓ | — |
| G | REPLY passt zum letzten SEND | — | ✓ |
| H | Antworten vollständig | — | ✓ |

Alle Regelverstöße sind **Fehler**; es gibt keine Warnungen. Einzige Ausnahme sind **Hinweise** zum Auffüllen führender Nullen (Gruppe A).

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
| security | 2 Ziffern, `01`–`20` (Wertebereich der Schemas 4.2/5.0; kein Vergleich mit der DMRL-Einstufung) |
| rpc, rpcname | Text |
| issno | 3 Ziffern, führende Nullen |
| type (DM-Ausgabetyp) | `new`, `changed`, `revised`, `deleted`, `status` *(`status` ergänzt im Refinement 2026-11-16)* |
| day / month / year | 2 / 2 / 4 Ziffern, führende Nullen; zusammen ein gültiges Datum (kein 31.02.) |
| answer | leer, `y`, `n` |
| answer_comment, remarks | Text |

**Führende Nullen (nur Check-in):** Bei `security`, `issno`, `day`, `month` werden fehlende führende Nullen vor der Prüfung aufgefüllt (`1` → `01` bzw. `001`), da Excel sie beim Öffnen der CSV entfernt (PROJ-9). Der Prüfbericht nennt jede Auffüllung als Hinweis; Hinweise sind keine Fehler. DMC-Teile werden nicht aufgefüllt.

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
| ~~DMC neu (vorher nicht in der DMRL) und Eintragstyp ≠ `n`~~ | ~~Fehler~~ — entfällt *(Refinement 2026-11-18)* |
| DMC neu mit Eintragstyp `n`, `c` oder `d` | erlaubt; Typ-Regel (unten) gilt *(Refinement 2026-11-18)* |
| DMC neu **ohne** Eintragstyp | erlaubt — Eintrag wird beim Check-in *freigegeben* (Bestand übernehmen, PROJ-10) *(Refinement 2026-11-18)* |
| Bestehender Eintrag mit geänderten fachlichen Feldern, aber **ohne** Eintragstyp | Fehler |
| Eintrag wäre nach dem Check-in *in Bearbeitung*, hat aber **keinen** Eintragstyp — z. B. Eintragstyp entfernt, oder Altbestand bereits *in Bearbeitung* ohne Eintragstyp *(Refinement 2026-11-14, BUG-QA4-1)* | Fehler „Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden.“ |
| Bisheriger Eintrag fehlt in der Datei | Fehler (Einträge werden nicht entfernt, sondern mit `d` / `deleted` gekennzeichnet) |
| Bestehender Eintrag mit `n` | erlaubt (erneutes Senden nach Absprache, NSG) |
| Unveränderter Eintrag mit `c` oder `d` | erlaubt |
| Eintragstyp `n` und DM-Ausgabetyp ≠ `new` | Fehler „Eintragstyp ‚n‘ verlangt DM-Ausgabetyp ‚new‘ — gefunden: ‚[Wert]‘“ *(Refinement 2026-11-16)* |
| Eintragstyp `c` und DM-Ausgabetyp nicht `changed`, `revised` oder `status` | Fehler „Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚[Wert]‘“ *(Refinement 2026-11-16)* |
| Eintragstyp `d` und DM-Ausgabetyp ≠ `deleted` | Fehler „Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚[Wert]‘“ *(Refinement 2026-11-16)* |
| Kein Eintragstyp | keine Prüfung des Zusammenpassens (DM-Ausgabetyp nur nach Regel A) *(Refinement 2026-11-16)* |
| ~~Eintragstyp `d` ohne DM-Ausgabetyp `deleted` oder umgekehrt~~ | ~~erlaubt (unabhängig, PROJ-7)~~ — ersetzt 2026-11-16 durch die Typ-Regel oben |

„Fachliche Felder" = alle Felder außer `dmentryType`, `answer`, `answer_comment`.

**Typ-Regel *(Refinement 2026-11-16)*:** gilt für **jeden Eintrag der Datei mit Eintragstyp** — neu, geändert und unverändert (auch Altbestand). Ist der DM-Ausgabetyp bereits nach Regel A ungültig (z. B. `change`, `Deleted`), wird nur der Formatfehler gemeldet. Nur beim Check-in, nicht beim REPLY (dort sichert Regel G die Ausgabedaten) und nicht im Prüfwerkzeug PROJ-20.

**Grundsatz *(Refinement 2026-11-14)*:** Nach einem Check-in gibt es keinen Eintrag *in Bearbeitung* ohne Eintragstyp — SEND nimmt nur Einträge mit `n`, `c` oder `d` mit, ein solcher Eintrag könnte nie freigegeben werden. Unveränderte Einträge ohne Eintragstyp, die *freigegeben* sind oder bleiben, sind erlaubt. Für die Übernahme von Empfängerantworten gilt dasselbe als bedingte Sperre (PROJ-10).

### K — Antwortfelder (nur Check-in) *(Refinement 2026-11-14)*
~~`answer` und `answer_comment` dürfen vom Bearbeiter nicht verändert werden.~~ (bis 2026-11-14)

Weichen `answer` oder `answer_comment` vom Stand der Anwendung ab (bei neuen Einträgen: nicht leer), ist das **kein Fehler**. Regel K ermittelt die abweichenden Einträge; der Check-in (PROJ-10) bietet sie dem Bearbeiter zur Übernahme an (eine Entscheidung für alle). Übernommene Antworten sind nur Information und setzen nie *freigegeben* oder *zu überarbeiten*. Das Format von `answer` (leer, `y`, `n`) prüft weiterhin Regel A. Zusätzlich ermittelt das Regelwerk Einträge **ohne Eintragstyp mit reiner Antwortabweichung**; sie sperren die Übernahme, wenn der Bearbeiter die Antworten übernehmen will (PROJ-10, Tech Design I).

### G — REPLY passt zum letzten SEND (nur REPLY)
**Kopf**
| Prüfung | Fehler, wenn … |
|---|---|
| Richtung | `dml/@direction` ≠ `reply` |
| MI | `dmlc/modelic` ≠ MI des Systems |
| Absender | `dmlc/sendid` ≠ CAGE-Code des beim letzten SEND gewählten Empfängers |
| Bezug | `dmlref` verweist nicht auf den **letzten** SEND dieser DMRL |
| DML-Typ | `dmltype` ≠ DML-Typ der DMRL |
| Zustand | DMRL wartet nicht auf eine Antwort (Status ≠ „gesendet") |
| Duplikat | REPLY mit gleichem `dmlc` (Absender, Jahr, Nummer) bereits archiviert |

**Einträge**
| Prüfung | Fehler, wenn … |
|---|---|
| Vollständigkeit | DMC aus dem SEND fehlt im REPLY oder REPLY enthält DMC, der nicht im SEND war |
| Unverändert | außer `answer` und `answer/remarks` wurde ein Feld gegenüber dem SEND geändert (`issno`, `type`, Datum dürfen fehlen, s. B) |

Die Gesamtbemerkung `dml/remarks` des Empfängers ist erlaubt.

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
- Als **Bearbeiter** möchte ich, dass ein REPLY nur angenommen wird, wenn er vom richtigen Empfänger kommt, sich auf meinen letzten SEND bezieht und keine Einträge verändert, damit die Abstimmung nachvollziehbar bleibt.
- Als **Bearbeiter** möchte ich auf widersprüchliche Eintragstypen (z. B. neuer DMC ohne `n`) hingewiesen werden, damit der Empfänger alle Änderungen zur Prüfung erhält.
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
- [ ] Angenommen `security` ist `A1`, `123`, `00` oder `21`, wenn geprüft wird, dann wird ein Formatfehler gemeldet; `01` ist gültig
- [ ] Angenommen in einer Check-in-Datei ist `security` = `1`, `issno` = `1`, `month` = `9`, wenn geprüft wird, dann werden die Werte zu `01`, `001`, `09` aufgefüllt, als Hinweis gemeldet und kein Fehler erzeugt
- [ ] Angenommen ein REPLY enthält `security` = `1`, wenn geprüft wird, dann wird ein Formatfehler gemeldet (kein Auffüllen beim REPLY)
- [ ] Angenommen `dmentryType` ist `x`, wenn geprüft wird, dann wird ein Fehler gemeldet; leer, `n`, `c`, `d` sind gültig
- [ ] Angenommen der DM-Ausgabetyp ist `change`, wenn geprüft wird, dann wird ein Fehler gemeldet; `new`, `changed`, `revised`, `deleted`, `status` sind gültig *(`status` ergänzt 2026-11-16)*
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
- [ ] ~~Angenommen ein neuer DMC hat nicht den Eintragstyp `n`, wenn geprüft wird, dann wird „Neuer Eintrag muss Eintragstyp ‚n' haben" gemeldet~~ — entfällt *(Refinement 2026-11-18)*
- [ ] Angenommen ein neuer DMC hat Eintragstyp `c` oder `d` (mit passendem DM-Ausgabetyp) oder keinen Eintragstyp, wenn eine Check-in-Datei geprüft wird, dann meldet Regel F dafür keinen Fehler *(Refinement 2026-11-18)*
- [ ] Angenommen bei einem bestehenden Eintrag wurde der Tech Name geändert und kein Eintragstyp gesetzt, wenn geprüft wird, dann wird „Geänderter Eintrag ohne Eintragstyp" gemeldet
- [ ] Angenommen bei einem Eintrag *in Bearbeitung* wurde nur der Eintragstyp entfernt, wenn geprüft wird, dann wird „Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d)“ gemeldet *(Refinement 2026-11-14)*
- [ ] Angenommen ein Eintrag ist bereits *in Bearbeitung* ohne Eintragstyp (Altbestand) und in der Datei unverändert, wenn geprüft wird, dann wird derselbe Fehler gemeldet *(Refinement 2026-11-14)*
- [ ] Angenommen ein *freigegebener* Eintrag ohne Eintragstyp ist in der Datei unverändert, wenn geprüft wird, dann ist das kein Fehler *(Refinement 2026-11-14)*
- [ ] Angenommen ein bisheriger Eintrag fehlt in der Datei, wenn geprüft wird, dann wird „Eintrag [DMC] fehlt — Einträge können nicht entfernt werden" gemeldet
- [ ] Angenommen ein bestehender, unveränderter Eintrag hat Eintragstyp `n`, `c` oder `d`, wenn geprüft wird, dann wird kein Fehler gemeldet
- [ ] Angenommen der Bearbeiter hat `answer` oder `answer_comment` verändert, wenn geprüft wird, dann ist das kein Fehler, und die betroffenen Einträge werden als „abweichende Empfängerantworten" an den Check-in übergeben (PROJ-10) *(Refinement 2026-11-14; vorher: Fehler „[Feld] darf nur durch REPLY gesetzt werden")*
- [ ] Angenommen ein neuer Eintrag hat einen Wert in `answer`, wenn geprüft wird, dann wird ein Fehler gemeldet
- [ ] Angenommen ein Eintrag hat Eintragstyp `n`/`c`/`d` und einen DM-Ausgabetyp außerhalb von `new` / `changed`·`revised`·`status` / `deleted`, wenn eine Check-in-Datei geprüft wird, dann wird der Typ-Fehler mit gefundenem Wert gemeldet — auch bei unverändertem Eintrag *(Refinement 2026-11-16, Details PROJ-10)*
- [ ] Angenommen ein Eintrag hat keinen Eintragstyp, wenn geprüft wird, dann wird das Zusammenpassen nicht geprüft *(Refinement 2026-11-16)*
- [ ] Angenommen ein REPLY wird geprüft, wenn Eintragstyp und DM-Ausgabetyp nicht zusammenpassen, dann meldet die Typ-Regel nichts (nur Check-in) *(Refinement 2026-11-16)*

### REPLY gegen letzten SEND
- [ ] Angenommen der REPLY hat `direction="send"`, wenn geprüft wird, dann wird er abgelehnt
- [ ] Angenommen `sendid` entspricht nicht dem CAGE-Code des beim letzten SEND gewählten Empfängers, wenn geprüft wird, dann wird „REPLY stammt nicht vom Empfänger [CAGE]" gemeldet
- [ ] Angenommen `dmlref` verweist auf einen älteren SEND, wenn geprüft wird, dann wird „REPLY bezieht sich nicht auf den letzten SEND [Versionsindex]" gemeldet
- [ ] Angenommen `modelic` oder `dmltype` im Kopf weichen von System bzw. DMRL ab, wenn geprüft wird, dann wird ein Fehler gemeldet
- [ ] Angenommen die DMRL hat nicht den Status „gesendet", wenn ein REPLY geprüft wird, dann wird „Für diese DMRL wird keine Antwort erwartet" gemeldet
- [ ] Angenommen ein REPLY mit gleichem `dmlc` ist bereits archiviert, wenn er erneut geprüft wird, dann wird „REPLY wurde bereits importiert" gemeldet
- [ ] Angenommen im REPLY fehlt ein DMC aus dem SEND oder es gibt einen zusätzlichen DMC, wenn geprüft wird, dann wird jeder betroffene DMC gemeldet
- [ ] Angenommen der Empfänger hat den Tech Name eines Eintrags geändert, wenn geprüft wird, dann wird „Feld techname wurde gegenüber dem SEND verändert" gemeldet
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
- **Führende Nullen in Excel:** Excel entfernt führende Nullen (z. B. `security` `01` → `1`). Beim Check-in werden `security`, `issno`, `day`, `month` aufgefüllt; bei DMC-Teilen (z. B. `chapnum` `00` → `0`) bleibt es ein Formatfehler.
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
| ~~`answer`/`answer_comment` beim Check-in nicht veränderbar~~ — ersetzt 2026-11-14 | Keine vorgetäuschte Empfänger-Freigabe | 2026-11-12 |
| Regel „DMC neu ⇒ Eintragstyp `n`“ entfällt; neue Einträge ohne Eintragstyp werden beim Check-in *freigegeben* | Vorgabe Product Owner (`/refine PROJ-10`): Bestand aus laufendem Projekt mit erreichtem Bearbeitungsstand übernehmen | 2026-11-18 |
| Kein Eintrag *in Bearbeitung* ohne Eintragstyp nach dem Check-in (Regel F erweitert, auch für Altbestand) | Solche Einträge würden nie gesendet; die DMRL könnte nicht mehr freigegeben werden (BUG-QA4-1) | 2026-11-14 |
| Abweichende `answer`/`answer_comment` beim Check-in kein Fehler, sondern optionale Übernahme nur als Information | Altbestände mit Empfängerantworten übernehmbar (PROJ-20); vorgetäuschte Freigabe weiterhin ausgeschlossen, da übernommene Antworten den Status nie auf *freigegeben* setzen | 2026-11-14 |
| Eintragstyp ↔ DM-Ausgabetyp beim Check-in: `n` → `new`, `c` → `changed`/`revised`/`status`, `d` → `deleted`, leer → keine Prüfung; für alle Einträge mit Eintragstyp; ersetzt „unabhängig, erlaubt“ | Vorgabe Product Owner (`/refine PROJ-10`) | 2026-11-16 |
| DM-Ausgabetyp `status` gültig; `rinstate-*` weiterhin ungültig | In allen drei Schemas gültig; für `c` vorgesehen | 2026-11-16 |
| Pflichtfelder inkl. `infoname`, `rpc`, `issno`, `type`, Datum | Vorgabe Product Owner | 2026-11-12 |
| `issno`/`type`/Datum im REPLY-XML optional, in der Anwendung Pflicht | NSG und Beispieldateien enthalten sie nicht; Demo-Einträge werden ergänzt | 2026-11-12 |
| REPLY: Empfänger, `dmlref` auf letzten SEND, gleiche DMCs, keine Feldänderungen | Nachvollziehbarer Zyklus (NSG 1.2.3, PROJ-6) | 2026-11-12 |
| `language` nach ISO 639-1, `country` nach ISO 3166 (2-stelliger Ländercode) | Vorgabe Product Owner; S1000D verwendet den 2-stelligen Ländercode | 2026-11-12 |
| Sicherheitseinstufung der Einträge: nur Format 00–99 | Vorgabe Product Owner | 2026-11-12 |
| Sicherheitseinstufung auf `01`–`20` eingeschränkt (alle Issues) | Schemas 4.2/5.0 erlauben nur 01–20; Fehler früh beim Check-in statt beim SEND (PROJ-12) | 2026-11-12 |
| Alles-oder-nichts, vollständiger Bericht, nur Fehler (keine Warnungen) | PRD: fehlerhafte Dateien werden nicht übernommen | 2026-11-12 |
| Fehlende führende Nullen bei `security`, `issno`, `day`, `month` beim Check-in auffüllen (Hinweis, kein Fehler) | Vorgabe Product Owner (PROJ-9) — Excel entfernt Nullen | 2026-11-12 |
| Spalten exakt in festgelegter Reihenfolge, keine zusätzlichen Spalten | Vorgabe Product Owner | 2026-11-12 |
| Keine Infocode-Liste, keine refdm/reqdm-/Lieferprüfung | Nicht im Prototyp-Umfang (RISP/CSDB) | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Regelwerk läuft im Browser, speichert nichts | Daten liegen lokal; Bericht nur temporär | 2026-11-12 |
| Gemeinsames Prüfformat; CSV-Leser und DML-Leser je Issue übersetzen vorher | Jede Regel einmal für alle Formate | 2026-11-12 |
| DML-Leser je Issue als gemeinsamer Baustein (auch PROJ-1/13/15) | Wiederverwendung | 2026-11-12 |
| Regelgruppen als unabhängige Prüfungen, je Quelle aktivierbar | Testbarkeit | 2026-11-12 |
| ISO 639-1 / 3166-1 Alpha-2 als feste Listen im Projekt | Keine Zusatzabhängigkeit für statische Daten | 2026-11-12 |
| PapaParse für CSV lesen/schreiben | Robuste CSV-Behandlung; auch PROJ-9/14/18 | 2026-11-12 |
| Prüfbericht als CSV (Semikolon, UTF-8 mit BOM) herunterladbar | Excel-tauglich, gleiche Konventionen wie PROJ-9 | 2026-11-12 |
| Gemeinsame Prüfbericht-Anzeige für PROJ-10/11/13 | Einheitliche Darstellung | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Das Regelwerk ist ein **Prüfbaustein ohne eigene Seite**. Er läuft vollständig im Browser und wird von Check-in (PROJ-10) und REPLY-Import (PROJ-13) aufgerufen. Damit Check-in (CSV) und REPLY (XML in drei Issue-Formaten) dieselben Regeln nutzen, werden beide Dateiarten zuerst in ein **gemeinsames Prüfformat** übersetzt; erst danach laufen die Regeln. Ergebnis ist ein **Prüfbericht**, den eine gemeinsame Anzeige darstellt (auch für PROJ-11). Kein Backend nötig — nur die XSD-Prüfung (PROJ-11) läuft auf dem Server.

### A) Ablauf
```
Check-in (PROJ-10)                         REPLY-Import (PROJ-13)
  CSV-Datei                                  XML-Datei
     │                                          │  (vorher XSD-Prüfung, PROJ-11)
  CSV-Leser                                  DML-Leser je Issue (2.3 / 4.2 / 5.0)
  + Strukturprüfung (Gruppe S)                  │
  + Auffüllen führender Nullen (Hinweise)       │
     └──────────────► gemeinsames Prüfformat ◄──┘
                      (Kopf + Einträge mit Zeile/Position)
                                 │
                       Regelwerk (Gruppen A–K)
                       + Prüfkontext (System, DMRL, Stand vor Check-out
                         bzw. letzter SEND, Archiv)
                                 │
                            Prüfbericht
             (Fehler + Hinweise, Zusammenfassung neu/geändert/…)
                                 │
                     Prüfbericht-Anzeige + Download
```

### B) Bausteine
| Baustein | Aufgabe | Auch genutzt von |
|---|---|---|
| **CSV-Leser** | liest Semikolon-CSV (UTF-8, mit/ohne BOM, Anführungszeichen), prüft Kopfzeile (Gruppe S), überspringt Leerzeilen | — (Schreiben derselben CSV: PROJ-9/14/18) |
| **DML-Leser je Issue** | liest Kopf und Einträge einer DML-Datei in 2.3, 4.2 oder 5.0 laut `docs/dmrl-mapping.md` in das gemeinsame Format | PROJ-13, PROJ-15 (Anzeige archivierter Stände), PROJ-1 (Demo-Einträge) |
| **Prüfkontext** | stellt bereit: MI des Systems, DML-Typ, Stand vor dem Check-out (Sperre) bzw. Einträge und Kopf des letzten SEND, Empfänger, archivierte REPLYs | — |
| **Regelwerk** | Gruppen A, B, C, D, E, I (beide), F, K (Check-in), G, H (REPLY); jede Gruppe einzeln, alle laufen vollständig durch | — |
| **Code-Listen** | ISO 639-1 (Sprachen) und ISO 3166-1 Alpha-2 (Länder) als feste Listen im Projekt | Formularprüfungen bei Bedarf |
| **Meldungskatalog** | alle deutschen Meldungstexte an einer Stelle | — |
| **Prüfbericht** | Liste der Befunde: Art (Fehler/Hinweis), Zeile bzw. Position, DMC, Feld, Regelgruppe, Meldung mit gefundenem Wert; dazu Zusammenfassung | PROJ-10, 11, 13 |
| **Prüfbericht-Anzeige** | Überschrift mit Anzahl, Tabelle der Befunde (gruppierbar nach Zeile/Regel), bei > 100 seitenweise, Button „Bericht herunterladen" | PROJ-10, 11, 13 |

### C) Komponentenstruktur (Anzeige)
```
Prüfbericht-Anzeige (eingebettet in Check-in- bzw. REPLY-Dialog)
+-- Kopf: „[n] Fehler · [m] Hinweise" bzw. „Prüfung bestanden"
+-- Umschalter: nach Zeile / nach Regel (shadcn Tabs)
+-- Tabelle der Befunde (shadcn Table, seitenweise ab 100)
|   +-- Art (Badge Fehler/Hinweis) · Zeile · DMC · Feld · Regel · Meldung
+-- „Bericht herunterladen"
```

### D) Datenmodell (in Klartext)
Das Regelwerk **speichert nichts**. Ein Prüfbericht existiert nur, solange der Dialog offen ist; der Download erzeugt eine Datei. Im Verlauf wird nur die Anzahl der Fehler festgehalten (PROJ-15).

**Gemeinsames Prüfformat:** Kopf (bei REPLY: Richtung, `dmlc`, `dmlref`, DML-Typ, Bemerkung) und Einträge mit allen 27 Feldern als Text plus Herkunft (CSV-Zeilennummer bzw. Position im XML).

**Downloadformat des Berichts:** CSV mit Semikolon und UTF-8 mit BOM (öffnet direkt in Excel, gleiche Konventionen wie PROJ-9); Dateiname z. B. `Pruefbericht-PHUNGUN-2026-11-12.csv`.

### E) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Prüfung im Browser | Daten liegen im Browser; schnell; kein Server nötig. |
| Gemeinsames Prüfformat vor den Regeln | Jede Regel existiert genau einmal und gilt für CSV und alle drei XML-Issues gleich. |
| DML-Leser je Issue als eigener Baustein | Wird auch für Archiv-Anzeige und Demo-Daten gebraucht; neue Issues ließen sich ergänzen. |
| Regelgruppen als einzelne, unabhängige Prüfungen | Einzeln testbar; Check-in und REPLY schalten nur die passenden Gruppen ein. |
| ISO-Codelisten fest im Projekt statt Zusatzpaket | Listen ändern sich praktisch nie; keine Abhängigkeit für zwei kleine Tabellen. |
| CSV-Paket **PapaParse** statt Eigenbau | Bewährt für Anführungszeichen, Zeilenumbrüche in Werten, BOM; dieselbe Bibliothek erzeugt die CSV in PROJ-9/14/18. |
| Bericht als CSV herunterladbar | Öffnet in Excel, lässt sich an den Empfänger weitergeben. |
| Meldungen zentral gesammelt | Einheitliche Formulierungen, einfache Anpassung. |

### F) Abhängigkeiten (Pakete)
- **papaparse** — CSV lesen und schreiben (Anführungszeichen, BOM, Semikolon); dazu die Typdefinitionen für TypeScript.
- Sonst keine neuen Pakete (XML lesen mit dem eingebauten Browser-XML-Leser, wie PROJ-1).

### G) Testbarkeit
- Unit-Tests je Regelgruppe mit kleinen Beispieldateien (gültig/ungültig je Akzeptanzkriterium).
- DML-Leser: PHUNGUN-Beispieldateien (2.3), S1000DBIKE-Beispiel (4.2), 5.0 sobald Beispiel vorliegt.
- Gesamttests: Demo-REPLY (fehlerfrei, 30/2), unveränderter Check-in der Demo-DMRLs (fehlerfrei), Demo-Testdatei 4 (Regelwerk-Fehler).
- Performance: 1.000 Einträge unter 1 Sekunde.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-8`_

**Umgesetzt** (`src/lib/rules/check/`, alles im Browser, speichert nichts)
- `types.ts` — gemeinsames Prüfformat (Kandidat mit Zeile/Position + 27 Feldern), Befunde (Fehler/Hinweis, Regelgruppe, Zeile, DMC, Feld, Meldung), Prüfbericht.
- `csv-reader.ts` — CSV-Leser mit **PapaParse** (Semikolon, UTF-8 mit/ohne BOM, Anführungszeichen), Gruppe S (fehlende/unbekannte/doppelte/vertauschte Spalten → Abbruch, falsche Spaltenzahl, leere Zeilen übersprungen, „keine Einträge"), Randleerzeichen entfernt, **Auffüllen führender Nullen** (security, issno, day, month) als Hinweis.
- `entry-rules.ts` — Gruppen A (Formate inkl. Datum, ISO 639-1 / 3166-1), B (Pflichtfelder Check-in bzw. REPLY mit optionalen Ausgabedaten), C, D, E, I.
- `checkin.ts` — **Abgleich** mit dem Stand beim Check-out (über DMC; neu/geändert/unverändert, fehlende Einträge — von PROJ-10 wiederverwendbar), Gruppen F und K, `runCheckinCheck` mit Zusammenfassung.
- `reply.ts` — Gruppen G (Kopf: Richtung, MI, DML-Typ, Status, Absender, Bezug auf letzten SEND, Duplikat; Einträge: gleiche DMCs, keine Feldänderungen außer Antworten, fehlende Ausgabedaten erlaubt) und H, `runReplyCheck` mit Zusammenfassung.
- `report.ts` + `src/components/check/check-report-view.tsx` — Prüfbericht-Anzeige (Sortierung nach Zeile/Regel, über 100 Meldungen gekürzt mit „Weitere anzeigen", Download als CSV mit BOM).
- `src/lib/rules/iso-codes.ts` — feste ISO-Listen (183 Sprachen, 249 Länder).
- `src/lib/data/dml-parser-4x.ts` + `dml-reader.ts` — **DML-Leser für Issue 4.2/5.0** und gemeinsamer Einstieg je Issue (an den Beispieldateien geprüft).
- Gemeinsame Bausteine für PROJ-9 ff.: `src/lib/files/csv-writer.ts` (CSV-Schreiber, Rundlauf Schreiben → Lesen geprüft), `src/lib/files/download.ts`.

**Tests**: 50 neue (Check-in 29, REPLY 9, Bericht 3+3, CSV-Schreiber 3, DML-Leser 4.2/5.0 3) — insgesamt 254 Tests grün. Akzeptanzkriterien „Demo-Datei 02 fehlerfrei gegen passenden SEND" und „unveränderter Check-in PHUNGUN fehlerfrei" sind als Tests abgedeckt (Datei 02 gegen den Demo-Stand wird erwartungsgemäß abgelehnt; die Demo-REPLY auf SEND 00002 ist fehlerfrei).

**Abweichungen / Hinweise**
- Eintragstyp, DM-Ausgabetyp und Antworten werden nur in Kleinschreibung akzeptiert; DMC-Teile in beliebiger Groß-/Kleinschreibung (alphanumerisch).
- Zeilennummern im CSV-Bericht entsprechen den Dateizeilen; bei Werten mit Zeilenumbruch innerhalb von Anführungszeichen können sie abweichen.
- Paket **papaparse 5.5.3** (+ `@types/papaparse`) hinzugefügt. `npm audit` meldet bestehende Schwachstellen in Paketen der Projektvorlage (nicht in papaparse) — vor einer Weitergabe prüfen.
- Keine eigene Seite; die Anzeige wird mit PROJ-10/11/13 eingebunden.

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
- [x] Dateistruktur (6/6), Format & Pflicht (12/12), Fachliche Zusammenhänge (6/6), Eintragstyp & Antwortfelder (6/6), REPLY gegen letzten SEND (9/9), Antworten vollständig (3/3), Prüfergebnis (7/7) — Unit (`checkin.test.ts`, `reply.test.ts`, `qa-proj7-10.test.ts`) + Dialogtests
- [x] Nachweis neu in dieser QA: REPLY mit `security` = `1` → Formatfehler (kein Auffüllen); Datei einer anderen DMRL scheitert an D und F
- [x] Zusammenfassung Check-in zeigt geprüft/neu/geändert/unverändert (Festlegung PROJ-10 statt „Löschung")

### Edge Cases Status
- [x] Führende Nullen (Auffüllen nur security/issno/day/month), Groß-/Kleinschreibung (`N` ungültig), Leerzeichen am Rand entfernt, E/I über alle Einträge, viele Fehler (Anzeige 100 + „Weitere anzeigen", Download alle), erster REPLY, abweichende Ausgabedaten im REPLY (Fehler G), Datei einer anderen DMRL

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Empfänger-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 49/49 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

### QA-Lauf 4 — Refinement Regel K (2026-11-14)
- [x] Regel K meldet keine Fehler mehr, liefert die Abweichungen; Regel A prüft `answer` weiterhin; Regel F unverändert — getestet zusammen mit PROJ-10 (Details dort, QA-Lauf 4)
- [x] **BUG-QA4-1 (Medium) — behoben 2026-11-14 (`/frontend bug-qa4-1`, Bestätigung durch `/qa` ausstehend)** betrifft Regel F: Das Entfernen des Eintragstyps gilt nicht als fachliche Änderung, dadurch entstehen Einträge *in Bearbeitung* ohne Eintragstyp (Beschreibung in PROJ-10)
- **Production Ready:** YES (keine Critical/High-Bugs)

### QA-Lauf 5 — Bestätigung BUG-QA4-1 (2026-11-14)
- [x] Regel F erweitert: kein Eintrag *in Bearbeitung* ohne Eintragstyp (entfernter Typ, Altbestand); freigegebene unveränderte Einträge ohne Typ erlaubt (Unit, E2E; Details PROJ-10 QA-Lauf 5)
- **Offene Bugs:** keine · **Production Ready:** YES

## Deployment
_To be added by /deploy_
