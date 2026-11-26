# PROJ-9: Check-out (MS-Excel)

## Status: In Review
**Created:** 2026-11-12
**Last Updated:** 2026-11-26

> **Refinement 2026-11-26 — `dmc` und Informationsfelder (37 Spalten):** Vorgabe Product Owner. Nach `remarks` kommen neun Spalten hinzu: `dmc`, `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm`. `dmc` wird beim Erzeugen der Datei aus den DMC-Teilen gebildet (Schreibweise wie in der Anwendung, z. B. `PHUNGUN-A-A05-40-0000-01A-000A-A`), nie gespeichert und beim Check-in ignoriert. Die acht übrigen Felder sind **rein informativ**: vom Bearbeiter in Excel gepflegt, je Eintrag gespeichert, beim nächsten Check-out wieder ausgegeben, **ohne Prüfung**; eine Änderung nur an ihnen ist keine fachliche Änderung (Status, Eintragstyp, Freigabe bleiben). Gilt für Check-out, Check-in, Export CSV/Excel (PROJ-18) und Freigabestand-CSV (PROJ-14); nicht für SEND/REPLY-XML. **Ausnahme (Refinement PROJ-20, 2026-11-26, BUG-QA13-1):** die CSV des Werkzeugs (PROJ-20) hat 28 Spalten ohne `dmc` und Informationsfelder. Dateien mit 28/27 Spalten bleiben beim Check-in gültig. Keine Anzeige in der DMRL-Ansicht. Details zum Check-in → PROJ-10, Spaltenaufbau → PROJ-8 (Gruppe S). Geänderte Stellen sind mit *(Refinement 2026-11-26)* markiert.

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
| Zeile 1 | die **37** Feldnamen in fester Reihenfolge (PROJ-8, Gruppe S), je Feld eine Spalte: `dmentryType`, `modelic`, `sdc`, `chapnum`, `section`, `subsect`, `subject`, `discode`, `discodev`, `incode`, `incodev`, `itemloc`, `techname`, `infoname`, `language`, `country`, `security`, `rpc`, `rpcname`, `issno`, `type`, `day`, `month`, `year`, `answer`, `answer_comment`, `answer_timestamp`, `remarks`, `dmc`, `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm` *(Refinement 2026-11-26 — bisher 28, neu ab `dmc`)* |
| ab Zeile 2 | je Eintrag eine Zeile, **alle** Einträge (auch Eintragstyp `d` und DM-Ausgabetyp `deleted`), sortiert nach DMC |
| Werte | wie in der Anwendung gespeichert, mit führenden Nullen; `answer`/`answer_comment`/`answer_timestamp` zur Information enthalten; `dmc` berechnet, Informationsfelder wie gespeichert (anfangs leer) *(Refinement 2026-11-26)* |
| Zellformat | **alle Zellen als Text** — auch die leeren Zellen der 37 Spalten *(Refinement 2026-11-26)*, sodass neu eingetippte Werte ebenfalls Text bleiben (`01` bleibt `01`, keine Datums-/Zahlenumwandlung) *(Refinement 2026-11-25)* |
| Komfort | Kopfzeile fett und fixiert, Autofilter auf der Kopfzeile, Spaltenbreiten an den Inhalt angepasst (wie PROJ-18) *(Refinement 2026-11-25)* |
| Formelschutz | Werte, die mit `=`, `+`, `-` oder `@` beginnen, sind Textzellen und werden nie als Formel ausgewertet — **kein** vorangestelltes `'` wie in der CSV (BUG-QA2-1) *(Refinement 2026-11-25)* |
| Umlaute/Sonderzeichen | ohne Kodierungsfragen korrekt (kein BOM nötig) *(Refinement 2026-11-25)* |
| DMRL ohne Einträge | nur Kopfzeile |

**Führende Nullen / Excel:** Da alle Zellen Text sind, bleiben führende Nullen in Excel erhalten *(Refinement 2026-11-25)*. Gehen sie trotzdem verloren (z. B. Werte aus einem anders formatierten Blatt hineinkopiert oder eine CSV eingecheckt), werden beim Check-in bei `security`, `issno`, `day`, `month` fehlende führende Nullen weiterhin **aufgefüllt** und im Prüfbericht als Hinweis genannt (PROJ-8, Gruppe A). DMC-Teile werden nicht aufgefüllt.

## Neue Spalten `dmc` und Informationsfelder *(Refinement 2026-11-26)*
| Spalte | Inhalt | Gepflegt von | Gespeichert | Prüfung |
|---|---|---|---|---|
| `dmc` | aus `modelic`, `sdc`, `chapnum`, `section`, `subsect`, `subject`, `discode`, `discodev`, `incode`, `incodev`, `itemloc` — Schreibweise wie in der Anwendung (DMRL-Ansicht, Prüfberichte): `{modelic}-{sdc}-{chapnum}-{section}{subsect}-{subject}-{discode}{discodev}-{incode}{incodev}-{itemloc}`, z. B. `PHUNGUN-A-A05-40-0000-01A-000A-A` | Anwendung (beim Erzeugen jeder Datei neu gebildet) | nein — Wert aus einer eingecheckten Datei wird ignoriert (wie `answer_timestamp`) | keine |
| `orig` | erwarteter Inhalt: CAGE-Code (5 Zeichen, alphanumerisch, wie PROJ-4) | Bearbeiter | ja, je Eintrag | **keine** |
| `applic_type`, `applic_model`, `applic_version` | alphanumerisch | Bearbeiter | ja, je Eintrag | **keine** |
| `rfu` | alphanumerisch | Bearbeiter | ja, je Eintrag | **keine** |
| `dtd-schema` | alphanumerisch | Bearbeiter | ja, je Eintrag | **keine** |
| `spec` | alphanumerisch | Bearbeiter | ja, je Eintrag | **keine** |
| `io-pm` | alphanumerisch | Bearbeiter | ja, je Eintrag | **keine** |

- „CAGE-Code“ und „alphanumerisch“ beschreiben nur den erwarteten Inhalt: Werte werden so übernommen, wie sie in der Datei stehen — leer erlaubt, keine Fehler, keine Hinweise, keine automatische Korrektur (z. B. keine Großschreibung). Unzulässige Steuerzeichen werden wie bei allen Feldern entfernt; Textzellen/Formelschutz gelten auch hier.
- Die Informationsfelder sind **rein informativ**: Eine Änderung nur an ihnen macht einen Eintrag nicht „geändert“ — Status, Eintragstyp und Freigabe der DMRL bleiben; die Werte werden trotzdem übernommen (Details PROJ-10).
- Bestehende Einträge und Demo-Daten haben die Informationsfelder anfangs **leer**.
- Die Felder erscheinen **nicht** in der SEND-XML und werden vom REPLY-Import nicht verändert.
- Die Felder werden **nicht** in der DMRL-Ansicht angezeigt (s. Open Questions).

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
- Als **Bearbeiter** möchte ich zu jedem Eintrag Informationen wie Originator (`orig`), Applicability, `rfu`, DTD/Schema, Spezifikation und IO-PM in der Excel-Datei pflegen, damit sie beim nächsten Check-out wieder da sind — ohne dass sich dadurch Status oder Freigabe ändern *(Refinement 2026-11-26)*.
- Als **Bearbeiter** möchte ich den vollständigen DMC je Zeile in einer Spalte sehen, damit ich in Excel danach suchen und filtern kann *(Refinement 2026-11-26)*.
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
- Prüfung der Informationsfelder (Format CAGE-Code, alphanumerisch) beim Check-out oder Check-in *(Refinement 2026-11-26)*
- Bearbeiten von `dmc` — Änderungen an der Spalte werden ignoriert; der DMC ändert sich nur über die DMC-Teile *(Refinement 2026-11-26)*
- Anzeige/Bearbeitung der Informationsfelder in der Anwendung (DMRL-Ansicht PROJ-7) *(Refinement 2026-11-26)*
- Informationsfelder in SEND-/REPLY-XML und XML-Export *(Refinement 2026-11-26)*

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

### `dmc` und Informationsfelder *(Refinement 2026-11-26)*
- [ ] Angenommen eine DMRL wird ausgecheckt, wenn die Datei geöffnet wird, dann enthält Zeile 1 genau 37 Feldnamen; Spalten 1–28 wie bisher, danach `dmc`, `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm`
- [ ] Angenommen ein Eintrag hat die DMC-Teile `modelic` `PHUNGUN`, `sdc` `A`, `chapnum` `A05`, `section` `4`, `subsect` `0`, `subject` `0000`, `discode` `01`, `discodev` `A`, `incode` `000`, `incodev` `A`, `itemloc` `A`, wenn ausgecheckt wird, dann steht in `dmc` `PHUNGUN-A-A05-40-0000-01A-000A-A` — derselbe DMC wie in der DMRL-Ansicht
- [ ] Angenommen eine bestehende DMRL wurde noch nie mit Informationsfeldern eingecheckt, wenn sie ausgecheckt wird, dann sind `orig` bis `io-pm` leer
- [ ] Angenommen der Bearbeiter trägt in Excel `orig` = `D0815` und `applic_model` = `GTF-A` ein und checkt ein, wenn danach erneut ausgecheckt wird, dann stehen diese Werte wieder in der Datei
- [ ] Angenommen eine freigegebene DMRL wird ausgecheckt und **nur** Informationsfelder werden geändert, wenn eingecheckt wird, dann werden die Werte übernommen, die betroffenen Einträge gelten als unverändert (kein Eintragstyp nötig), und die DMRL bleibt „freigegeben“ (Details PROJ-10)
- [ ] Angenommen der Bearbeiter ändert in Excel den Wert in `dmc`, wenn eingecheckt wird, dann wird der Wert ignoriert (kein Fehler, keine Änderung); beim nächsten Check-out steht wieder der aus den DMC-Teilen gebildete DMC
- [ ] Angenommen ein Informationsfeld enthält einen beliebigen Wert (z. B. `orig` = `abc`, `rfu` = `x/1 ä`), wenn eingecheckt wird, dann gibt es keinen Fehler und keinen Hinweis, und der Wert wird unverändert gespeichert
- [ ] Angenommen ein Informationsfeld beginnt mit `=`, wenn die Datei in Excel geöffnet wird, dann wird er als Text angezeigt und beim Check-in unverändert gelesen
- [ ] Angenommen ein Eintrag hat Informationsfelder, wenn ein SEND erzeugt wird, dann enthält die XML diese Felder nicht und ist XSD-gültig (PROJ-12 unverändert)
- [ ] Angenommen eine DMRL hat 1.000 Einträge, wenn ausgecheckt wird, dann wird die Excel-Datei mit 37 Spalten weiterhin in unter einer Sekunde erzeugt

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
- **Offener Check-out aus der Zeit vor den Informationsfeldern:** erneuter Download liefert die Datei mit 37 Spalten (Informationsfelder leer, `dmc` gefüllt); eine bereits heruntergeladene Datei mit 28 Spalten wird beim Check-in weiter angenommen, gespeicherte Informationsfelder bleiben dann unverändert (PROJ-10) *(Refinement 2026-11-26)*.
- **Bearbeiter löscht eine Informationsspalte in Excel oder stellt Spalten um:** Spaltenaufbau stimmt nicht → Fehler beim Check-in wie bisher (PROJ-8, Gruppe S) *(Refinement 2026-11-26)*.
- **Bearbeiter leert ein Informationsfeld:** leerer Wert wird übernommen *(Refinement 2026-11-26)*.
- **`dmc` passt nicht zu den DMC-Teilen (z. B. DMC-Teil in Excel geändert, `dmc` nicht):** maßgeblich sind allein die DMC-Teile — Zuordnung und Prüfung wie bisher (PROJ-8/10); `dmc` wird nicht ausgewertet *(Refinement 2026-11-26)*.
- **Admin ändert DMRL-Kopfdaten (Sicherheitseinstufung) während der Sperre:** erlaubt; betrifft nicht die Einträge.
- **Demo-Daten neu laden während einer Sperre:** Sperren der Demo-Daten gelten (PROJ-1); offene Check-outs gehen verloren.
- **Zwei Tabs gleichzeitig „Check-out":** der zweite Versuch erkennt die bestehende Sperre (Prototyp, letzter Speicherstand gilt, PROJ-1).

## Technical Requirements (optional)
- Download direkt im Browser, keine Serverfunktion nötig, offline lauffähig (Windows-Offline-Paket)
- Excel-Erzeugung für 1.000 Einträge in unter einer Sekunde *(Refinement 2026-11-25)*
- Kein neues Paket nötig, falls der Excel-Schreiber aus PROJ-18 genutzt wird — Bestätigung in `/architecture` *(Refinement 2026-11-25)*

## Open Questions
- [ ] Soll PROJ-20 (XML-Prüfung) künftig ebenfalls eine Excel-Datei statt/neben der CSV liefern? → eigenes Refinement von PROJ-20; bis dahin wird die CSV aus PROJ-20 beim Check-in weiter angenommen (2026-11-25)
- [ ] Sollen die Informationsfelder (und `dmc`) künftig in der DMRL-Ansicht angezeigt oder dort bearbeitet werden? → bei Bedarf eigenes Refinement von PROJ-7 (2026-11-26)
- [x] Welche Schreibweise hat `dmc`? → wie in der Anwendung (S1000D), nicht jedes Feld einzeln getrennt (2026-11-26)
- [x] Werden die Informationsfelder geprüft? → Nein, weder beim Check-out noch beim Check-in (2026-11-26)
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
| Neue Spalten `dmc`, `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm` (37 statt 28 Spalten) | Vorgabe Product Owner | 2026-11-26 |
| Alle neuen Spalten ans Ende nach `remarks`, beginnend mit `dmc`; Spalten 1–28 unverändert | Vorgabe Product Owner; bestehender Aufbau bleibt stabil | 2026-11-26 |
| `dmc` in der Schreibweise der Anwendung (S1000D), berechnet, nie gespeichert, beim Check-in ignoriert | Bearbeiter sieht denselben DMC wie in der Anwendung; keine zweite Quelle für den DMC | 2026-11-26 |
| Informationsfelder je Eintrag gespeichert und beim nächsten Check-out wieder ausgegeben | Sonst gingen die Eingaben nach jedem Zyklus verloren | 2026-11-26 |
| Keine Prüfung der Informationsfelder („CAGE-Code“, „alphanumerisch“ nur beschreibend) | Vorgabe Product Owner — rein informativ | 2026-11-26 |
| Änderung nur an Informationsfeldern = keine fachliche Änderung (Status, Eintragstyp, Freigabe bleiben); Hinweis in der Check-in-Zusammenfassung | Rein informativ; Freigabe soll nicht an Zusatzinformationen hängen; Übernahme bleibt nachvollziehbar | 2026-11-26 |
| Gleicher 37-Spalten-Aufbau für Check-out, Check-in, Export CSV/Excel, Freigabestand-CSV; nicht in XML — PROJ-20 seit 2026-11-26 (2) mit 28 Spalten (BUG-QA13-1) | Ein Aufbau für alle Dateien; exportierte CSV bleibt eincheckbar; S1000D-XML unverändert | 2026-11-26 |
| Dateien mit 28/27 Spalten beim Check-in weiter gültig; Informationsfelder bleiben dann unverändert | Offene Check-outs und ältere Exporte; Datei sagt zu den Feldern nichts aus | 2026-11-26 |
| Keine Anzeige der Informationsfelder in der DMRL-Ansicht | Minimaler Umfang; Pflege über Excel | 2026-11-26 |
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
| Informationsfelder als zusätzliche Felder des Eintrags (36 gespeicherte Felder), fehlende Werte = leer, keine Datenumstellung | Wandern automatisch durch Sperre, Freigabestand, REPLY-Übernahme; bestehende Daten sofort gültig | 2026-11-26 |
| `dmc` nur beim Schreiben einer Datei aus der vorhandenen DMC-Formatierung berechnet | Eine Quelle für den DMC | 2026-11-26 |
| Getrennte Listen: gespeicherte Felder, Dateispalten (37), Gruppe Informationsfelder — an einer Stelle | Schreiben, Lesen, Vergleichen laufen nicht auseinander | 2026-11-26 |
| Check-in-Vergleich bewertet Informationsfelder getrennt (wie Antwortfelder); eigener Zähler | Status-/Freigabe-Logik unberührt; Übernahme nachvollziehbar | 2026-11-26 |
| REPLY-Prüfung Gruppe G nimmt Informationsfelder aus | Empfänger-XML enthält die Felder nicht — sonst Fehler bei jedem REPLY | 2026-11-26 |
| Gruppe S: 37/28/27 Spalten gültig; sobald eine neue Spalte vorkommt, volle 37er-Fassung erwartet | Klare Regel, unvollständige Dateien werden erkannt | 2026-11-26 |
| PROJ-9 und PROJ-10 gemeinsam umsetzen (ein `/frontend`-Lauf) | Gemeinsame Spaltenliste; Check-out mit 37 Spalten braucht den angepassten Check-in | 2026-11-26 |

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

### J) Refinement 2026-11-26 — `dmc` und Informationsfelder (37 Spalten)
Ergänzt A–I; Sperre, Verfügbarkeitsregeln, Dialoge und Abläufe bleiben unverändert. Weiterhin alles im Browser, kein Backend, offline lauffähig. Das Design deckt Check-out **und** Check-in ab (PROJ-10), da beide dieselbe Spaltenliste nutzen.

**Komponenten**
```
Keine neuen Bildschirme, Dialoge oder shadcn-Komponenten.
Check-in-Dialog (PROJ-10) — Zusammenfassung
+-- neuer Hinweis „Informationsfelder bei N Einträgen aktualisiert"
+-- „Keine Änderungen"-Text nur noch, wenn auch keine Informationsfelder abweichen
+-- Prüfbericht: Hinweis „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten" (28/27 Spalten)
DMRL-Ansicht / Detailfenster: unverändert (Felder werden nicht angezeigt)
```

**Datenmodell (in Klartext)**
- Jeder Eintrag erhält **acht zusätzliche Textfelder** neben den bisherigen 28: `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm`. Sie liegen bei den übrigen Feldern des Eintrags und wandern deshalb automatisch überall mit, wo heute Einträge kopiert werden: Sperre (Stand beim Check-out), Freigabestand, REPLY-Übernahme.
- **Keine Umstellung gespeicherter Daten:** Fehlt ein Feld in vorhandenen Daten (alle bisherigen Einträge, Demo-Daten, offene Sperren, Freigabestände), gilt es als leer — gleiches Vorgehen wie bei `answer_timestamp` (2026-11-21). Die Version des Datenformats bleibt.
- **`dmc` wird nicht gespeichert.** Es entsteht nur beim Schreiben einer Datei aus der vorhandenen DMC-Formatierung der Anwendung (dieselbe wie in Ansicht, Prüfbericht und Sortierung).

**Zwei Listen an einer Stelle**
| Liste | Inhalt | Verwendet von |
|---|---|---|
| Gespeicherte Felder eines Eintrags | 28 bisherige + 8 Informationsfelder | Datenhaltung, Kopien, Check-in-Übernahme |
| Spalten einer Datei | 28 bisherige · `dmc` · 8 Informationsfelder (= 37) | CSV-Schreiber, Excel-Baustein „Einträge", CSV-/Excel-Leser (Gruppe S) |
| Gruppe „Informationsfelder" | die 8 Felder | Vergleich beim Check-in, Ausnahme in der REPLY-Prüfung |

Alle drei stehen in der gemeinsamen Definition neben der bisherigen Spaltenliste — Schreiben, Lesen und Vergleichen können nicht auseinanderlaufen.

**Dateien schreiben (Check-out, Export, Freigabestand, PROJ-20)**
- CSV-Schreiber und Excel-Baustein schreiben die 37 Spalten; `dmc` je Zeile berechnet, Informationsfelder wie gespeichert. Der Excel-Schreiber selbst bleibt unverändert (Textzellen, Spaltenbreite, Autofilter jetzt bis Spalte AK).
- PROJ-20 nutzt denselben CSV-Schreiber → `dmc` gefüllt, Informationsfelder leer (der XML-Leser kennt sie nicht).
- Freigabestand-CSV aus dem gespeicherten Freigabestand → Informationsfelder zum Zeitpunkt der Freigabe; ältere Freigabestände leer.

**Dateien lesen (Check-in, PROJ-10)**
- Der Spaltenaufbau (Gruppe S) kennt drei gültige Fassungen: **37** (aktuell), **28** (Stand 21.11.) und **27** (ohne `answer_timestamp`). Kommt irgendeine der neuen Spalten vor, wird die volle 37er-Fassung erwartet; fehlt dann eine → Fehler „Spalte … fehlt" wie bisher.
- `dmc` wird gelesen und verworfen. Die Zuordnung der Einträge bleibt bei den DMC-Teilen.
- Das Leseergebnis merkt sich, ob die Datei Informationsfelder hatte; ohne sie → Hinweis im Prüfbericht.
- Formelschutz-Apostroph (nur CSV), Trimmen und Entfernen von Steuerzeichen gelten für alle Spalten. **Kein** Auffüllen führender Nullen und keine sonstige Prüfung für die Informationsfelder.

**Vergleich und Übernahme beim Check-in**
- Der Vergleich Datei ↔ Stand beim Check-out bewertet die Informationsfelder **getrennt** — analog zu den Antwortfeldern: Abweichungen dort machen einen Eintrag nicht „geändert", sondern setzen nur eine Markierung „Informationsfelder abweichend".
- Übernahme:
  - Datei **mit** Informationsfeldern: Werte aus der Datei werden für alle Einträge übernommen (auch für neue und für fachlich geänderte).
  - Datei **ohne** Informationsfelder: bestehende Einträge behalten ihre gespeicherten Werte, neue Einträge erhalten leere.
- Status-Logik unverändert: nur Abweichungen nur in Informationsfeldern → Eintragsstatus, DMRL-Status und Freigabe bleiben; kein Eintragstyp verlangt (Gruppe F sieht die Felder nicht).
- Zusammenfassung und Verlauf: zusätzlicher Zähler „Informationsfelder bei N Einträgen aktualisiert"; ein Check-in mit nur solchen Abweichungen gilt nicht als „Keine Änderungen", sondern übernimmt die Werte und hebt die Sperre auf.

**REPLY und SEND (PROJ-12/13) — nur Schutz, keine Funktionsänderung**
- SEND-/XML-Schreiber nutzen nur die S1000D-Felder → Informationsfelder nie in der XML; XSD-Gültigkeit unverändert.
- REPLY-Prüfung Gruppe G (Feldvergleich REPLY ↔ SEND) **nimmt die Informationsfelder aus** — sonst meldete jeder REPLY Abweichungen, weil die Empfänger-XML die Felder nicht enthält (der Vergleich läuft heute über alle Felder).
- REPLY-Übernahme ändert nur Antwortfelder und Eintragstyp → Informationsfelder bleiben erhalten.

**Auswirkung auf bestehende Teile**
| Teil | Änderung |
|---|---|
| Gemeinsame Felddefinition | 8 Felder + Dateispaltenliste + Gruppe „Informationsfelder"; fehlende Werte = leer |
| CSV-Schreiber, Excel-Baustein „Einträge" | 37 Spalten, `dmc` berechnet |
| CSV-/Excel-Leser (Gruppe S) | drei gültige Fassungen, `dmc` verworfen, Merker „mit Informationsfeldern" |
| Check-in-Vergleich und -Übernahme | Informationsfelder getrennt bewertet, Übernahme/Erhalt laut oben, Zähler |
| Check-in-Dialog | Hinweis in der Zusammenfassung, „Keine Änderungen" angepasst |
| REPLY-Prüfung Gruppe G | Informationsfelder ausgenommen |
| Check-out-Workflow, Dialoge, Sperre | **unverändert** (Datei entsteht über den gemeinsamen Baustein) |
| Detailfenster / DMRL-Ansicht | unverändert |

**Technische Entscheidungen (für PM erklärt)**
| Entscheidung | Warum |
|---|---|
| Informationsfelder bei den übrigen Feldern des Eintrags speichern | Sie wandern ohne weitere Arbeit durch Sperre, Freigabestand und REPLY-Übernahme mit; keine zweite Datenstruktur, die vergessen werden kann. |
| Fehlende Werte gelten als leer, keine Datenumstellung | Bestehende Daten, offene Check-outs und Demo-Daten funktionieren sofort — bewährt bei `answer_timestamp`. |
| `dmc` nur beim Schreiben berechnen | Eine Quelle für den DMC (die DMC-Teile); keine Widersprüche zwischen Spalte und Teilen. |
| Dateispalten getrennt von gespeicherten Feldern definieren | `dmc` steht in der Datei, aber nicht im Speicher — beide Listen klar benannt. |
| Informationsfelder im Vergleich wie Antwortfelder getrennt bewerten | Gleiches Muster wie 2026-11-14; Status- und Freigabe-Logik bleibt unberührt. |
| Ausnahme in der REPLY-Prüfung | Verhindert falsche Fehler bei jedem REPLY. |
| Volle 37er-Fassung, sobald eine neue Spalte vorkommt | Klare Regel: entweder alter Aufbau oder vollständiger neuer; halbe Dateien werden erkannt. |

**Abhängigkeiten (Pakete)**
- **Keine neuen Pakete.**

**Testbarkeit**
- Unit: Dateispalten (37, Reihenfolge, `dmc` in Schreibweise der Anwendung); fehlende Informationsfelder in alten Daten → leer; CSV-/Excel-Schreiber mit Informationsfeldern und Formelwerten; Leser: 37/28/27 gültig, Teilmenge der neuen Spalten → Fehler, `dmc` verworfen; Vergleich: nur Informationsfelder abweichend → unverändert + Markierung; Übernahme mit/ohne Informationsspalten (Erhalt der gespeicherten Werte); freigegebene DMRL bleibt freigegeben; REPLY mit gespeicherten Informationsfeldern ohne G-Fehler und mit erhaltenen Werten; SEND-XML ohne die Felder, XSD-gültig (2.3/4.2/5.0); 1.000 Einträge < 1 s.
- Rundlauf: Check-out → Excel-Leser → Prüfung ohne Änderung; Informationsfelder eintragen → Check-in → erneuter Check-out enthält sie.
- Komponenten: Zusammenfassung mit Hinweis; „Keine Änderungen" nur ohne Abweichungen.
- E2E: Check-out-Datei mit 37 Spalten (Autofilter `A1:AK…`); Informationsfelder in der Datei ändern und einchecken → Status bleibt, Werte beim nächsten Check-out vorhanden; bestehende E2E-Tests, die Spaltenzahl oder Kopfzeile prüfen, werden auf 37 umgestellt.

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

### Refinement 2026-11-26 — `dmc` und Informationsfelder (37 Spalten)
_Stand 2026-11-26 — `/frontend PROJ-9` (Tech Design J, gemeinsam mit PROJ-10)_

**Umgesetzt**
- `src/lib/data/schema.ts` — 8 Informationsfelder am Ende der gespeicherten Felder (`ENTRY_FIELD_NAMES`, jetzt 36); `INFO_FIELD_NAMES`/`isInfoField`; `CORE_FIELD_NAMES` (die 28 bisherigen); `ENTRY_FILE_COLUMNS` (37 Dateispalten: 28 · `dmc` · 8). Fehlende Informationsfelder in gespeicherten Daten werden beim Laden leer ergänzt (Default) — keine Umstellung, Datenformat-Version unverändert.
- `src/lib/files/csv-writer.ts` — Eintrags-Tabelle (CSV und Excel) mit 37 Spalten; `dmc` je Zeile über `formatDmc`. Damit liefern Check-out, Export (CSV/Excel), Freigabestand-CSV und PROJ-20 automatisch den neuen Aufbau.
- `src/lib/rules/check/csv-reader.ts` — Gruppe S: 37/28/27 Spalten; kommt `dmc` oder ein Informationsfeld vor, wird die volle 37er-Fassung erwartet; `dmc` wird verworfen; Merker `hasInfoFields`, ohne Informationsfelder Hinweis „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten.“
- `src/lib/rules/check/checkin.ts` — Vergleich: Informationsfelder nicht in `changedFields`, eigene Markierung `infoChanged` (nur bei Dateien mit Informationsfeldern); Zusammenfassung mit `informationsfelder`.
- `src/lib/workflows/check-in.ts` — Übernahme: Werte aus der Datei; bei Dateien ohne Informationsfelder bisherige Werte (neue Einträge leer); Verlauf „…; Informationsfelder bei N Einträgen aktualisiert“. Status-Logik unverändert.
- `src/lib/rules/check/reply.ts` — Gruppe G nimmt Informationsfelder aus.
- `src/lib/dmrl/entries.ts` — Feldbezeichnungen für die 8 Felder (Prüfberichte).
- `src/components/workflows/check-in-dialog.tsx` — Hinweis (shadcn `Alert`) „Informationsfelder bei N Einträgen aktualisiert“; „Keine Änderungen“ nur ohne solche Abweichungen, sonst „Keine fachlichen Änderungen …“; Toast mit Zähler.
- Unverändert: Check-out-Workflow, Dialoge, Sperre, SEND-/XML-Schreiber, Detailfenster/DMRL-Ansicht.

**Tests**
- Neu: `src/lib/workflows/info-fields.test.ts` (11) — Dateiaufbau, `dmc`-Schreibweise, alte Daten → leer, nur Informationsfelder geändert (freigegeben bleibt, Rundlauf zum nächsten Check-out), fachlich + Informationsfelder, `dmc` ignoriert, 28-Spalten-Datei erhält Werte + Hinweis, Teilmenge → Fehler, beliebige Werte ohne Meldung, REPLY ohne G-Fehler und mit erhaltenen Werten, SEND-XML ohne die Felder.
- Neu: Komponententest im Check-in-Dialog (Hinweis, Übernahme); E2E in `tests/PROJ-9-10-excel.spec.ts` (37 Spalten, `dmc`, nur `orig` geändert → Status bleibt, Wert beim nächsten Check-out).
- Angepasst auf 37 Spalten: Unit-Tests zu CSV-Schreiber, Excel-Leser, Check-out, Export, Check-in (27er-Datei jetzt ohne die neuen Spalten), XML-Prüfung; E2E Autofilter `A1:AK11`, `PROJ-10-checkin-antworten`, `QA-proj10-12-13-refinement`.
- Gesamt: 705 Unit-Tests (59 Dateien) und 157 E2E-Tests grün; Lint ohne Fehler.

**Hinweise**
- Die MS-Excel-Testdatei (`tests/fixtures/PHUNGUN-ms-excel-aus-csv.xlsx`) hat weiterhin 28 Spalten und prüft damit den alten Aufbau.
- Manuelle Abnahme in MS Excel (37 Spalten, Informationsfelder eintippen, Rundlauf) → `/qa`.

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

### QA-Lauf 12 — Refinement 2026-11-25 (Check-out als MS-Excel)

**Tested:** 2026-11-25
**App URL:** http://localhost:3000 (`npm run dev`)
**Tester:** QA Engineer (AI)
**Testumfang:** PROJ-9 und PROJ-10 gemeinsam (Rundlauf Check-out → Excel → Check-in)
**Automatisiert:** Vitest 693 Tests ✅ (58 Dateien) · Playwright 156 Tests ✅ · Startskript-Tests ✅
**Browser:** Chromium (Desktop). Nur Desktop laut PRD; Firefox/Safari nicht installiert, nicht getestet.
**Nicht möglich in dieser Umgebung:** Öffnen in MS Excel (kein Excel installiert) → manuelle Bestätigung durch den Product Owner

#### Acceptance Criteria Status
- [x] Check-out (9/9): Bestätigung zeigt `…-{Jahr}.xlsx`, Download als Excel, Sperre, Abbrechen, Administrator, keine Berechtigung, fremde Sperre, Status *gesendet*, freigegeben bleibt, leere DMRL → nur Kopfzeile (Unit, Komponententest, E2E `PROJ-9-10-excel.spec.ts`)
- [x] Inhalt der Excel-Datei (12/12, davon 3 nur simuliert):
  - [x] Dateiname `DML-PHUNGUN-D0815-C-2026.xlsx` (Unit) · ⚠️ „ohne Reparaturmeldung in MS Excel“ → manuell zu bestätigen
  - [x] genau ein Blatt „Einträge“, Kopfzeile mit 28 Feldnamen (Unit, E2E)
  - [x] alle Einträge, sortiert nach DMC (Unit: 10/11 Zeilen; gemeinsamer Baustein mit Export)
  - [x] führende Nullen als Text (Unit, E2E)
  - [x] ⚠️ neue Zeile mit `01` bleibt Text: alle 28 Spalten haben das Textformat (`style="1"`, QA-Unit) → Tippen in Excel manuell zu bestätigen
  - [x] Kopfzeile fett/fixiert, Autofilter `A1:AB11` (E2E)
  - [x] Umlaute (Rundlauf-Unit)
  - [x] `=`, `+`, `-`, `@` als Textzelle, keine `<f>`-Zelle; übersteht den Check-in unverändert (E2E BUG-QA2-1 neu)
  - [x] `;`, `"`, Zeilenumbruch: Check-out → Check-in unverändert, keine Änderung (QA-Unit)
  - [x] `answer`, `answer_comment`, `answer_timestamp` enthalten (E2E `QA-proj10-12-13-refinement`)
  - [x] Demo-PHUNGUN unverändert eingecheckt fehlerfrei (Unit mit Demo-Stand; zusätzlich MS-Excel-Testdatei)
  - [x] ⚠️ Rundlauf über MS Excel: simuliert mit eigener Datei und mit der MS-Excel-Testdatei (Excels Speicherweise) → echter Rundlauf manuell zu bestätigen
- [x] Sperre aufheben (6/6): Zurücknehmen, „Excel-Datei erneut herunterladen“ (gleicher Name, gleicher Inhalt; nur für den Sperrinhaber), Admin hebt auf, andere sehen nichts, Freigabe bleibt, Sperre aus der CSV-Zeit → `.xlsx` (Unit: Datei aus jeder Sperr-Kopie)
- [x] Nachvollziehbarkeit (3/3): Verlauf, „im Workflow verwendet“, Sperre bleibt bei Benutzerwechsel und Neuladen (E2E `QA-proj9-10.spec.ts`)
- [x] Leistung: Excel-Datei mit 1.000 Einträgen < 1 s (QA-Unit)

#### Edge Cases Status
- [x] Download blockiert → „Excel-Datei erneut herunterladen“ · offener Check-out aus der CSV-Zeit · lange Feldinhalte (Breite begrenzt) · Rollenwechsel · zwei Tabs (unverändert)
- [ ] BUG-QA12-1: Excel-Erzeugung schlägt fehl → Sperre gesetzt, kein Download, keine Meldung (s. u.)
- [ ] Übernommen aus PROJ-18, betrifft jetzt auch den Check-out: BUG-QA11-1 (> 32 767 Zeichen je Zelle), BUG-QA11-3 (große DMRL ohne Rückmeldung), BUG-QA11-4 (grüne Dreiecke „Zahl als Text“). BUG-QA11-4 wird **relevanter**, weil Bearbeiter die Check-out-Datei jetzt tatsächlich in Excel bearbeiten.

#### Security Audit Results
- [x] Formel-Injection: Textzellen, keine Formeln; kein Apostroph nötig (E2E BUG-QA2-1 neu)
- [x] XSS: HTML aus einer Excel-Zelle wird in der Check-in-Zusammenfassung als Text angezeigt, kein Skript (E2E)
- [x] Zugriff: Aktionen unverändert über die Verfügbarkeitsregeln; „Excel-Datei erneut herunterladen“ nur für den Sperrinhaber (E2E)
- [x] Keine neuen Pakete, keine Server-Route
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend

#### Bugs Found

##### BUG-QA12-1: Check-out — Fehler bei der Excel-Erzeugung hinterlässt eine Sperre ohne Datei und ohne Meldung
- **Severity:** Low
- **Steps to Reproduce:**
  1. Einen Eintrag mit einem Feldwert mit rund 300 000 Zeilenumbrüchen einchecken (CSV < 5 MB; Ursache BUG-QA11-2 im Excel-Schreiber)
  2. „Check-out“ → „Auschecken“
  3. Expected: Datei wird heruntergeladen, oder eine Fehlermeldung erscheint (und die Sperre wird nicht gesetzt bzw. ist klar erklärt).
  4. Actual: Sperre wird gespeichert, dann bricht die Excel-Erzeugung mit „Maximum call stack size exceeded“ ab (Unit-Probe) — kein Download, keine Meldung, auch „Excel-Datei erneut herunterladen“ scheitert still. Ausweg: „Check-out zurücknehmen“. Mit CSV lief derselbe Bestand durch.
- **Hinweis zur Behebung:** Fehler beim Erzeugen/Herunterladen im Dialog abfangen und melden; BUG-QA11-2 (Spaltenbreite ohne `Math.max(...viele)`) beheben.
- **Priority:** Nice to have (unrealistische Daten)

#### Summary
- **Acceptance Criteria:** 30/30 passed (3 davon nur simuliert — Bestätigung in MS Excel durch den Product Owner offen)
- **Bugs Found:** 1 neu (0 critical, 0 high, 0 medium, 1 low) + 3 übernommene Low-Bugs aus PROJ-18 (BUG-QA11-1/-3/-4)
- **Security:** Pass
- **Production Ready:** YES (keine Critical/High-Bugs), vorbehaltlich der manuellen Prüfung in MS Excel

- **Entscheidung Product Owner (2026-11-25):** freigegeben (Approved); Low-Bugs bleiben dokumentiert

### QA-Lauf 13 — Refinement 2026-11-26 (`dmc` und Informationsfelder)

**Tested:** 2026-11-26
**App URL:** http://localhost:3000 (`npm run dev`, über Playwright)
**Tester:** QA Engineer (AI)
**Testumfang:** PROJ-9 und PROJ-10 gemeinsam (37 Spalten, Check-in-Vergleich, REPLY/SEND-Schutz, Export/Freigabestand/PROJ-20); Stand im Arbeitsverzeichnis (Frontend noch nicht committet)
**Automatisiert:** Vitest 713 Tests ✅ (60 Dateien) · Playwright 163 Tests ✅ · Startskript-Tests ✅ · Lint ohne Fehler
**Neu in diesem Lauf:** `src/lib/workflows/qa-proj9-10-info.test.ts` (8), `tests/QA-proj9-10-info.spec.ts` (6)
**Browser:** Chromium (Desktop). Nur Desktop laut PRD; Firefox/Safari nicht installiert, nicht getestet.
**Nicht möglich in dieser Umgebung:** MS Excel (Datei per Doppelklick öffnen, Werte in den neuen Spalten eintippen) → manuelle Bestätigung durch den Product Owner

#### Acceptance Criteria Status — `dmc` und Informationsfelder (10)
- [x] Zeile 1 mit genau 37 Feldnamen, Spalten 1–28 unverändert, danach `dmc` … `io-pm` (Unit, E2E)
- [x] `dmc` in der Schreibweise der Anwendung (`PHUNGUN-A-A05-40-0000-01A-000A-A`-Muster); E2E: DMC aus der Datei steht so in der DMRL-Ansicht
- [x] bestehende Einträge: Informationsfelder leer; gespeicherte Daten ohne die Felder bleiben gültig (Unit)
- [x] eingetragene Werte kommen beim nächsten Check-out wieder (Unit, E2E)
- [x] freigegebene DMRL, nur Informationsfelder geändert → übernommen, Einträge unverändert, kein Eintragstyp verlangt, DMRL bleibt *freigegeben* (Unit, E2E)
- [x] geänderte `dmc`-Spalte wird ignoriert → kein Fehler, „Keine Änderungen“ (Unit, E2E)
- [x] beliebige Werte ohne Fehler und ohne Hinweis (Unit)
- [x] Formelwerte `=`, `+`, `-`, `@` und `'=` als Text, Rundlauf CSV **und** Excel unverändert; ebenso `;`, `"`, Zeilenumbruch, Umlaute (QA-Unit)
- [x] SEND-XML ohne die Felder (Unit); XSD-Prüfung des SEND unverändert grün (bestehende XSD-Tests)
- [x] 1.000 Einträge mit 37 Spalten < 1 s (bestehender QA-Leistungstest)

#### Acceptance Criteria Status — PROJ-10 (Check-in, 6)
- [x] nur `orig` eines freigegebenen Eintrags geändert → Eintrag und DMRL bleiben *freigegeben*
- [x] Zusammenfassung „Informationsfelder bei N Einträgen aktualisiert“, kein Eintragstyp verlangt (Komponententest, E2E)
- [x] fachlich + Informationsfelder geändert → „geändert“, beide übernommen
- [x] `dmc` geändert → kein Fehler, keine Änderung
- [x] Datei mit 28 Spalten → gespeicherte Werte bleiben, Hinweis im Prüfbericht (Unit, E2E)
- [x] nur `spec` fehlt → Fehler Gruppe S, Sperre bleibt (Unit, E2E)

#### Bestehende Kriterien (Regression)
- [x] Check-out, Inhalt der Excel-Datei, Sperre aufheben, Nachvollziehbarkeit — alle bisherigen Unit- und E2E-Tests grün (Erwartungen auf 37 Spalten bzw. Autofilter `A1:AK11` umgestellt)
- [x] REPLY: keine G-Abweichungen wegen Informationsfeldern, Werte bleiben nach der Übernahme erhalten (Unit)
- [x] Export CSV/Excel und Freigabestand-CSV mit `dmc` und gespeicherten Informationsfeldern; CSV der XML-Prüfung (PROJ-20) mit 37 Spalten, Informationsfelder leer (QA-Unit, bestehende Tests)

#### Edge Cases Status
- [x] offener Check-out aus der Zeit vor den Informationsfeldern (Sperr-Kopie ohne Felder → leer; 28er-Datei angenommen)
- [x] Informationsspalte gelöscht / vertauscht → Fehler „fehlt“ bzw. „falscher Reihenfolge“; nur `dmc` ohne Informationsfelder → Fehler; `DMC` großgeschrieben → unbekannte Spalte (QA-Unit)
- [x] Informationsfeld geleert → leerer Wert übernommen
- [x] Excel lässt leere Zellen am Zeilenende weg → Informationsfelder leer, kein Spaltenfehler (QA-Unit)
- [x] neuer Eintrag: Informationsfelder aus 37er-Datei übernommen, aus 28er-Datei leer (QA-Unit)
- [x] Eintrag *zu überarbeiten* mit nur Informationsfeld-Änderung behält seinen Status (QA-Unit)
- [x] Antwortübernahme und Informationsfelder gleichzeitig (QA-Unit)
- [ ] BUG-QA13-1: CSV aus der XML-Prüfung (PROJ-20) einchecken leert alle gespeicherten Informationsfelder (s. u.)

#### Security Audit Results
- [x] XSS: HTML in einem Informationsfeld wird nirgends ausgeführt; die Werte erscheinen in der Oberfläche nicht (E2E)
- [x] Formel-Injection: Textzellen in Excel, Apostroph-Entschärfung in CSV gilt auch für die neuen Spalten (QA-Unit)
- [x] Keine neuen Pakete, keine Server-Route, keine neuen Berechtigungswege (Check-in weiter nur für den Sperrinhaber)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend

#### Bugs Found

##### BUG-QA13-1: CSV aus der XML-Prüfung (PROJ-20) einchecken leert alle gespeicherten Informationsfelder
- **Severity:** Medium (Datenverlust der Informationsfelder; Workaround vorhanden)
- **Steps to Reproduce:**
  1. DMRL mit gespeicherten Informationsfeldern (z. B. `orig` = `D0815` bei allen Einträgen) auschecken
  2. Die Empfänger-XML im Werkzeug „XML prüfen“ (PROJ-20) in CSV umwandeln — diese CSV hat 37 Spalten, Informationsfelder **leer**
  3. Diese CSV einchecken (dokumentierter Weg: „CSV bleibt für Dateien aus PROJ-20“)
  4. Expected: gespeicherte Informationsfelder bleiben erhalten (die Datei sagt zu ihnen nichts aus — wie bei 28-Spalten-Dateien)
  5. Actual: alle Informationsfelder werden geleert; einziger Hinweis ist „Informationsfelder bei 10 Einträgen aktualisiert“ — der Dialog zeigt nicht, welche Werte sich ändern (kein alt → neu)
- **Ursache:** spec-konform umgesetzt („Werte aus der Datei, leer erlaubt“); die Kombination mit der PROJ-20-CSV wurde im Refinement nicht betrachtet → Spec-Lücke
- **Hinweis zur Behebung (Entscheidung Product Owner):** z. B. PROJ-20-CSV ohne Informationsspalten (28 Spalten) schreiben, oder leere Informationsfelder beim Check-in nicht übernehmen, oder im Dialog die Abweichungen mit alt → neu zeigen
- **Test:** `qa-proj9-10-info.test.ts` › „Explorativ: CSV aus der XML-Prüfung (PROJ-20) einchecken“ (dokumentiert das heutige Verhalten)
- **Priority:** Fix in next sprint (vor Abnahme klären)
- **Entscheidung Product Owner (2026-11-26):** PROJ-20 schreibt seine CSV mit 28 Spalten (ohne `dmc` und Informationsfelder) → `/refine PROJ-20`; Behebung per `/frontend`

##### BUG-QA13-2: Zähler-Text „bei 1 Einträgen“
- **Severity:** Low (Grammatik)
- **Steps to Reproduce:** nur ein Informationsfeld eines Eintrags ändern und einchecken → „Informationsfelder bei 1 Einträgen aktualisiert“ (Dialog, Toast, Verlauf)
- **Expected:** „bei 1 Eintrag“
- **Hinweis:** gleiches Muster wie das bestehende „1 Antworten übernommen“
- **Priority:** Nice to have

#### Beobachtung (kein Bug)
- Bei Einträgen, die sich nur in Informationsfeldern unterscheiden, zeigt der Dialog nur die Anzahl, nicht welche Einträge/Felder — laut Spec ausreichend; relevant für BUG-QA13-1.

#### Summary
- **Acceptance Criteria:** 16/16 passed (neu) + Regression grün
- **Bugs Found:** 2 total (0 critical, 0 high, 1 medium, 1 low)
- **Security:** Pass
- **Production Ready:** YES (keine Critical/High-Bugs), vorbehaltlich Entscheidung zu BUG-QA13-1 und manueller Prüfung in MS Excel

## Deployment
_To be added by /deploy_
