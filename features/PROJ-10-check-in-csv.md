# PROJ-10: Check-in (MS-Excel / CSV)

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-26


> **Refinement 2026-11-26 (über `/refine PROJ-9`) — `dmc` und Informationsfelder (37 Spalten):** Vorgabe Product Owner. Excel und CSV haben nach `remarks` neun neue Spalten: `dmc`, `orig`, `applic_type`, `applic_model`, `applic_version`, `rfu`, `dtd-schema`, `spec`, `io-pm` (Aufbau → PROJ-9).
> - `dmc` aus der Datei wird **nie** übernommen und nie verglichen (wie `answer_timestamp`); Zuordnung der Einträge weiter über die DMC-Teile.
> - Die acht Informationsfelder werden **ohne Prüfung** übernommen und je Eintrag gespeichert (auch leer; auch bei neuen Einträgen).
> - Eine Abweichung **nur** in Informationsfeldern macht einen Eintrag **nicht** „geändert“: kein Eintragstyp nötig, Status und Freigabe der DMRL bleiben, der Eintrag geht nicht in den nächsten SEND. Bei gleichzeitiger fachlicher Änderung gelten die bisherigen Regeln.
> - Die Check-in-Zusammenfassung nennt einen Hinweis „Informationsfelder bei N Einträgen aktualisiert“; ein Check-in mit nur solchen Abweichungen ist kein „Keine Änderungen“-Fall, sondern übernimmt die Werte.
> - Dateien mit **28 oder 27 Spalten** (ohne die neuen Felder) bleiben gültig; gespeicherte Informationsfelder bleiben dann **unverändert**; Hinweis im Prüfbericht „Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten“. Andere Spaltenkombinationen (z. B. nur einige der neuen Spalten) → Fehler Gruppe S.
> - [ ] Angenommen nur `orig` eines freigegebenen Eintrags wurde geändert, wenn eingecheckt wird, dann wird der Wert gespeichert, der Eintrag bleibt *freigegeben*, und die DMRL bleibt *freigegeben*
> - [ ] Angenommen nur Informationsfelder wurden geändert, wenn eingecheckt wird, dann zeigt die Zusammenfassung „Informationsfelder bei N Einträgen aktualisiert“ und es wird kein Eintragstyp verlangt
> - [ ] Angenommen ein Eintrag wurde fachlich und in Informationsfeldern geändert, wenn eingecheckt wird, dann gilt er als „geändert“ wie bisher und beide Änderungen werden übernommen
> - [ ] Angenommen `dmc` wurde in der Datei geändert, wenn eingecheckt wird, dann gibt es keinen Fehler und keine Änderung
> - [ ] Angenommen eine Datei mit 28 Spalten wird eingecheckt, wenn gespeicherte Informationsfelder vorhanden sind, dann bleiben sie unverändert und der Prüfbericht nennt den Hinweis
> - [ ] Angenommen in einer Datei fehlt nur die Spalte `spec`, wenn eingecheckt wird, dann meldet Gruppe S einen Fehler im Spaltenaufbau

> **Refinement 2026-11-25 — Check-in von MS-Excel (.xlsx):** Vorgabe Product Owner; Gegenstück zu PROJ-9 (Check-out liefert jetzt `.xlsx`). Der Check-in nimmt **`.xlsx` und weiterhin `.csv`** an — CSV bleibt für Dateien aus PROJ-20 (XML-Prüfung), dem CSV-Export (PROJ-18) und offene Check-outs aus der CSV-Zeit. Gelesen wird das Tabellenblatt **„Einträge“**; hat die Mappe kein solches Blatt, aber **genau ein** Blatt, wird dieses gelesen (z. B. CSV in Excel geöffnet und als .xlsx gespeichert — Excel benennt das Blatt nach der Datei); sonst Fehler; Zellen werden mit ihrem **gespeicherten Wert** gelesen (Formel → gespeichertes Ergebnis, Zahl → Text ohne Formatierung). Danach gelten Prüfung (PROJ-8), Zusammenfassung, Antwortübernahme und Übernahme **unverändert** für beide Formate. Auch eine Excel-Datei aus dem Export (PROJ-18) kann bei eigener Sperre eingecheckt werden. Geänderte Stellen sind mit *(Refinement 2026-11-25)* markiert; ältere Abschnitte (Tech Design, QA) beschreiben den CSV-Stand.

> **Refinement 2026-11-21 (über PROJ-13) — `answer_timestamp`:** Die CSV hat 28 Spalten; neu ist `answer_timestamp` (nach `answer_comment`). Der Wert in der Datei wird **nie** übernommen; Änderungen daran sind kein Fehler und werden ohne Meldung ignoriert. Werden abweichende Empfängerantworten übernommen („Antworten aus der Datei übernehmen“), erhält jeder betroffene Eintrag als `answer_timestamp` den **Zeitpunkt des Check-ins**; ist die Antwort danach leer, ist auch `answer_timestamp` leer. Ohne Übernahme bleibt `answer_timestamp` unverändert. Neue Einträge haben `answer_timestamp` leer, außer bei Übernahme mit Antwort. Eine CSV mit 27 Spalten (alter Stand, ohne `answer_timestamp`) wird weiterhin angenommen; die fehlende Spalte gilt als unverändert.
> - [ ] Angenommen „Antworten aus der Datei übernehmen“ ist angekreuzt und ein Eintrag erhält `answer` `y`, wenn am 21.11.2026 um 15:00:00 eingecheckt wird, dann hat er `answer_timestamp` `2026-11-21T15:00:00`
> - [ ] Angenommen eine Antwort wird per Übernahme entfernt (Datei leer), wenn eingecheckt wird, dann ist `answer_timestamp` leer
> - [ ] Angenommen „Antworten aus der Datei übernehmen“ ist nicht angekreuzt, wenn eingecheckt wird, dann bleibt `answer_timestamp` aller Einträge unverändert
> - [ ] Angenommen in der Datei wurde nur `answer_timestamp` geändert, wenn eingecheckt wird, dann gibt es keinen Fehler, keine abweichende Antwort und der gespeicherte Wert bleibt
> - [ ] Angenommen eine CSV mit 27 Spalten (ohne `answer_timestamp`) wird eingecheckt, wenn sie sonst korrekt ist, dann wird sie angenommen

> **Refinement 2026-11-18 — Bestand übernehmen:** Neue Einträge brauchen nicht mehr den Eintragstyp `n` (PROJ-8 Regel F, Zeile „DMC neu und Eintragstyp ≠ n“ entfällt). Anlass: Eine DMRL aus einem laufenden Projekt hat bereits einen Bearbeitungsstand erreicht, der übernommen werden soll. Neue Einträge mit `n`, `c` oder `d` werden *in Bearbeitung*; neue Einträge **ohne** Eintragstyp gelten als bereits abgestimmter Bestand und werden *freigegeben*. Sind danach alle Einträge *freigegeben*, wird die DMRL *freigegeben* — mit Freigabe-Nachweis „Übernahme Bestand per Check-in“ und Freigabestand. Betrifft PROJ-8 (Regel F), PROJ-14 (Statusmodell, Nachweis, Freigabestand), PROJ-1 (Datenmodell) und PRD (Kernablauf Freigabe). Geänderte Stellen sind mit *(Refinement 2026-11-18)* markiert. Umgesetzt 2026-11-18 (`/frontend proj-10`).

> **Refinement 2026-11-16:** Eintragstyp und DM-Ausgabetyp müssen beim Check-in zueinander passen (`n` → `new`; `c` → `changed`/`revised`/`status`; `d` → `deleted`; ohne Eintragstyp keine Prüfung). DM-Ausgabetyp `status` wird gültig. Betrifft PROJ-8 (Regel A und F) und PROJ-1 (Demo-Daten). Geänderte Stellen sind mit *(Refinement 2026-11-16)* markiert. Umgesetzt 2026-11-16 (`/frontend proj-10`).

> **Refinement 2026-11-14:** Abweichende Empfängerantworten (`answer`/`answer_comment`) in der CSV werden nicht mehr abgewiesen, sondern nach Abfrage optional übernommen (Anlass: PROJ-20). Betrifft auch PROJ-8 Regel K. Geänderte Stellen sind mit *(Refinement 2026-11-14)* markiert.

## Dependencies
- Requires: PROJ-8 (Fachliches Regelwerk) — Prüfung, Prüfbericht, Auffüllen führender Nullen
- Requires: PROJ-9 (Check-out) — Sperre, Stand beim Check-out, Aufbau der Excel-Datei *(Refinement 2026-11-25)*
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Check-in", Anzeige von Status und Sperre
- Requires: PROJ-17 (DMRL-Berechtigungen) — Berechtigung des Sperrinhabers
- Wird genutzt von: PROJ-20 (XML-Prüfung & CSV-Konvertierung) — konvertierte CSV, auch mit Empfängerantworten (CSV bleibt dafür zulässig)
- Verwandt: PROJ-18 (DMRL-Export) — exportierte CSV- und Excel-Dateien können bei eigener Sperre eingecheckt werden *(Refinement 2026-11-25)*
- Wirkt auf: PROJ-14 (Freigabestatus) — Aufhebung der Freigabe bei Änderung; PROJ-4/5/6 — „im Workflow verwendet"
- Wirkt auf: PROJ-1 (Demo-Daten) — DM-Ausgabetyp der Demo-Einträge wird aus dem Eintragstyp abgeleitet, damit die Demo-DMRLs die Typ-Regel erfüllen *(Refinement 2026-11-16)*

## Beschreibung
Der Sperrinhaber lädt die bearbeitete **Excel-Datei (.xlsx)** oder eine **CSV-Datei** hoch *(Refinement 2026-11-25)*. Sie wird nach dem fachlichen Regelwerk (PROJ-8) gegen den Stand beim Check-out geprüft. Nur eine fehlerfreie Datei kann — nach Sichtung einer Zusammenfassung — übernommen werden; danach ist die Sperre aufgehoben. Eine fehlerhafte Datei wird vollständig abgelehnt, die Sperre bleibt bestehen.

## Ablauf
1. Sperrinhaber wählt **„Check-in"** in der DMRL-Ansicht und wählt eine Excel-Datei (`.xlsx`) oder CSV-Datei (`.csv`) *(Refinement 2026-11-25)*.
2. Prüfung nach PROJ-8 (Gruppen S, A, B, C, D, E, I, F) gegen den Stand beim Check-out. Abweichende Antwortfelder (Gruppe K) sind kein Fehler mehr, sondern werden zur Übernahme angeboten *(Refinement 2026-11-14)*. Zu jedem Eintrag mit Eintragstyp wird geprüft, ob der DM-Ausgabetyp passt (PROJ-8 Regel F, s. „Eintragstyp ↔ DM-Ausgabetyp“) *(Refinement 2026-11-16)*.
3. **Fehler →** Prüfbericht (mit Download), nichts übernommen, Sperre bleibt. Erneuter Upload möglich.
4. **Keine Fehler →** Zusammenfassung:
   - Zahlen: „32 Einträge geprüft · 3 neu · 2 geändert · 27 unverändert"
   - Hinweise (z. B. aufgefüllte führende Nullen)
   - Liste der neuen und geänderten Einträge; bei geänderten je Feld alter → neuer Wert
   - **Abweichende Empfängerantworten (N Einträge)** *(Refinement 2026-11-14)*: nur wenn `answer` oder `answer_comment` in der Datei vom Stand der DMRL abweichen (bei neuen Einträgen: nicht leer). Liste je Eintrag: DMC, Antwort alt → neu, Begründung alt → neu. Darunter das Kästchen **„Antworten aus der Datei übernehmen“**, standardmäßig **nicht** angekreuzt, mit dem Hinweis „Übernommene Antworten sind nur Information — freigegeben wird ein Eintrag weiterhin nur durch einen REPLY.“
5. **„Übernehmen"** → Daten übernommen, Status gesetzt (s. u.), Sperre aufgehoben, Erfolgsmeldung.
   **„Abbrechen"** → nichts übernommen, Sperre bleibt.

## Dateiformate *(Refinement 2026-11-25)*
| Punkt | Excel (`.xlsx`) | CSV (`.csv`) |
|---|---|---|
| Herkunft | Check-out (PROJ-9), Excel-Export (PROJ-18) | PROJ-20, CSV-Export (PROJ-18), Check-out aus der Zeit vor der Umstellung |
| Gelesener Bereich | Tabellenblatt **„Einträge“**; weitere Blätter werden ignoriert. Gibt es kein Blatt „Einträge“, aber **genau ein** Blatt, wird dieses gelesen *(Nachtrag 2026-11-25, Beispieldatei)*. Mehrere Blätter ohne „Einträge“: „Tabellenblatt ‚Einträge‘ fehlt“ (Datei abgelehnt) | ganze Datei |
| Zeile 1 / ab Zeile 2 | Kopfzeile mit den Feldnamen / je Eintrag eine Zeile — wie CSV (PROJ-8, Gruppe S) | unverändert |
| Zellwerte | **gespeicherter Wert:** Text unverändert; Formel → das in der Datei gespeicherte Ergebnis; Zahl → als Text ohne Formatierung (`1` → „1“, dann Auffüllen führender Nullen wie bisher); Datumszelle → Excel-Seriennummer als Text (fällt dann durch die Formatprüfung, PROJ-8 A) | unverändert |
| Vollständig leere Zeilen | werden ignoriert (z. B. nach Löschen von Zellinhalten) | wie bisher |
| Formelschutz-Apostroph | wird **nicht** entfernt (in Excel-Dateien wird keiner geschrieben) | ein vorangestelltes `'` wird wie bisher entfernt (BUG-QA2-1) |
| Kodierung | entfällt (keine UTF-8-Prüfung) | UTF-8 streng geprüft |
| Maximale Größe | 5 MB | 5 MB |
| Beschädigte / keine echte .xlsx-Datei | „Excel-Datei kann nicht gelesen werden“ (Datei abgelehnt) | — |

**Nicht angenommen:** `.xls`, `.xlsm`, `.ods` und alle anderen Endungen — „Bitte eine Excel- (.xlsx) oder CSV-Datei auswählen“.

Nach dem Einlesen sind beide Formate gleichwertig: dieselbe Prüfung (PROJ-8), dieselbe Zusammenfassung, Antwortübernahme und Übernahme. Positionsangaben im Prüfbericht nennen die **Zeilennummer** (wie bisher); bei Excel entspricht sie der Zeile im gelesenen Blatt. Dateifehler (Typ, Größe, Kodierung, fehlendes Blatt, nicht lesbar) werden wie bisher im Auswahlschritt gemeldet und nicht im Verlauf protokolliert.

## Eintragstyp ↔ DM-Ausgabetyp *(Refinement 2026-11-16)*
Beim Check-in muss der DM-Ausgabetyp (`issno/@type`, CSV-Spalte `type`) zum Eintragstyp (`dmentry/@type`, CSV-Spalte `dmentryType`) passen. Geprüft wird **jeder Eintrag der Datei mit Eintragstyp** — neu, geändert und unverändert (auch Altbestand).

| Eintragstyp | zulässiger DM-Ausgabetyp |
|---|---|
| `n` | `new` |
| `c` | `changed`, `revised` oder `status` |
| `d` | `deleted` |
| leer | keine Prüfung (jeder gültige Ausgabetyp) |

- Ein Verstoß ist ein **Fehler** im Prüfbericht (PROJ-8 Regel F); der Check-in wird abgelehnt, die Sperre bleibt.
- Meldung: „Eintragstyp ‚[n|c|d]‘ verlangt DM-Ausgabetyp ‚[zulässige Werte]‘ — gefunden: ‚[Wert]‘“ (z. B. „Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚new‘“).
- Ein ungültiger Ausgabetyp (z. B. `change`) bleibt ein Formatfehler nach Regel A; dann wird keine zusätzliche Typ-Meldung erzeugt.
- Gültige DM-Ausgabetypen (Regel A) sind jetzt `new`, `changed`, `revised`, `deleted` und `status` (in allen drei Schemas gültig).
- Gilt **nur beim Check-in** (Excel und CSV) — nicht beim REPLY-Import (Regel G verbietet dort ohnehin Änderungen an den Ausgabedaten) und nicht im Prüfwerkzeug PROJ-20.
- Korrigiert der Bearbeiter den Ausgabetyp in der Datei, ist das eine fachliche Änderung: der Eintrag wird *in Bearbeitung* (wie jede Feldänderung).

## Wer darf einchecken
| Benutzer | Check-in |
|---|---|
| Sperrinhaber (Bearbeiter oder Administrator) | ja |
| Administrator bei fremder Sperre | nein — kann die Sperre aufheben (PROJ-9) |
| anderer Bearbeiter | nein |
| DMRL nicht gesperrt | Aktion nicht verfügbar |

## Wirkung der Übernahme

**Eintragsstatus**
| Eintrag in der CSV | Eintragsstatus danach |
|---|---|
| neu (DMC vorher nicht vorhanden) mit Eintragstyp `n`, `c` oder `d` | *in Bearbeitung* *(Refinement 2026-11-18)* — vorher nur `n` erlaubt |
| neu (DMC vorher nicht vorhanden) **ohne** Eintragstyp — Übernahme eines abgestimmten Bestands *(Refinement 2026-11-18)* | *freigegeben* |
| geändert (irgendein Feld weicht ab, auch der Eintragstyp) | *in Bearbeitung* |
| unverändert | bleibt (z. B. *freigegeben*, *zu überarbeiten*, *in Bearbeitung*) |
| nur Antwortfelder abweichend, Übernahme **gewählt** *(Refinement 2026-11-14)* | *in Bearbeitung* — zählt als Änderung |
| nur Antwortfelder abweichend, Übernahme **nicht gewählt** *(Refinement 2026-11-14)* | bleibt; die bisherigen Antworten bleiben erhalten, zählt nicht als Änderung |

„Unverändert" wird nach dem Auffüllen führender Nullen beurteilt (`1` → `01` ist keine Änderung).

**Eintrag ohne Eintragstyp** *(Refinement 2026-11-14)*: Weicht bei einem Eintrag ohne Eintragstyp (z. B. *freigegeben*) nur die Antwort ab und ist die Übernahme gewählt, braucht er einen Eintragstyp (`n`, `c` oder `d`) — sonst könnte er nie erneut gesendet und freigegeben werden. Solange solche Einträge betroffen sind, ist „Übernehmen“ bei angekreuzter Übernahme gesperrt; ohne Häkchen ist der Check-in normal möglich.

**Grundsatz Eintragstyp** *(Refinement 2026-11-14, BUG-QA4-1)*: Nach dem Check-in gibt es keinen Eintrag *in Bearbeitung* ohne Eintragstyp (`n`, `c` oder `d`) — SEND nimmt nur solche Einträge mit. Ein entfernter Eintragstyp bei einem Eintrag, der *in Bearbeitung* wäre, ist ein Fehler (PROJ-8 Regel F); das gilt auch für Altbestand, der bereits *in Bearbeitung* ohne Eintragstyp ist.

**Bestand übernehmen** *(Refinement 2026-11-18)*: Eine DMRL aus einem laufenden Projekt hat bereits einen Bearbeitungsstand erreicht, der übernommen werden soll. Neue Einträge dürfen deshalb jeden Eintragstyp haben (`n`, `c`, `d` oder keinen). Ein neuer Eintrag **ohne** Eintragstyp gilt als mit dem Empfänger bereits abgestimmt und wird *freigegeben* — neben dem REPLY die einzige Stelle, an der *freigegeben* entsteht. Maßgeblich ist allein der fehlende Eintragstyp, nicht der Wert in `answer`. Der Grundsatz Eintragstyp bleibt gewahrt: Es entsteht kein Eintrag *in Bearbeitung* ohne Eintragstyp. Die Zusammenfassung weist diese Einträge gesondert aus („davon N als *freigegeben* übernommen“), damit ein vergessener Eintragstyp vor der Übernahme auffällt.

**Übernommene Empfängerantworten** *(Refinement 2026-11-14)* setzen den Eintrag nie auf *freigegeben* oder *zu überarbeiten* — diese Status entstehen nur durch einen REPLY (PRD). Eine übernommene Antwortänderung zählt als Änderung (Eintrag *in Bearbeitung*, eine Freigabe der DMRL wird aufgehoben), damit *freigegeben* immer durch eine echte Empfängerantwort belegt ist.

**DMRL-Status**
| Ergebnis | DMRL-Status danach |
|---|---|
| mindestens ein Eintrag neu oder geändert und danach **nicht alle** Einträge *freigegeben* | *in Bearbeitung* — eine Freigabe wird aufgehoben (PRD, PROJ-14) |
| mindestens ein Eintrag als *freigegeben* übernommen (neu ohne Eintragstyp) und danach **alle** Einträge *freigegeben* *(Refinement 2026-11-18)* | *freigegeben* — neuer Freigabe-Nachweis „Übernahme Bestand per Check-in“ (Datum, Bearbeiter, kein REPLY) und neuer Freigabestand (PROJ-14) |
| keine Änderung | unverändert (z. B. bleibt *freigegeben*) |

**Weiteres**
- Antworten des Empfängers (`answer`, `answer_comment`) bleiben bei geänderten Einträgen erhalten, bis der nächste REPLY sie ersetzt; sie werden nicht mitgesendet (PROJ-12). Ist „Antworten aus der Datei übernehmen“ angekreuzt, gelten stattdessen die Werte aus der Datei *(Refinement 2026-11-14)*.
- Sperre wird aufgehoben.
- Workflow-Verlauf: „Check-in" mit Datum, Benutzer und Anzahl neu/geändert/unverändert (Anzeige → PROJ-15); bei Übernahme zusätzlich „N Antworten aus der Datei übernommen" *(Refinement 2026-11-14)*.
- Zusammenfassung und Workflow-Verlauf nennen bei neuen Einträgen ohne Eintragstyp zusätzlich „davon N als freigegeben übernommen“; wird die DMRL dadurch *freigegeben*, enthält der Verlauf außerdem „DMRL freigegeben (Übernahme Bestand)“ *(Refinement 2026-11-18)*.
- Ab dem ersten abgeschlossenen Check-in gelten DMRL, System und Originator-Organisation als **im Workflow verwendet** (PROJ-4/5/6) — auch wenn nichts geändert wurde.
- Die eingecheckte Datei (Excel oder CSV) wird nicht archiviert.

## User Stories
- Als **Bearbeiter** möchte ich meine bearbeitete Excel-Datei einchecken, damit meine Änderungen in die DMRL übernommen werden *(Refinement 2026-11-25)*.
- Als **Bearbeiter** möchte ich weiterhin eine CSV einchecken können (z. B. aus der XML-Prüfung PROJ-20 oder einem älteren Check-out), damit diese Wege nicht wegfallen *(Refinement 2026-11-25)*.
- Als **Bearbeiter** möchte ich vor der Übernahme sehen, welche Einträge neu oder geändert sind, damit ich keine ungewollten Änderungen übernehme.
- Als **Bearbeiter** möchte ich bei Fehlern einen vollständigen Prüfbericht erhalten und die Datei korrigiert erneut hochladen können, ohne erneut auschecken zu müssen.
- Als **Bearbeiter** möchte ich nach dem Check-in sehen, welche Einträge *in Bearbeitung* sind, damit ich weiß, was mit dem nächsten SEND an den Empfänger geht.
- Als **Bearbeiter** möchte ich eine DMRL eines Empfängers oder Altprojekts samt Empfängerantworten übernehmen (z. B. über PROJ-20 konvertiert), damit die bisherige Abstimmung als Information erhalten bleibt *(Refinement 2026-11-14)*.
- Als **Bearbeiter** möchte ich bewusst entscheiden, ob abweichende Antworten aus der Datei übernommen werden, damit versehentlich geänderte Antworten nicht unbemerkt übernommen werden *(Refinement 2026-11-14)*.
- Als **Product Owner** möchte ich zeigen, dass eine freigegebene DMRL durch einen Check-in mit Änderungen ihre Freigabe verliert, ein Check-in ohne Änderungen aber nicht.
- Als **Bearbeiter** möchte ich eine DMRL aus einem laufenden Projekt mit ihrem erreichten Bearbeitungsstand übernehmen (neue Einträge mit `c`/`d` oder ohne Eintragstyp), damit bereits abgestimmte Einträge nicht erneut mit `n` gesendet werden müssen *(Refinement 2026-11-18)*.

## Out of Scope
- Prüfregeln selbst → PROJ-8
- Check-out, Rücknahme, Aufheben der Sperre → PROJ-9
- ~~Excel-Format (.xlsx) → nur CSV (PROJ-9)~~ → jetzt im Umfang *(Refinement 2026-11-25)*
- Altes Excel-Format (.xls), Makro-Mappen (.xlsm), OpenDocument (.ods) *(Refinement 2026-11-25)*
- Lesen anderer Tabellenblätter als „Einträge“ bei Mappen mit mehreren Blättern, Zusammenführen mehrerer Blätter *(Refinement 2026-11-25)*
- Neuberechnung von Formeln beim Check-in — es zählt das in der Datei gespeicherte Ergebnis *(Refinement 2026-11-25)*
- Umstellung von PROJ-20 auf Excel — ggf. eigenes Refinement von PROJ-20 *(Refinement 2026-11-25)*
- Teilweise Übernahme (nur fehlerfreie Einträge) — alles oder nichts (PROJ-8)
- Bearbeiten einzelner Einträge direkt in der Anwendung
- Check-in durch Administrator bei fremder Sperre
- Archivierung der eingecheckten Datei
- Anzeige des Workflow-Verlaufs → PROJ-15
- Rückgängig machen eines Check-ins
- Übernahme von Empfängerantworten je Eintrag einzeln — nur alle oder keine *(Refinement 2026-11-14)*
- Freigabe von Einträgen oder DMRLs durch übernommene Antworten — nur per REPLY (PROJ-13/14)
- Prüfung Eintragstyp ↔ DM-Ausgabetyp beim REPLY-Import (PROJ-13) und im Prüfwerkzeug (PROJ-20) — nur beim Check-in *(Refinement 2026-11-16)*
- DM-Ausgabetypen `rinstate-changed`, `rinstate-revised`, `rinstate-status` — bleiben ungültig (Regel A) *(Refinement 2026-11-16)*
- Automatisches Korrigieren des Ausgabetyps beim Check-in — der Bearbeiter korrigiert die Datei *(Refinement 2026-11-16)*
- Automatische Umstellung bereits gespeicherter Daten im Browser — gilt nur für neu erzeugte Demo-Daten (Zurücksetzen nötig) *(Refinement 2026-11-16)*

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen die DMRL ist von mir gesperrt, wenn ich die Ansicht öffne, dann ist „Check-in" verfügbar
- [ ] Angenommen die DMRL ist nicht gesperrt, wenn ich die Ansicht öffne, dann ist „Check-in" nicht verfügbar
- [ ] Angenommen die DMRL ist von einem anderen Benutzer gesperrt, wenn ein Administrator oder Bearbeiter die Ansicht öffnet, dann ist „Check-in" nicht verfügbar
- [ ] Angenommen ein Administrator hat die DMRL selbst ausgecheckt, wenn er „Check-in" wählt, dann ist der Check-in wie für einen Bearbeiter möglich

### Prüfung
- [ ] Angenommen eine Datei wird hochgeladen, wenn sie weder `.xlsx` noch `.csv` ist (z. B. `.xls`, `.ods`, `.txt`), dann erscheint „Bitte eine Excel- (.xlsx) oder CSV-Datei auswählen" und es wird nichts geprüft *(Refinement 2026-11-25)*
- [ ] Angenommen eine CSV ist nicht in UTF-8 kodiert, wenn sie geprüft wird, dann wird sie mit „Datei ist nicht UTF-8-kodiert" abgelehnt
- [ ] Angenommen die Datei enthält Fehler nach PROJ-8, wenn die Prüfung endet, dann erscheint der Prüfbericht mit allen Fehlern, „Übernehmen" ist nicht verfügbar und die Sperre bleibt bestehen
- [ ] Angenommen ein Prüfbericht mit Fehlern wird angezeigt, wenn der Bearbeiter eine korrigierte Datei hochlädt, dann wird diese erneut geprüft, ohne erneuten Check-out
- [ ] Angenommen die Datei ist fehlerfrei, wenn die Prüfung endet, dann zeigt die Zusammenfassung Anzahl geprüft/neu/geändert/unverändert, Hinweise und die Liste der neuen und geänderten Einträge
- [ ] Angenommen ein Eintrag wurde geändert, wenn die Zusammenfassung angezeigt wird, dann sind je geändertem Feld alter und neuer Wert sichtbar
- [ ] Angenommen in der Datei wurde `security` von `01` zu `1` (Excel), wenn geprüft wird, dann gilt der Eintrag als unverändert und ein Hinweis auf das Auffüllen erscheint

- [ ] Angenommen bei einem Eintrag wurde der Eintragstyp entfernt (mit oder ohne geänderte Antwort) und er wäre nach dem Check-in *in Bearbeitung*, wenn geprüft wird, dann meldet der Prüfbericht „Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden.“ und der Check-in ist nicht möglich *(Refinement 2026-11-14, BUG-QA4-1)*
- [ ] Angenommen ein Eintrag ist bereits *in Bearbeitung* ohne Eintragstyp (Altbestand vor der Korrektur), wenn eine Datei eingecheckt wird, in der er unverändert ist, dann wird derselbe Fehler gemeldet, damit der Eintragstyp nachgetragen wird *(Refinement 2026-11-14)*

### Excel-Datei *(Refinement 2026-11-25)*
- [ ] Angenommen die DMRL wurde als Excel ausgecheckt, wenn die Datei unverändert eingecheckt wird, dann ist die Prüfung fehlerfrei und die Zusammenfassung zeigt nur unveränderte Einträge
- [ ] Angenommen die ausgecheckte Excel-Datei wurde in MS Excel bearbeitet (neue Zeile mit Eintragstyp `n`, ein Tech Name geändert) und gespeichert, wenn sie eingecheckt wird, dann zeigt die Zusammenfassung 1 neu und 1 geändert, wie bei einer CSV
- [ ] Angenommen eine Excel-Datei hat mehrere Tabellenblätter, aber keines heißt „Einträge“, wenn sie hochgeladen wird, dann erscheint „Tabellenblatt ‚Einträge‘ fehlt“, nichts wird geprüft und die Sperre bleibt *(Nachtrag 2026-11-25, Beispieldatei)*
- [ ] Angenommen eine Excel-Datei hat genau ein Tabellenblatt mit anderem Namen (z. B. Export-CSV in MS Excel geöffnet und als .xlsx gespeichert, Blatt „DML-PHUNGUN-D0815-C-Export-2026“), wenn sie eingecheckt wird, dann wird dieses Blatt gelesen und wie jede Datei geprüft *(Nachtrag 2026-11-25, Beispieldatei)*
- [ ] Angenommen die Beispieldatei aus MS Excel (Export-CSV als .xlsx gespeichert, Zahlzellen z. B. `section` 0, `subject` 1000, `day` 29) wird gegen den Demo-Stand der PHUNGUN-DMRL als Stand beim Check-out geprüft, wenn die Prüfung endet, dann gibt es keine Fehler und alle 32 Einträge sind fachlich unverändert *(Nachtrag 2026-11-25, Beispieldatei)*
- [ ] Angenommen die Excel-Datei enthält neben „Einträge“ weitere Blätter (auch vor „Einträge“), wenn eingecheckt wird, dann werden nur die Zeilen aus „Einträge“ gelesen
- [ ] Angenommen eine Zelle enthält eine Formel (z. B. `=B2`), wenn eingecheckt wird, dann wird das in der Datei gespeicherte Ergebnis als Wert gelesen
- [ ] Angenommen in der Spalte `security` steht eine Zahlzelle `1`, wenn eingecheckt wird, dann wird sie zu `01` aufgefüllt, gilt als unverändert und ein Hinweis auf das Auffüllen erscheint
- [ ] Angenommen in der Spalte `day` steht eine Datumszelle, wenn eingecheckt wird, dann meldet der Prüfbericht einen Formatfehler (PROJ-8 A) und der Check-in ist nicht möglich
- [ ] Angenommen ein Wert in der Excel-Datei beginnt mit `'=` als echter Text, wenn eingecheckt wird, dann bleibt der Wert unverändert (kein Entfernen des Apostrophs wie bei CSV)
- [ ] Angenommen zwischen den Einträgen stehen vollständig leere Zeilen, wenn eingecheckt wird, dann werden sie ignoriert und erzeugen keinen Fehler
- [ ] Angenommen eine Datei mit Endung `.xlsx` ist beschädigt oder keine Excel-Datei, wenn sie hochgeladen wird, dann erscheint „Excel-Datei kann nicht gelesen werden“ und die Sperre bleibt
- [ ] Angenommen eine Excel-Datei ist größer als 5 MB, wenn sie hochgeladen wird, dann wird sie mit „Datei zu groß" abgelehnt
- [ ] Angenommen der Bearbeiter hat die DMRL ausgecheckt, wenn er eine Excel-Datei aus dem Export (PROJ-18) derselben DMRL eincheckt, dann wird sie wie jede Datei geprüft (ersetzt das bisherige PROJ-18-Kriterium „.xlsx wird abgelehnt“)
- [ ] Angenommen eine Excel-Datei enthält Fehler nach PROJ-8, wenn die Prüfung endet, dann nennt der Prüfbericht die Zeilennummer des gelesenen Blatts

### CSV weiterhin zulässig *(Refinement 2026-11-25)*
- [ ] Angenommen eine über PROJ-20 konvertierte CSV wird bei eigener Sperre eingecheckt, wenn sie korrekt ist, dann wird sie wie bisher angenommen
- [ ] Angenommen eine DMRL wurde vor der Umstellung als CSV ausgecheckt, wenn die alte CSV eingecheckt wird, dann wird sie wie bisher geprüft und übernommen
- [ ] Angenommen eine CSV-Datei enthält einen mit `'` entschärften Wert (BUG-QA2-1), wenn eingecheckt wird, dann wird das Apostroph wie bisher entfernt

### Eintragstyp ↔ DM-Ausgabetyp *(Refinement 2026-11-16)*
- [ ] Angenommen ein Eintrag hat Eintragstyp `n` und DM-Ausgabetyp `changed`, wenn geprüft wird, dann meldet der Prüfbericht „Eintragstyp ‚n‘ verlangt DM-Ausgabetyp ‚new‘ — gefunden: ‚changed‘“ und der Check-in ist nicht möglich
- [ ] Angenommen ein Eintrag hat Eintragstyp `n` und DM-Ausgabetyp `new`, wenn geprüft wird, dann wird dazu kein Fehler gemeldet
- [ ] Angenommen ein Eintrag hat Eintragstyp `c` und DM-Ausgabetyp `changed`, `revised` oder `status`, wenn geprüft wird, dann wird dazu kein Fehler gemeldet
- [ ] Angenommen ein Eintrag hat Eintragstyp `c` und DM-Ausgabetyp `new` oder `deleted`, wenn geprüft wird, dann meldet der Prüfbericht „Eintragstyp ‚c‘ verlangt DM-Ausgabetyp ‚changed‘, ‚revised‘ oder ‚status‘ — gefunden: ‚[Wert]‘“
- [ ] Angenommen ein Eintrag hat Eintragstyp `d` und DM-Ausgabetyp `deleted`, wenn geprüft wird, dann wird dazu kein Fehler gemeldet
- [ ] Angenommen ein Eintrag hat Eintragstyp `d` und DM-Ausgabetyp `new`, wenn geprüft wird, dann meldet der Prüfbericht „Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘“
- [ ] Angenommen ein Eintrag hat keinen Eintragstyp (z. B. *freigegeben*), wenn geprüft wird, dann wird der DM-Ausgabetyp nur auf Gültigkeit (Regel A) geprüft, nicht auf Zusammenpassen
- [ ] Angenommen ein unveränderter Eintrag aus dem Altbestand hat Eintragstyp `d` und DM-Ausgabetyp `new`, wenn eine Datei eingecheckt wird, in der er unverändert ist, dann wird derselbe Fehler gemeldet, bis der Ausgabetyp korrigiert ist
- [ ] Angenommen der DM-Ausgabetyp ist `status`, wenn geprüft wird, dann ist das kein Formatfehler (Regel A)
- [ ] Angenommen der DM-Ausgabetyp ist `change` bei Eintragstyp `c`, wenn geprüft wird, dann wird nur der Formatfehler (Regel A) gemeldet, keine zusätzliche Typ-Meldung
- [ ] Angenommen ein REPLY wird importiert, in dem Eintragstyp und DM-Ausgabetyp nicht zusammenpassen, wenn geprüft wird, dann meldet die Typ-Regel keinen Fehler (nur Check-in)
- [ ] Angenommen der Demo-Datenbestand ist frisch geladen, wenn die PHUNGUN-DMRL ausgecheckt und die CSV unverändert eingecheckt wird, dann ist die Prüfung fehlerfrei (Einträge `d` haben `deleted`, Einträge `n` haben `new`)

### Übernehmen / Abbrechen
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Abbrechen" gewählt wird, dann wird nichts übernommen und die Sperre bleibt bestehen
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Übernehmen" gewählt wird, dann werden alle Einträge übernommen, die Sperre ist aufgehoben und eine Erfolgsmeldung erscheint
- [ ] Angenommen ein Eintrag ist neu und hat Eintragstyp `n`, `c` oder `d`, wenn übernommen wird, dann hat er den Status *in Bearbeitung* *(Refinement 2026-11-18)*
- [ ] Angenommen ein Eintrag ist neu und hat **keinen** Eintragstyp, wenn übernommen wird, dann hat er den Status *freigegeben* *(Refinement 2026-11-18)*
- [ ] Angenommen ein neuer Eintrag hat Eintragstyp `c` oder `d` (mit passendem DM-Ausgabetyp) oder keinen Eintragstyp, wenn geprüft wird, dann meldet der Prüfbericht dafür keinen Fehler (bisher „Neuer Eintrag muss Eintragstyp ‚n' haben.“) *(Refinement 2026-11-18)*
- [ ] Angenommen die Datei enthält neue Einträge ohne Eintragstyp, wenn die Zusammenfassung erscheint, dann zeigt sie „davon N als freigegeben übernommen“ und listet diese Einträge *(Refinement 2026-11-18)*
- [ ] Angenommen ein Eintrag mit Status *freigegeben* wurde geändert, wenn übernommen wird, dann hat er den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag mit Status *zu überarbeiten* wurde geändert, wenn übernommen wird, dann hat er den Status *in Bearbeitung* und `answer`/`answer_comment` bleiben erhalten
- [ ] Angenommen ein Eintrag ist unverändert, wenn übernommen wird, dann behält er seinen Status
- [ ] Angenommen bei einem Eintrag wurde nur der Eintragstyp geändert (z. B. abgelehnter Eintrag erneut mit `n`), wenn übernommen wird, dann gilt er als geändert und hat den Status *in Bearbeitung*

### Empfängerantworten aus der Datei *(Refinement 2026-11-14)*
- [ ] Angenommen in der Datei weichen `answer` oder `answer_comment` bei Einträgen vom Stand der DMRL ab (bei neuen Einträgen: nicht leer), wenn die Prüfung endet, dann ist das kein Fehler, und die Zusammenfassung zeigt „Abweichende Empfängerantworten (N Einträge)" mit DMC und alt → neu je Feld
- [ ] Angenommen abweichende Antworten werden angezeigt, wenn die Zusammenfassung erscheint, dann ist „Antworten aus der Datei übernehmen" nicht angekreuzt und der Hinweis „nur Information — freigegeben wird nur durch einen REPLY" sichtbar
- [ ] Angenommen „Antworten aus der Datei übernehmen" ist nicht angekreuzt, wenn übernommen wird, dann behalten alle Einträge ihre bisherigen Antworten, und Einträge, bei denen nur die Antworten abweichen, gelten als unverändert
- [ ] Angenommen „Antworten aus der Datei übernehmen" ist angekreuzt, wenn übernommen wird, dann stehen bei allen betroffenen Einträgen die Werte aus der Datei, und diese Einträge haben den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag *zu überarbeiten* (mit Eintragstyp) hat in der Datei nur eine geänderte Antwort und die Übernahme ist angekreuzt, wenn übernommen wird, dann ist er *in Bearbeitung* mit den Werten aus der Datei *(korrigiert 2026-11-14, BUG-QA4-2; vorher: „freigegebener Eintrag …“ — nicht erreichbar, da freigegebene Einträge keinen Eintragstyp haben und die Übernahme dann gesperrt ist)*
- [ ] Angenommen die DMRL ist *freigegeben*, wenn eine Datei mit nur geänderten Antworten bei freigegebenen Einträgen geprüft und das Häkchen gesetzt wird, dann ist „Übernehmen“ gesperrt — eine Freigabe lässt sich durch übernommene Antworten allein nie aufheben oder herbeiführen *(2026-11-14)*
- [ ] Angenommen ein neuer Eintrag **mit Eintragstyp** hat in der Datei die Antwort `y` und die Übernahme ist angekreuzt, wenn übernommen wird, dann ist er *in Bearbeitung* (nicht *freigegeben*) mit `answer` = `y` *(Refinement 2026-11-18)*: „mit Eintragstyp“ ergänzt
- [ ] Angenommen die Datei enthält in `answer` einen ungültigen Wert (nicht leer, `y` oder `n`), wenn geprüft wird, dann ist das weiterhin ein Formatfehler (PROJ-8 A) und der Check-in wird abgelehnt
- [ ] Angenommen Antworten wurden übernommen, wenn der Workflow-Verlauf betrachtet wird, dann enthält der Check-in-Eintrag „N Antworten aus der Datei übernommen"
- [ ] Angenommen keine Antwort weicht ab, wenn die Zusammenfassung erscheint, dann gibt es weder den Abschnitt noch das Kästchen
- [ ] Angenommen bei einem Eintrag ohne Eintragstyp weicht nur die Antwort ab, wenn „Antworten aus der Datei übernehmen“ angekreuzt wird, dann ist „Übernehmen“ gesperrt und eine Meldung listet diese Einträge mit „Eintragstyp setzen (n, c oder d), damit der Eintrag erneut gesendet werden kann — Datei korrigieren oder Antworten nicht übernehmen“
- [ ] Angenommen dieselbe Datei, wenn das Häkchen wieder entfernt wird, dann ist „Übernehmen“ wieder möglich und die bisherigen Antworten bleiben
- [ ] Angenommen das Häkchen wird gesetzt oder entfernt, wenn die Zusammenfassung angezeigt wird, dann passen sich die Zahlen neu/geändert/unverändert sofort an

### DMRL-Status
- [ ] Angenommen die DMRL ist *freigegeben* und mindestens ein Eintrag wurde geändert, wenn übernommen wird, dann ist die DMRL *in Bearbeitung* und das Banner „Nicht freigegeben" erscheint
- [ ] Angenommen die DMRL ist *freigegeben* und nichts wurde geändert, wenn übernommen wird, dann bleibt sie *freigegeben* und die Sperre ist aufgehoben
- [ ] Angenommen die DMRL ist *in Bearbeitung*, wenn ein Check-in mit Änderungen übernommen wird, dann bleibt sie *in Bearbeitung*
- [ ] Angenommen eine DMRL ohne Einträge wird ausgecheckt und eine Datei mit ausschließlich Einträgen ohne Eintragstyp eingecheckt, wenn übernommen wird, dann sind alle Einträge und die DMRL *freigegeben*, der Kopfbereich zeigt „Freigegeben am [Datum] durch Übernahme Bestand per Check-in — übernommen von [Name]“ und ein Freigabestand existiert *(Refinement 2026-11-18)*
- [ ] Angenommen eine Datei enthält neue Einträge ohne Eintragstyp und mindestens einen Eintrag mit `n`, `c` oder `d`, wenn übernommen wird, dann ist die DMRL *in Bearbeitung* und es entsteht weder Freigabe-Nachweis noch Freigabestand *(Refinement 2026-11-18)*
- [ ] Angenommen die DMRL ist *freigegeben* und die Datei ergänzt nur neue Einträge ohne Eintragstyp, wenn übernommen wird, dann bleibt die DMRL *freigegeben*, mit neuem Freigabe-Nachweis „Übernahme Bestand per Check-in“ und neuem Freigabestand *(Refinement 2026-11-18)*

### Nachvollziehbarkeit
- [ ] Angenommen ein Check-in wurde übernommen, wenn der Workflow-Verlauf betrachtet wird, dann enthält er „Check-in" mit Datum, Benutzer und Anzahl neu/geändert/unverändert
- [ ] Angenommen eine DMRL wurde noch nie eingecheckt, wenn ein Check-in (auch ohne Änderung) übernommen wird, dann gelten DMRL, System und Originator als „im Workflow verwendet" (PROJ-4/5/6)
- [ ] Angenommen ein Check-in wurde abgebrochen oder abgelehnt, wenn danach Organisation/System/DMRL betrachtet werden, dann hat sich am Status „im Workflow verwendet" nichts geändert

### Demo
- [ ] Angenommen die Demo-DMRL Fahrzeug wird ausgecheckt, ein neuer Eintrag mit `n` ergänzt und eingecheckt, wenn übernommen wird, dann hat die DMRL 11 Einträge, davon 1 neu *in Bearbeitung*

## Edge Cases
- **Datei einer anderen DMRL:** fällt durch Prüfung (MI, fehlende Einträge — PROJ-8 D/F).
- **Datei aus einem älteren Check-out:** wird gegen den aktuellen Stand beim Check-out geprüft; Abweichungen erscheinen als Änderungen oder Fehler.
- **Sperre wird während der Prüfung/Zusammenfassung vom Administrator aufgehoben:** „Übernehmen" schlägt fehl mit „Die Sperre wurde aufgehoben — Check-in nicht möglich"; nichts übernommen.
- **Berechtigung wird während der Sperre entzogen:** nicht möglich (PROJ-17).
- **Sehr große Datei (z. B. > 5 MB):** wird mit „Datei zu groß" abgelehnt — für Excel und CSV.
- **Excel-Datei noch in Excel geöffnet:** gelesen wird der zuletzt gespeicherte Stand; ungespeicherte Änderungen fehlen (die Zusammenfassung zeigt den Stand) *(Refinement 2026-11-25)*.
- **Spalten in Excel umsortiert oder ergänzt:** wie bei CSV — die Kopfzeile muss den festen Feldnamen entsprechen, sonst Fehler nach PROJ-8 Gruppe S *(Refinement 2026-11-25)*.
- **Autofilter in Excel aktiv (Zeilen ausgeblendet):** ausgeblendete Zeilen werden trotzdem gelesen — ein Filter ändert keine Daten *(Refinement 2026-11-25)*.
- **Formel ohne gespeichertes Ergebnis** (z. B. von einem Werkzeug erzeugt, das nicht rechnet): Zelle gilt als leer; ggf. Fehler nach PROJ-8 (Pflichtfeld) *(Refinement 2026-11-25)*.
- **Excel-Datei einer anderen DMRL:** fällt wie bei CSV durch die Prüfung (MI, fehlende Einträge) *(Refinement 2026-11-25)*.
- **Leere Datei / nur Kopfzeile:** Fehler laut PROJ-8.
- **Speicher voll (localStorage):** Übernahme schlägt mit Fehlermeldung fehl, Datenbestand und Sperre bleiben unverändert (PROJ-1).
- **Nur `answer_comment` weicht ab** (Antwort gleich): wird wie jede Antwortabweichung behandelt *(Refinement 2026-11-14)*.
- **Antwort entfernt** (in der Datei leer, in der DMRL `y`/`n`): gilt als abweichende Antwort; bei Übernahme ist die Antwort danach leer *(Refinement 2026-11-14)*.
- **Eintrag mit fachlicher Änderung und abweichender Antwort, Übernahme nicht gewählt:** fachliche Änderung wird übernommen (*in Bearbeitung*), die bisherige Antwort bleibt *(Refinement 2026-11-14)*.
- **Eintragstyp entfernt** (z. B. `n` → leer): Fehler nach Regel F, wenn der Eintrag *in Bearbeitung* wäre — unabhängig von der Antwortübernahme *(Refinement 2026-11-14, BUG-QA4-1)*.
- **Altbestand *in Bearbeitung* ohne Eintragstyp** (vor der Korrektur entstanden): beim nächsten Check-in Fehler, bis ein Eintragstyp gesetzt ist — repariert den Zustand *(Refinement 2026-11-14)*.
- **Ausgabetyp passt nicht zum Eintragstyp** (z. B. `d` + `new`): Fehler, auch bei unverändertem Altbestand; der Bearbeiter korrigiert den Ausgabetyp (oder den Eintragstyp) in der CSV *(Refinement 2026-11-16)*.
- **Eintragstyp entfernt:** dann keine Typ-Prüfung, aber ggf. Fehler nach Regel F („Eintrag in Bearbeitung braucht einen Eintragstyp“) *(Refinement 2026-11-16)*.
- **Alte Demo-Daten im Browser** (vor der Anpassung gespeichert, PHUNGUN `d` + `new`): Check-in scheitert, bis die Demo-Daten zurückgesetzt oder die Ausgabetypen in der CSV korrigiert werden; korrigierte Einträge werden *in Bearbeitung* *(Refinement 2026-11-16)*.
- **Ausgabetyp in Großbuchstaben** (z. B. `Deleted`): Formatfehler nach Regel A, keine zusätzliche Typ-Meldung *(Refinement 2026-11-16)*.
- **Neuer Eintrag ohne Eintragstyp mit Antwort `n` in der Datei:** wird trotzdem *freigegeben* — maßgeblich ist der fehlende Eintragstyp; die Antwort wird nur bei angekreuzter Übernahme gespeichert *(Refinement 2026-11-18)*.
- **Eintragstyp bei neuem Eintrag vergessen:** der Eintrag würde *freigegeben*; die Zusammenfassung weist „davon N als freigegeben übernommen“ aus, der Bearbeiter kann abbrechen und die Datei korrigieren *(Refinement 2026-11-18)*.
- **Neuer Eintrag ohne Eintragstyp mit beliebigem DM-Ausgabetyp** (z. B. `deleted`): keine Typ-Prüfung (Regel F nur mit Eintragstyp); Format nach Regel A gilt weiter *(Refinement 2026-11-18)*.
- **DMC eines bestehenden Eintrags ohne Eintragstyp geändert:** erscheint als neuer (*freigegebener*) Eintrag plus fehlender bisheriger Eintrag → Fehler „Eintrag … fehlt“ wie bisher *(Refinement 2026-11-18)*.
- **Zwei Tabs:** Übernahme im zweiten Tab nach bereits erfolgtem Check-in schlägt fehl, da keine Sperre mehr besteht.

## Technical Requirements (optional)
- Prüfung und Übernahme im Browser, ohne Serverfunktion, offline lauffähig (Windows-Offline-Paket) *(Refinement 2026-11-25)*
- 1.000 Einträge in wenigen Sekunden prüfen und übernehmen — Excel und CSV
- Maximale Dateigröße 5 MB
- Lesen von `.xlsx` erfordert einen Excel-Leser (entpacken + Blatt auslesen) — Auswahl (eigener Leser mit vorhandenem `fflate` oder Paket) in `/architecture` *(Refinement 2026-11-25)*

## Open Questions
- [x] Testdatei aus echtem MS Excel → bereitgestellt: `tests/fixtures/PHUNGUN-ms-excel-aus-csv.xlsx` (Export-CSV in MS Excel als .xlsx gespeichert; Pfad/Autor entfernt). Führte zur Erweiterung der Blattregel (einziges Blatt). Fälle Formel, Hilfsblatt, neue Zeile werden mit selbst erzeugten Testdateien abgedeckt; eine bearbeitete Original-Excel-Datei ist optional (2026-11-25)
- [ ] Soll PROJ-20 (XML-Prüfung) künftig zusätzlich eine Excel-Datei liefern? → eigenes Refinement von PROJ-20; bis dahin bleibt der CSV-Check-in dafür bestehen (2026-11-25)
- [x] Soll der Prüfbericht eines abgelehnten Check-ins im Workflow-Verlauf festgehalten werden? → Eintrag „Check-in abgelehnt — n Fehler", Prüfbericht selbst wird nicht gespeichert (PROJ-15)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue und geänderte Einträge → *in Bearbeitung*; unveränderte behalten ihren Status | Vorgabe Product Owner | 2026-11-12 |
| Freigabe wird nur aufgehoben, wenn sich etwas geändert hat | PRD: freigegebene DMRL behält Status bis zur Änderung | 2026-11-12 |
| Zusammenfassung mit Vorher/Nachher vor der Übernahme | Keine ungewollten Änderungen übernehmen | 2026-11-12 |
| Abbrechen bzw. Fehler → Sperre bleibt; erneuter Upload ohne neuen Check-out | Korrektur ohne Umweg | 2026-11-12 |
| Nur der Sperrinhaber checkt ein; Administrator hebt fremde Sperren nur auf | Eindeutige Verantwortung | 2026-11-12 |
| Empfänger-Antworten bleiben bis zum nächsten REPLY erhalten | Begründung der Überarbeitung bleibt sichtbar | 2026-11-12 |
| Änderung nur des Eintragstyps zählt als Änderung | Erneutes Senden abgelehnter Einträge mit `n` (NSG) | 2026-11-12 |
| Erster abgeschlossener Check-in (auch ohne Änderung) → „im Workflow verwendet" | Konsistent mit PROJ-4/5/6/9 | 2026-11-12 |
| Abweichende `answer`/`answer_comment` sind kein Fehler mehr, sondern werden optional übernommen | Übernahme von Altbeständen mit Empfängerantworten (PROJ-20) | 2026-11-14 |
| Eine Abfrage für alle abweichenden Antworten (Kästchen, standardmäßig aus) statt je Eintrag | Einfach; bewusste Entscheidung, keine unbemerkte Übernahme | 2026-11-14 |
| Übernommene Antworten sind nur Information; Status nie *freigegeben*/*zu überarbeiten* | PRD: Freigabe nur durch Empfänger per REPLY | 2026-11-14 |
| Übernommene Antwortänderung zählt als Änderung (*in Bearbeitung*, Freigabe der DMRL aufgehoben) | *freigegeben* bleibt immer durch einen REPLY belegt | 2026-11-14 |
| Nach dem Check-in kein Eintrag *in Bearbeitung* ohne Eintragstyp — Fehler nach Regel F, auch bei entferntem Eintragstyp und für Altbestand | QA-Befund BUG-QA4-1: solche Einträge würden nie gesendet, die DMRL nie wieder freigegeben | 2026-11-14 |
| Kriterium „freigegebener Eintrag mit geänderter Antwort → in Bearbeitung“ ersetzt durch Eintrag *zu überarbeiten*; freigegebene Einträge ohne Typ sind bei Antwortübernahme immer gesperrt | QA-Befund BUG-QA4-2: Widerspruch zur Entscheidung „Eintragstyp verlangen“ | 2026-11-14 |
| Antwortübernahme bei Einträgen ohne Eintragstyp verlangt einen Eintragstyp; sonst „Übernehmen“ gesperrt (nur bei angekreuzter Übernahme) | Sonst entstünde ein Eintrag *in Bearbeitung*, der nie gesendet und freigegeben werden kann; entspricht Regel F | 2026-11-14 |
| Eintragstyp und DM-Ausgabetyp müssen beim Check-in zusammenpassen: `n` → `new`, `c` → `changed`/`revised`/`status`, `d` → `deleted`, leer → keine Prüfung; Verstoß = Fehler | Vorgabe Product Owner; ersetzt PROJ-8 „Eintragstyp `d` ohne `deleted` oder umgekehrt erlaubt (unabhängig)“ | 2026-11-16 |
| DM-Ausgabetyp `status` wird gültig (Regel A); `rinstate-*` bleibt ungültig | `status` ist in allen drei Schemas gültig und für `c` vorgesehen | 2026-11-16 |
| Typ-Regel gilt für alle Einträge mit Eintragstyp, auch unveränderten Altbestand | Was erneut gesendet wird, ist immer stimmig; entspricht dem Grundsatz aus BUG-QA4-1 | 2026-11-16 |
| Typ-Regel nur beim Check-in, nicht beim REPLY und nicht in PROJ-20 | Regel G verhindert Änderungen im REPLY; PROJ-20 leitet leere Ausgabetypen bereits ab | 2026-11-16 |
| Regel „Neuer Eintrag muss Eintragstyp ‚n' haben“ entfällt; neue Einträge dürfen `n`, `c`, `d` oder keinen Eintragstyp haben | Vorgabe Product Owner: Eine DMRL aus einem laufenden Projekt hat einen Bearbeitungsstand erreicht, der übernommen werden soll | 2026-11-18 |
| Neue Einträge ohne Eintragstyp werden beim Check-in *freigegeben* (abgestimmter Bestand) | Vorgabe Product Owner; Alternative „*in Bearbeitung*“ verworfen, da solche Einträge nie gesendet würden (Grundsatz BUG-QA4-1) | 2026-11-18 |
| Sind nach dem Check-in alle Einträge *freigegeben*, wird die DMRL *freigegeben* mit Nachweis „Übernahme Bestand per Check-in“ und Freigabestand | Grundregel PROJ-14 (DMRL *freigegeben* ⇔ alle Einträge *freigegeben*); „DMRL bleibt *in Bearbeitung*“ verworfen — Daten wären beim Laden ungültig und ein SEND nie möglich | 2026-11-18 |
| Check-in nimmt `.xlsx` **und** `.csv` an | Vorgabe Product Owner; CSV bleibt nötig für PROJ-20, CSV-Export und offene Check-outs aus der CSV-Zeit | 2026-11-25 |
| ~~Gelesen wird nur das Blatt „Einträge“; fehlt es → Datei abgelehnt~~ — ersetzt 2026-11-25 (Nachtrag) | Eindeutig, auch bei Hilfsblättern des Bearbeiters; „erstes Blatt“ verworfen (falsch bei verschobenen Blättern) | 2026-11-25 |
| Blatt „Einträge“; fehlt es und hat die Mappe genau ein Blatt → dieses; sonst abgelehnt; weitere Blätter ignoriert | Beispieldatei des Product Owners: Export-CSV in MS Excel geöffnet und als .xlsx gespeichert — Excel benennt das einzige Blatt nach der Datei; dieser Weg ist realistisch und soll funktionieren | 2026-11-25 |
| Zellen mit gespeichertem Wert: Formel → Ergebnis, Zahl → Text, Datum → Seriennummer (Formatfehler) | Keine neuen Fehlerarten; „Formeln sind Fehler“ verworfen (zu streng für Hilfsbezüge) | 2026-11-25 |
| Vollständig leere Zeilen werden in Excel ignoriert | Gelöschte Zellinhalte hinterlassen in Excel leere Zeilen; kein fachlicher Fehler | 2026-11-25 |
| `.xls`, `.xlsm`, `.ods` nicht angenommen | Nur das Format, das der Check-out erzeugt; keine Makro-Mappen | 2026-11-25 |
| Apostroph-Entfernung (BUG-QA2-1) nur bei CSV | Excel-Dateien enthalten keinen Formelschutz-Apostroph; echter Text `'=…` bleibt erhalten | 2026-11-25 |
| Excel-Export (PROJ-18) kann bei eigener Sperre eingecheckt werden | Gleicher Aufbau wie der Check-out; konsistent mit dem CSV-Export | 2026-11-25 |
| Demo-Daten leiten den Ausgabetyp aus dem Eintragstyp ab (`n` → `new`, `c` → `changed`, `d` → `deleted`, leer → `new`) | Sonst scheitert jeder Check-in der PHUNGUN-Demo (11 Einträge `d` + `new`); gleiche Zuordnung wie PROJ-20 | 2026-11-16 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Mehrstufiger Check-in-Dialog (Datei → Prüfung → Bericht/Zusammenfassung → Übernahme) | Ablauf im Kontext der DMRL | 2026-11-12 |
| Vergleichsbasis = Kopie der Einträge in der Sperre | Exakter ausgecheckter Stand | 2026-11-12 |
| Zuordnung der Einträge über den DMC; Einträge behalten ihre ID | Fachlicher Schlüssel; stabile Verweise | 2026-11-12 |
| Abgleich einmal berechnet für Regelwerk, Zusammenfassung und Übernahme | Konsistente Ergebnisse | 2026-11-12 |
| Übernahme atomar (Einträge, DMRL-Status, Sperre, Verlauf) | Kein halber Check-in | 2026-11-12 |
| Abgelehnter Check-in: nur Verlaufseintrag; Abbrechen: nichts | PROJ-15 | 2026-11-12 |
| Abgleich trennt fachliche Änderung und Antwortabweichung; Zahlen für beide Fälle aus einem Abgleich | Häkchen schaltet sofort um, ohne erneute Prüfung; Anzeige und Speicherung bleiben deckungsgleich | 2026-11-14 |
| Regel K liefert eine Liste statt Fehlern; „Eintragstyp bei Antwortübernahme“ als bedingte Sperre statt Fehler im Prüfbericht | Ohne Häkchen bleibt eine korrekte Datei fehlerfrei; die Sperre greift nur, wenn sie wirklich nötig ist | 2026-11-14 |
| Ohne Übernahme erhalten neue Einträge leere Antwortfelder | „Bisherige Antworten bleiben“ — neue Einträge hatten keine | 2026-11-14 |
| Kein neues Datenformat; Verlaufstext um Zusatz erweitert | Keine Migration der gespeicherten Daten nötig | 2026-11-14 |
| Eigener Excel-Leser mit `fflate` + XML-Leser des Browsers statt Paket | Kein neues Paket, offline; SheetJS (npm-Version veraltet, Sicherheitsmeldungen) und ExcelJS (groß, viele Abhängigkeiten) verworfen | 2026-11-25 |
| CSV-Leser aufgeteilt: Zerlegen je Format + gemeinsamer Schritt „Tabelle → Einträge“ (Kopfzeile, Spaltenzahl, Trimmen, Nullen, leere Zeilen) | Gleiches Verhalten für Excel und CSV, keine doppelte Logik; Apostroph-Entfernung nur im CSV-Zweig | 2026-11-25 |
| Excel-Zellen über ihre Zelladresse zugeordnet | Excel lässt leere Zellen in der Datei weg | 2026-11-25 |
| Entpackte Größe der Excel-Datei begrenzt (ca. 50 MB) | Schutz vor Zip-Bomben | 2026-11-25 |
| Feste Testdatei aus echtem MS Excel | Excels Speicherweise (gemeinsame Textliste, Formatvorlagen) unterscheidet sich vom eigenen Schreiber | 2026-11-25 |
| Excel und CSV werden zuerst in dieselbe Zeilenstruktur gelesen; Prüfung, Abgleich und Übernahme bleiben unverändert | Ein Regelwerk für beide Formate; keine doppelte Logik | 2026-11-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Der Check-in ist eine Workflow-Aktion nach dem Muster aus PROJ-9 (Verfügbarkeitsregel + atomare Ausführung). Er verbindet die **Prüfung aus PROJ-8** (CSV-Leser, Regelwerk, Prüfbericht) mit einem **Abgleich** gegen den Stand beim Check-out und einer **Übernahme** in einem Schritt. Alles im Browser, kein Backend nötig.

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Aktion „Check-in" (nur Sperrinhaber)
+-- Check-in-Dialog (shadcn Dialog, mehrstufig)
    +-- Schritt 1: Datei wählen
    |   +-- Dateiauswahl / Ablagefläche (nur .csv, max. 5 MB)
    |   +-- Hinweis bei falschem Typ, zu großer Datei oder nicht UTF-8
    +-- Schritt 2: Prüfung läuft (Fortschrittsanzeige)
    +-- Schritt 3a: Fehler
    |   +-- Prüfbericht-Anzeige (PROJ-8) mit „Bericht herunterladen"
    |   +-- „Andere Datei wählen" · „Schließen" (Sperre bleibt)
    +-- Schritt 3b: Zusammenfassung
        +-- Zahlen: geprüft · neu · geändert · unverändert
        +-- Hinweise (z. B. aufgefüllte führende Nullen)
        +-- Liste neuer Einträge (DMC, Tech Name, Eintragstyp)
        +-- Liste geänderter Einträge, je Eintrag aufklappbar (shadcn Accordion): Feld · alt → neu
        +-- „Übernehmen" · „Abbrechen"
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte. Die Übernahme ändert in **einer** Speicherung:
- **Einträge** der DMRL: ersetzt durch den Inhalt der Datei (mit aufgefüllten Nullen); bestehende Einträge behalten ihre ID (Zuordnung über den DMC), neue erhalten eine neue ID; Status laut Tabelle der Spec.
- **DMRL**: Status (*in Bearbeitung* bei Änderung, sonst unverändert), Sperre entfernt. Der Freigabe-Nachweis bleibt erhalten und dient als „Letzte Freigabe" (PROJ-14).
- **Verlauf**: „Check-in" mit Anzahl neu/geändert/unverändert.

Bei Ablehnung wegen Fehlern wird nur ein Verlaufseintrag „Check-in abgelehnt — n Fehler" gespeichert (PROJ-15); Abbrechen speichert nichts.

### C) Abgleich (Stand beim Check-out ↔ Datei)
- **Vergleichsbasis:** Kopie der Einträge in der Sperre (PROJ-9) — nicht der aktuelle Stand, damit der Vergleich genau dem ausgecheckten Stand entspricht.
- **Zuordnung:** über den DMC (alle 11 Teile). Ein in der Datei veränderter DMC gilt als neuer Eintrag; der alte fehlt dann → Fehler laut PROJ-8 F. Ein DMC lässt sich also nicht „umbenennen" (fachlich korrekt: alter Eintrag `d`, neuer `n`).
- **Klassifizierung:** *neu* (DMC vorher nicht vorhanden) · *geändert* (mindestens ein Feld weicht ab, inkl. Eintragstyp; nach Auffüllen der Nullen) · *unverändert*.
- Dieselbe Klassifizierung nutzt das Regelwerk (Gruppe F) — sie wird einmal berechnet und für Prüfung, Zusammenfassung und Übernahme verwendet.

### D) Abläufe
1. **Datei wählen** → Typ, Größe, UTF-8 prüfen.
2. **Prüfen** → CSV-Leser + Regelwerk (PROJ-8, Gruppen S, A–E, I, F, K) mit Prüfkontext (System-MI, Kopie aus der Sperre).
3. **Fehler** → Bericht; Verlaufseintrag „abgelehnt"; erneuter Upload möglich.
4. **Keine Fehler** → Zusammenfassung aus dem Abgleich.
5. **Übernehmen** → Verfügbarkeit erneut prüfen (Sperre noch vorhanden und eigene?) → atomare Speicherung → Dialog schließt, Ansicht zeigt neuen Stand, Erfolgsmeldung. Sperre inzwischen aufgehoben → „Die Sperre wurde aufgehoben — Check-in nicht möglich", nichts gespeichert.

### E) Verfügbarkeitsregel
| Aktion | Verfügbar wenn | sonst |
|---|---|---|
| Check-in | angemeldeter Benutzer = Sperrinhaber (Bearbeiter oder Administrator) | nicht angezeigt (andere sehen nur die Sperre) |

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Mehrstufiger Dialog statt eigener Seite | Ablauf bleibt im Kontext der DMRL; Abbrechen jederzeit. |
| Vergleich gegen die Kopie in der Sperre | Exakt der ausgecheckte Stand ist Basis — unabhängig von späteren Ereignissen. |
| Zuordnung über den DMC | Fachlicher Schlüssel; konsistent mit Regel „Einträge nicht entfernen". |
| Abgleich einmal berechnet, von Regelwerk, Zusammenfassung und Übernahme genutzt | Keine abweichenden Ergebnisse zwischen Anzeige und Speicherung. |
| Übernahme als eine Speicherung | Einträge, Status, Sperre und Verlauf ändern sich zusammen oder gar nicht. |
| Vorher/Nachher aufklappbar je Eintrag | Übersichtlich auch bei vielen Änderungen. |
| UTF-8-Prüfung vor dem Lesen | Klare Meldung statt unlesbarer Umlaute. |

### G) Abhängigkeiten (Pakete)
- **Keine neuen Pakete** (PapaParse aus PROJ-8; shadcn Dialog, Accordion, Progress, Badge installiert).

### H) Testbarkeit
- Unit-Tests: Abgleich (neu/geändert/unverändert, Nullen aufgefüllt = unverändert, nur Eintragstyp geändert = geändert, veränderter DMC), Status nach Übernahme (Tabellen der Spec), DMRL-Status (freigegeben + Änderung → in Bearbeitung; ohne Änderung bleibt), Verlaufseinträge.
- E2E: Fahrzeug auschecken → Eintrag ergänzen → einchecken (11 Einträge, 1 neu); fehlerhafte Datei → Bericht, Sperre bleibt; Abbrechen; Sperre zwischenzeitlich aufgehoben.

### I) Refinement 2026-11-14 — Empfängerantworten aus der Datei übernehmen
Ergänzt das bestehende Design; alles Übrige (A–H) gilt unverändert. Weiterhin alles im Browser, kein Backend.

**Komponenten (Änderungen im Check-in-Dialog, Schritt 3b „Zusammenfassung“)**
```
Zusammenfassung
+-- Zahlen: geprüft · neu · geändert · unverändert   ← passen sich dem Häkchen sofort an
+-- Hinweise, Liste neuer / geänderter Einträge       ← Antwortfelder erscheinen hier nicht mehr
+-- NEU: Abschnitt „Abweichende Empfängerantworten (N Einträge)“ (nur wenn N > 0)
|   +-- Liste je Eintrag (aufklappbar wie bisher, shadcn Accordion):
|   |   DMC · Antwort alt → neu · Begründung alt → neu
|   +-- Kästchen „Antworten aus der Datei übernehmen“ (shadcn Checkbox, standardmäßig aus)
|   +-- Hinweis „Nur Information — freigegeben wird ein Eintrag weiterhin nur durch einen REPLY.“
|   +-- bei Häkchen und betroffenen Einträgen ohne Eintragstyp:
|       Meldung (shadcn Alert, rot) mit Liste der Einträge; „Übernehmen“ gesperrt
+-- „Übernehmen“ · „Abbrechen“
```

**Abgleich (Erweiterung von C)**
- Der Abgleich trennt künftig zwei Arten von Abweichungen je Eintrag:
  - **fachliche Änderung** (alle Felder außer `answer`/`answer_comment`, inkl. Eintragstyp) — bestimmt wie bisher *neu/geändert/unverändert*
  - **Antwortabweichung** (`answer` oder `answer_comment` ≠ Stand beim Check-out; bei neuen Einträgen: nicht leer) — eigenes Merkmal
- Ein Eintrag mit nur abweichenden Antworten gilt zunächst als *unverändert*. Erst wenn die Übernahme gewählt ist, zählt er als *geändert*. Die Zusammenfassung berechnet die Zahlen für beide Fälle aus demselben Abgleich; das Häkchen schaltet nur zwischen ihnen um.
- Der Abgleich wird weiterhin einmal berechnet und von Regelwerk, Zusammenfassung und Übernahme gemeinsam genutzt.

**Regelwerk (PROJ-8)**
- **Regel K** erzeugt keine Fehler mehr, sondern liefert die Liste der Antwortabweichungen an den Dialog.
- **Bedingte Prüfung „Eintragstyp bei Antwortübernahme“**: Einträge ohne Eintragstyp mit reiner Antwortabweichung werden vorab ermittelt. Sie sind keine Fehler im Prüfbericht (ohne Häkchen ist die Datei fehlerfrei), sperren aber „Übernehmen“, sobald das Häkchen gesetzt ist.
- **Regel A** prüft `answer` weiterhin auf leer, `y` oder `n`; **Regel F** bleibt unverändert (Antwortfelder zählen nicht als fachliche Änderung).

**Übernahme (Erweiterung von D, Schritt 5)**
- Die Übernahme erhält zusätzlich die Wahl „Antworten übernehmen ja/nein“ und prüft sie erneut (bei Häkchen und betroffenen Einträgen ohne Eintragstyp: abgelehnt, nichts gespeichert).
- **Ohne Übernahme:** bestehende Einträge behalten ihre bisherigen Antwortfelder; neue Einträge erhalten leere Antwortfelder (es gab keine bisherigen).
- **Mit Übernahme:** alle Einträge erhalten die Antwortfelder aus der Datei; Einträge mit Antwortabweichung werden *in Bearbeitung*.
- Status nie *freigegeben* oder *zu überarbeiten* durch die Übernahme; DMRL-Status wie bisher (*in Bearbeitung*, sobald irgendein Eintrag neu oder geändert ist).
- Weiterhin **eine** atomare Speicherung.

**Datenmodell**
- Keine neuen Objekte und kein neues Datenformat (keine Migration im Browser-Speicher nötig).
- Verlauf „Check-in“: Der Text erhält bei Übernahme den Zusatz „N Antworten aus der Datei übernommen“; der bestehende Eintragstyp „check_in“ bleibt.

**Abhängigkeiten:** keine neuen Pakete (shadcn Checkbox, Alert, Accordion sind installiert).

**Testbarkeit**
- Unit: Abgleich trennt fachliche Änderung und Antwortabweichung; Zahlen mit/ohne Übernahme; Regel K ohne Fehler; bedingte Prüfung „ohne Eintragstyp“; Übernahme mit/ohne Häkchen (Antwortwerte, Status, DMRL-Status, Verlaufstext); neue Einträge ohne Übernahme → leere Antworten; erneute Prüfung bei der Übernahme.
- Komponente: Abschnitt nur bei Abweichungen; Häkchen standardmäßig aus; Zahlen schalten um; Sperre von „Übernehmen“ samt Meldung.
- E2E: Empfängerantworten in der Check-out-CSV ändern → einchecken ohne Häkchen (Antworten bleiben, unverändert) und mit Häkchen (Werte übernommen, *in Bearbeitung*, Verlaufszusatz); freigegebenen Eintrag nur in der Antwort ändern → Sperre bei Häkchen; Durchlauf mit einer über PROJ-20 konvertierten CSV, sobald PROJ-20 umgesetzt ist.

### J) Refinement 2026-11-25 — Check-in von MS-Excel (.xlsx) und CSV
Ergänzt das bestehende Design; Abgleich, Regelwerk, Zusammenfassung, Antwortübernahme und Übernahme (A–I) bleiben unverändert. Neu ist nur **der Weg von der Datei zur Tabelle**. Weiterhin alles im Browser, kein Backend, offline lauffähig.

**Grundidee: zwei Leser, eine Tabelle**
```
Datei wählen
+-- .xlsx → Excel-Leser  ─┐
|                         ├─→ Tabelle (Zeilennummer + Zellen als Text)
+-- .csv  → CSV-Leser   ─┘           │
                                     ▼
              gemeinsamer Schritt „Tabelle → Einträge“ (PROJ-8, Gruppe S)
              Kopfzeile prüfen (28 bzw. alte 27 Spalten) · Spaltenzahl je Zeile
              Werte trimmen · führende Nullen auffüllen (Hinweise) · leere Zeilen überspringen
                                     │
                                     ▼
              Prüfung PROJ-8 · Abgleich · Zusammenfassung · Übernahme  (unverändert)
```
- Heute erledigt der CSV-Leser Zerlegen **und** Kopfzeilen-/Spaltenprüfung in einem. Der zweite Teil wird zu einem **gemeinsamen Schritt**, den beide Formate durchlaufen — so gelten Kopfzeile, alte 27-Spalten-Dateien, Auffüllen der Nullen und Zeilennummern im Prüfbericht automatisch gleich.
- Einziger formatabhängiger Unterschied in diesem Schritt: das Entfernen des Formelschutz-Apostrophs (BUG-QA2-1) **nur bei CSV**.

**Komponenten (Check-in-Dialog, Schritt 1 „Datei wählen“)**
```
Check-in-Dialog (shadcn Dialog, mehrstufig — unverändert bis auf Schritt 1)
+-- Schritt 1: Datei wählen
|   +-- Dateiauswahl / Ablagefläche: nimmt .xlsx und .csv (Hinweistext „Excel- (.xlsx) oder CSV-Datei, max. 5 MB“)
|   +-- Meldungen: falscher Typ · zu groß · nicht UTF-8 (nur CSV) · „Tabellenblatt ‚Einträge‘ fehlt“ · „Excel-Datei kann nicht gelesen werden“
+-- Schritte 2–3 unverändert (Prüfung, Prüfbericht/Zusammenfassung, Übernahme)
```
Der Dialogtitel und Texte, die „CSV“ nennen, werden neutral („Datei“). Keine neuen shadcn-Komponenten.

**Excel-Leser (was er tut, in Klartext)**
1. Die `.xlsx`-Datei ist ein ZIP-Archiv mit XML-Dateien. Sie wird im Browser **entpackt** (vorhandenes `fflate`). Nicht entpackbar → „Excel-Datei kann nicht gelesen werden“.
2. Im Mappen-Verzeichnis wird das Blatt **„Einträge“** gesucht und dessen Tabelle geöffnet. Nicht vorhanden, aber genau ein Blatt in der Mappe → dieses Blatt *(Nachtrag 2026-11-25, Beispieldatei)*. Sonst → „Tabellenblatt ‚Einträge‘ fehlt“. Andere Blätter werden nicht gelesen.
3. Jede Zelle wird über ihre **Zelladresse** (z. B. C5) der richtigen Spalte und Zeile zugeordnet — Excel lässt leere Zellen in der Datei weg; ohne Adressen würden Werte verrutschen.
4. Zellwerte als Text:
   - Text (direkt oder aus Excels gemeinsamer Textliste, auch mit Formatierung innerhalb der Zelle) → unverändert
   - Zahl → so, wie sie in der Datei steht (`1` → „1“), keine Rundung, keine Tausenderpunkte
   - Formel → das **gespeicherte Ergebnis** (Text, Zahl, Wahrheitswert); fehlt es → leer
   - Datumszelle → die gespeicherte Seriennummer (Formatprüfung meldet dann den Fehler)
   - Fehlerwert (z. B. `#NV`) → als Text, fällt dann durch die Formatprüfung
5. Ergebnis: Tabelle mit **Zeilennummern des Blatts** — der Prüfbericht nennt dieselbe Zeile, die der Bearbeiter in Excel sieht.

- Gelesen wird die XML mit dem **eingebauten XML-Leser des Browsers** — derselbe, mit dem die DMRL-XML beim REPLY-Import gelesen wird (PROJ-13). Er lädt keine externen Inhalte nach.
- **Schutz vor „Zip-Bomben“:** Neben der Dateigröße (5 MB) wird auch die entpackte Größe begrenzt (z. B. 50 MB); darüber → „Excel-Datei kann nicht gelesen werden“.
- Blattname, Spaltenliste und Aufbau stammen aus dem gemeinsamen Baustein „Einträge als Excel“ (PROJ-9 Tech Design I) — Schreiber und Leser nutzen dieselbe Definition.

**Datei wählen (Erweiterung von D, Schritt 1)**
| Prüfung | Excel | CSV |
|---|---|---|
| Endung | `.xlsx` (Groß-/Kleinschreibung egal) | `.csv` |
| Größe | max. 5 MB | max. 5 MB |
| Lesen | entpacken, Blatt „Einträge“ (bzw. einziges Blatt), Zellen | UTF-8 streng |
| Andere Endung | „Bitte eine Excel- (.xlsx) oder CSV-Datei auswählen“ | |

Alle Dateifehler werden wie bisher im Auswahlschritt angezeigt und **nicht** im Verlauf protokolliert; der Bearbeiter kann sofort eine andere Datei wählen.

**Datenmodell**
- **Unverändert.** Keine neuen Objekte, keine Umstellung gespeicherter Daten; die Datei selbst wird nicht gespeichert. Verlaufstexte bleiben gleich („Check-in — x neu, y geändert, z unverändert“).

**Auswirkung auf bestehende Teile**
| Teil | Änderung |
|---|---|
| Datei lesen (Check-in) | unterscheidet `.xlsx`/`.csv`; Ergebnis ist eine Tabelle statt eines Textes |
| CSV-Leser (PROJ-8) | aufgeteilt in „CSV zerlegen“ und gemeinsamen Schritt „Tabelle → Einträge“; Verhalten für CSV unverändert |
| Prüfeinstieg (PROJ-8) | nimmt die Tabelle statt des CSV-Textes; Regeln selbst unverändert |
| Check-in-Dialog | Dateiauswahl für beide Formate, Texte neutral |
| PROJ-20 (XML-Prüfung) | nicht betroffen — erzeugt weiter CSV, die hier weiterhin angenommen wird |

**Reihenfolge der Umsetzung**
Gemeinsam mit PROJ-9 in einem `/frontend`-Lauf (PROJ-9 Tech Design I): Excel-Leser und Check-out-Excel werden zusammen gebaut und im Rundlauf getestet.

**Technische Entscheidungen (für PM erklärt)**
| Entscheidung | Warum |
|---|---|
| Eigener, kleiner Excel-Leser statt Fremdpaket | Wir lesen nur ein Blatt mit Text in bekannten Spalten. `fflate` (entpacken) und der XML-Leser des Browsers sind schon da → kein neues Paket, offline, kleiner Umfang. Verworfen: **SheetJS** (`xlsx`) — die Version im npm-Verzeichnis ist veraltet (0.18.5) mit bekannten Sicherheitsmeldungen, neuere nur außerhalb von npm; **ExcelJS** — groß, für Server gedacht, zieht viele weitere Pakete nach. |
| Zwei Leser, ein gemeinsamer Schritt „Tabelle → Einträge“ | Kopfzeile, alte 27-Spalten-Dateien, Nullen auffüllen und Zeilennummern gelten für beide Formate identisch; keine doppelte Logik. |
| Zellen über ihre Adresse zuordnen | Excel speichert leere Zellen nicht; nur so landen Werte sicher in der richtigen Spalte. |
| Formel → gespeichertes Ergebnis | Spec-Vorgabe; der Browser rechnet keine Formeln nach. |
| Entpackte Größe begrenzen | Schutz vor manipulierten Dateien, die beim Entpacken den Browser lahmlegen. |
| Prüfbericht mit Zeilennummer des Blatts | Bearbeiter findet die Zeile in Excel sofort. |

**Abhängigkeiten (Pakete)**
- **Keine neuen Pakete** — `fflate` (bereits installiert, PROJ-18), XML-Leser des Browsers, PapaParse (CSV, wie bisher).

**Testbarkeit**
- Unit (Excel-Leser): Datei aus dem eigenen Excel-Schreiber (Rundlauf ohne Änderung); Blatt „Einträge“ an zweiter Stelle; einziges Blatt mit anderem Namen wird gelesen; mehrere Blätter ohne „Einträge“ → Fehler; keine ZIP-Datei / beschädigt; entpackte Größe zu groß; ausgelassene leere Zellen (Werte bleiben in der richtigen Spalte); gemeinsame Textliste inkl. Formatierung in der Zelle; Zahl `1` in `security` → `01` mit Hinweis; Formel mit gespeichertem Ergebnis bzw. ohne; Datumszelle → Formatfehler; vollständig leere Zeilen; Text `'=…` bleibt unverändert; Zeilennummern im Prüfbericht.
- Unit (gemeinsamer Schritt): bestehende CSV-Tests laufen unverändert weiter (Kopfzeile, 27/28 Spalten, Apostroph-Entfernung nur CSV).
- **Testdatei aus echtem MS Excel (vorhanden):** `tests/fixtures/PHUNGUN-ms-excel-aus-csv.xlsx` — Export-CSV der Demo-DMRL PHUNGUN, in MS Excel (Windows) geöffnet und als .xlsx gespeichert: ein Blatt mit Dateinamen, gemeinsame Textliste, 151 Zahlzellen, Werte mit führender Null als Text, keine Textformatierung/fixierte Kopfzeile. Gespeicherter Pfad und Autorname wurden entfernt; sonst unverändert. Erwartung: fehlerfrei, 32 Einträge unverändert *(Nachtrag 2026-11-25, Beispieldatei)*.
- **Weitere Testdatei (optional):** Eine ausgecheckte Datei, in MS Excel geöffnet, bearbeitet (neue Zeile, Änderung, Formel, Hilfsblatt) und gespeichert, wird als feste Testdatei abgelegt — sie deckt Excels eigene Speicherweise ab (gemeinsame Textliste, Formatvorlagen), die der eigene Schreiber nicht erzeugt.
- Komponente: Dateiauswahl nimmt `.xlsx` und `.csv`, Meldungen für die neuen Fehlerfälle.
- E2E: Check-out → Excel-Datei herunterladen → per Test bearbeiten (neue Zeile) → einchecken → 1 neu; Check-in einer PROJ-20-CSV weiterhin möglich; `.xls` abgelehnt. Bestehende E2E-Tests, die die Check-out-CSV bearbeiten, werden auf Excel umgestellt.

### K) Refinement 2026-11-26 — `dmc` und Informationsfelder
Gemeinsames Design mit dem Check-out → **PROJ-9, Tech Design J** (Abschnitte „Dateien lesen" und „Vergleich und Übernahme beim Check-in"). Kurzfassung für den Check-in: Gruppe S akzeptiert 37/28/27 Spalten; `dmc` wird verworfen; Informationsfelder werden getrennt verglichen (wie Antwortfelder), ohne Prüfung übernommen bzw. bei Dateien ohne diese Spalten erhalten; Abweichungen nur dort ändern weder Eintrags- noch DMRL-Status; Zusammenfassung/Verlauf mit Zähler „Informationsfelder bei N Einträgen aktualisiert". Umsetzung gemeinsam mit PROJ-9.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend` (PROJ-10)_

**Umgesetzt**
- `src/lib/workflows/check-in.ts` — Verfügbarkeit (nur Sperrinhaber), Datei lesen (nur `.csv`, höchstens 5 MB, UTF-8 streng geprüft), Prüfung über PROJ-8 gegen die Kopie in der Sperre, Verlaufseintrag „Check-in abgelehnt — n Fehler" und atomare Übernahme: Einträge durch den Dateiinhalt ersetzen (IDs per DMC erhalten), neue/geänderte → *in Bearbeitung*, unveränderte behalten ihren Status; DMRL-Status → *in Bearbeitung* nur bei Änderungen (sonst bleibt er, z. B. *freigegeben*); Sperre aufheben; Verlauf „Check-in — x neu, y geändert, z unverändert". Vor der Übernahme wird erneut geprüft, ob die Sperre noch besteht.
- `src/components/workflows/check-in-dialog.tsx` — Dialog in drei Schritten: Datei wählen (Ziehen & Ablegen oder Auswahl) → Prüfung → Prüfbericht (bei Fehlern, mit „Andere Datei wählen") bzw. Zusammenfassung mit Kacheln (geprüft/neu/geändert/unverändert), Tabelle der neuen Einträge und aufklappbaren Änderungen (alt → neu je Feld) und „Übernehmen".
- `src/lib/dmrl/actions.ts`, `src/components/dmrl/dmrl-view.tsx` — Aktion „Check-in" für den Sperrinhaber angebunden.

**Tests**: `check-in.test.ts` (8), `check-in-dialog.test.tsx` (5); `dmrl-view.test.tsx` angepasst (Check-in nur für den Sperrinhaber sichtbar) — insgesamt 280 Unit-Tests grün.

**Hinweise**
- Dateifehler (Typ, Größe, Kodierung) werden im Auswahlschritt gemeldet und nicht im Verlauf protokolliert; nur fachlich abgelehnte Dateien erzeugen „Check-in abgelehnt".
- Browser-E2E-Tests stehen aus → `/qa`.

### Refinement 2026-11-14 — Empfängerantworten aus der Datei übernehmen
_Stand 2026-11-14 — `/frontend proj-10` (Tech Design I)_

**Umgesetzt**
- `src/lib/rules/check/checkin.ts`
  - Der Abgleich trennt Antwortfelder von den übrigen Feldern: `changedFields` enthält keine Antwortfelder mehr, neues Merkmal `answerChanged` je Eintrag (bei neuen Einträgen: Antwort oder Begründung nicht leer). *neu/geändert/unverändert* richtet sich nur nach den übrigen Feldern.
  - Regel K liefert keine Fehler mehr: `answerDeviations` (Liste der Abweichungen) und `answerTakeoverBlockers` (Einträge ohne Eintragstyp mit reiner Antwortabweichung). Die Gruppe K kommt im Prüfbericht nicht mehr vor.
  - `effectiveClassification` und `checkinSummary(…, takeAnswers)`: Mit Übernahme zählt eine reine Antwortabweichung als *geändert*; beide Zählungen kommen aus demselben Abgleich.
- `src/lib/workflows/check-in.ts` — `executeCheckIn(…, at, takeAnswers = false)`:
  - Ohne Übernahme behalten bestehende Einträge ihre Antworten aus dem Stand beim Check-out, neue Einträge bekommen leere Antwortfelder.
  - Mit Übernahme gelten die Werte aus der Datei; betroffene Einträge werden *in Bearbeitung* (nie *freigegeben*/*zu überarbeiten*).
  - Bei Übernahme mit betroffenen Einträgen ohne Eintragstyp wird abgelehnt (erneute Prüfung beim Speichern).
  - Verlaufszusatz „; N Antworten aus der Datei übernommen“.
- `src/components/workflows/check-in-dialog.tsx` — neuer Abschnitt „Abweichende Empfängerantworten (N Einträge)“ in der Zusammenfassung:
  - aufklappbare Liste (Accordion) mit DMC, Antwort bisher → aus der Datei, Tabelle Antwort/Kommentar
  - Kästchen „Antworten aus der Datei übernehmen“ (Checkbox, standardmäßig aus) mit Hinweis „Nur Information …“
  - Kacheln schalten sofort um
  - bei Häkchen und betroffenen Einträgen ohne Eintragstyp: rote Meldung mit Liste, „Übernehmen“ gesperrt
  - Erfolgsmeldung nennt die übernommenen Antworten
- `src/components/dmrl/entry-table.tsx` — `ANSWER_LABEL` exportiert („genehmigt (y)“ / „abgelehnt (n)“) und im Dialog wiederverwendet.

**Tests**
- Unit: `checkin.test.ts` — Gruppe K neu (5 Tests: keine Fehler, Liste inkl. neuer Einträge, Trennung der Felder und Zahlen mit/ohne Übernahme, Sperre nur ohne Eintragstyp, ungültiger Antwortwert bleibt Formatfehler A); `check-in.test.ts` (+3: ohne Übernahme, mit Übernahme inkl. Verlauf und DMRL-Status, Sperre); `check-in-dialog.test.tsx` (+3: Abschnitt/Häkchen/Zahlen/Übernahme, ohne Häkchen, Sperre mit Meldung). Insgesamt 442 Unit-Tests grün.
- E2E: `tests/PROJ-10-checkin-antworten.spec.ts` (3): echte Check-out-CSV mit geänderter Begründung → mit Häkchen übernommen bzw. ohne Häkchen unverändert; 375 px ohne waagerechtes Scrollen. Regression Check-in/Freigabe/SEND/Archiv (14 E2E-Tests) grün.

**Hinweis:** Der Durchlauf mit einer über PROJ-20 konvertierten CSV folgt, sobald PROJ-20 umgesetzt ist.

**Bugfix BUG-QA4-1 (2026-11-14):** Regel F erweitert — siehe Bug-Status im QA-Lauf 4. Keine Änderung am Dialog nötig: Die Meldung erscheint im bestehenden Prüfbericht, „Übernehmen“ ist bei Fehlern ohnehin nicht verfügbar. Die bedingte Sperre der Antwortübernahme bleibt für reine Antwortabweichungen ohne Eintragstyp.

**UI-Fix Dialogbreite (2026-11-16):** Der Prüfbericht (6 Spalten inkl. „Meldung“) war im Check-in-Dialog (`sm:max-w-3xl`) abgeschnitten, der ganze Dialog musste waagerecht gescrollt werden. Dialog jetzt `sm:max-w-6xl` (bis 1152 px, auf kleineren Fenstern volle Breite abzüglich Rand); `[&>*]:min-w-0` verhindert, dass breite Tabellen den Dialog aufweiten — bei sehr schmalen Fenstern scrollt nur noch die Tabelle selbst.

### Refinement 2026-11-16 — Eintragstyp ↔ DM-Ausgabetyp
_Stand 2026-11-16 — `/frontend proj-10`; ohne eigenes Tech Design (kleine Regeländerung, kein neuer Bildschirm)_

**Umgesetzt**
- `src/lib/dmrl/issue-type.ts` (neu) — eine Stelle für die Ausgabetypen:
  - `ISSUE_TYPES` (gültige Werte für Regel A inkl. `status`)
  - `ALLOWED_ISSUE_TYPES_BY_ENTRY_TYPE` (n → new; c → changed/revised/status; d → deleted)
  - `deriveIssueType` (bisher in `xml-check.ts`; dort jetzt weiterexportiert, Verhalten von PROJ-20 unverändert)
- `src/lib/rules/check/entry-rules.ts` — Regel A: Ausgabetyp `status` gültig; Meldung „new, changed, revised, deleted oder status“.
- `src/lib/rules/check/checkin.ts`:
  - neue Prüfung `checkIssueTypeMatchesEntryType` (Gruppe F, Feld `type`), Aufruf in `checkEntryTypes` — läuft also nur beim Check-in, nicht beim REPLY und nicht in PROJ-20
  - geprüft werden alle Einträge der Datei mit Eintragstyp, auch unveränderter Altbestand
  - übersprungen werden ein leerer Eintragstyp, ein ungültiger Ausgabetyp (nur Regel A meldet) und ein leerer Ausgabetyp (nur Regel B meldet)
  - Meldung: „Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘“
- `src/lib/data/demo-data.ts` — PHUNGUN-Einträge erhalten den Ausgabetyp per `deriveIssueType` (11 × `deleted`, 21 × `new`).
- **Keine Änderung am Dialog:** Die Meldung erscheint im bestehenden Prüfbericht. Bei Fehlern ist „Übernehmen“ ohnehin nicht verfügbar.

**Tests**
- Neu in `checkin.test.ts`, Block „Gruppe F — Eintragstyp ↔ DM-Ausgabetyp“ (21 Fälle):
  - alle erlaubten Kombinationen und alle Verstöße mit genauem Meldungstext
  - Zeile, DMC und Feld in der Meldung
  - Einträge ohne Eintragstyp werden nicht geprüft
  - unveränderter Altbestand `d` + `new` wird gemeldet; die Korrektur gilt als Änderung
  - neue Einträge
  - `change`, `Deleted` und `rinstate-changed` ergeben nur einen Formatfehler A, ein leerer Ausgabetyp nur einen Pflichtfeldfehler B
  - Demo PHUNGUN
- Angepasst wurden Testdaten, die `c`/`d` mit Ausgabetyp `new` bzw. `deleted` kombiniert hatten:
  - `check-in.test.ts`, `qa-proj7-10.test.ts`, `release.test.ts`, `check-in-dialog.test.tsx`
  - `demo-data.test.ts`
  - `xml-check.test.ts`: Der Helfer `withIssueData` leitet den Ausgabetyp jetzt aus dem Eintragstyp ab.
- Ergebnis:
  - Vitest 539/539 ✅
  - Playwright Chrome 117/117 ✅ (Mobile Safari nicht lauffähig, WebKit nicht installiert, wie bisher)
  - `tsc` ohne Fehler; ESLint 0 Fehler (1 bestehende Warnung in `use-toast.ts`)

**Hinweise**
- Bereits im Browser gespeicherte Demo-Daten (PHUNGUN `d` + `new`) werden nicht umgestellt. Ohne Zurücksetzen meldet der Check-in dort Typ-Fehler, wie in der Spec vorgesehen.
- Ein Eintrag mit `n` und Ausgabetyp `deleted` ist jetzt ein Fehler. Vorher war diese Kombination ausdrücklich erlaubt.

### Refinement 2026-11-18 — Bestand übernehmen (Regel F1 entfällt)
**Umgesetzt 2026-11-18 (`/frontend proj-10`)**

- **Regelwerk** (`src/lib/rules/check/checkin.ts`)
  - Prüfung „Neuer Eintrag muss Eintragstyp ‚n' haben.“ entfernt; neue Einträge dürfen `n`, `c`, `d` oder keinen Eintragstyp haben. Die Typ-Regel (Eintragstyp ↔ DM-Ausgabetyp) gilt weiter für neue Einträge mit Eintragstyp.
  - neu: `isReleasedOnTakeover` / `releasedOnTakeover` (neu **und** ohne Eintragstyp); `CheckinSummary.alsFreigegeben` zählt diese Einträge.
- **Übernahme** (`src/lib/workflows/check-in.ts`, `executeCheckIn`)
  - neue Einträge ohne Eintragstyp → *freigegeben*, alle anderen neuen → *in Bearbeitung*.
  - DMRL-Status: *freigegeben*, wenn mindestens ein Eintrag als *freigegeben* übernommen wurde **und** danach alle Einträge *freigegeben* sind. Dann werden Freigabe-Nachweis (`release`, `replyArchiveId: null`) und ein Freigabestand (`replyArchiveId: null`) gespeichert. Sonst gilt die bisherige Regel (Änderung → *in Bearbeitung*, keine Änderung → unverändert). Ein Check-in ohne Änderung erzeugt keinen neuen Nachweis.
  - Verlaufstext: „Check-in — N neu (davon M als freigegeben übernommen), …“, bei Freigabe zusätzlich „— DMRL freigegeben (Übernahme Bestand)“ (kein neuer Verlaufstyp).
- **Datenmodell** (`src/lib/data/schema.ts`): `replyArchiveId` in Freigabe-Nachweis und Freigabestand ist jetzt `null`-fähig (null = Übernahme per Check-in). Die Ladeprüfung prüft den REPLY-Verweis nur, wenn er gesetzt ist. Die Formatversion bleibt gleich: Gespeicherte Daten bleiben gültig, eine Migration ist nicht nötig.
- **Anzeige**
  - Check-in-Dialog: Überschrift „Neue Einträge (N, davon M als freigegeben übernommen)“, grüner Hinweis „Bestand übernehmen“ mit der Aufforderung, bei vergessenem Eintragstyp abzubrechen, sowie die Spalte „Status danach“. Die Erfolgsmeldung nennt die Zahl und gegebenenfalls „Die DMRL ist freigegeben.“
  - Kopfbereich (`dmrl-header.tsx`): „Freigegeben am [Datum] durch Übernahme Bestand per Check-in — übernommen von [Name]“. Die Angabe „Letzte Freigabe: [Datum], Übernahme per Check-in“ kommt aus `releaseLabel` (`release.ts`, neu: `isCheckinRelease`, `releaseSourceLabel`).
  - Freigabestand-Seite: Titel „Freigabestand vom … (Übernahme per Check-in)“, statt Empfänger steht „Übernahme Bestand per Check-in“. Archiv-Tab „Freigabestände“: Spalte „REPLY“ heißt jetzt „Herkunft“.
  - XML-Export eines Check-in-Freigabestands: Ohne REPLY fällt `dmlc`/`dmlref` auf den eigenen DML-Code zurück, über denselben Weg wie bisher für fehlende SEND-Angaben.
- **Tests**
  - `checkin.test.ts`: F1-Test ersetzt (n/c/d/leer fehlerfrei, `alsFreigegeben`); Typ-Regel bei neuem `c`; keine Typ-Prüfung ohne Eintragstyp.
  - `check-in.test.ts`, Block „Bestand übernehmen“ (4 Fälle): Mischfall, alle freigegeben (Nachweis und Freigabestand), Erstübernahme in eine leere DMRL, kein neuer Nachweis ohne Änderung. Die Ladeprüfung ist jeweils gültig.
  - `release.test.ts`: Beschriftung, CSV und XML eines Freigabestands ohne REPLY.

### Refinement 2026-11-21 — `answer_timestamp` (umgesetzt mit `/frontend PROJ-13`)
- `src/lib/rules/check/csv-reader.ts`: 28 Spalten; eine CSV mit 27 Spalten (ohne `answer_timestamp`) wird weiterhin angenommen (`LEGACY_CSV_COLUMNS`, `expectedColumns`).
- `src/lib/rules/check/checkin.ts`: `answer_timestamp` zählt nie als Änderung oder Antwortabweichung (`isIgnoredField`, `NON_BUSINESS`).
- `src/lib/workflows/check-in.ts`: Wert aus der Datei wird nie übernommen; mit „Antworten aus der Datei übernehmen“ erhalten Einträge mit abweichender Antwort den Zeitpunkt des Check-ins (leer, wenn die Antwort leer ist), alle übrigen behalten ihren Wert.
- Tests: `check-in.test.ts` (+4), E2E `PROJ-10-checkin-antworten.spec.ts` (28 Spalten).


### Refinement 2026-11-25 — Check-in von MS-Excel (.xlsx) und CSV
_Stand 2026-11-25 — `/frontend PROJ-9 PROJ-10` (Tech Design J)_

**Umgesetzt**
- `src/lib/files/xlsx-reader.ts` (neu) — Excel-Leser mit `fflate` (entpacken) und dem XML-Leser des Browsers: Blatt „Einträge“, sonst einziges Blatt, sonst „Blatt fehlt“; Zellen über ihre Adresse; Werte als gespeicherter Wert (gemeinsame Textliste inkl. formatierter Texte ohne Lautschrift, Inline-Text, Zahl wie gespeichert, Formel → gespeichertes Ergebnis bzw. leer, Wahrheitswert, Fehlerwert); nur benötigte Teile werden entpackt, entpackte Größe max. 50 MB (`MAX_XLSX_UNPACKED_BYTES`), sonst „nicht lesbar“.
- `src/lib/rules/check/csv-reader.ts` — aufgeteilt in `csvTable` (CSV zerlegen) und den gemeinsamen Schritt `readCheckinTable` (Kopfzeile 28/27 Spalten, Spaltenzahl, Trimmen, führende Nullen, leere Zeilen). `readCheckinCsv` verhält sich unverändert. Unterschiede für Excel: fehlende Zellen am Zeilenende gelten als leer; kein Entfernen des Formelschutz-Apostrophs.
- `src/lib/rules/check/checkin.ts` — `runCheckinCheck` nimmt CSV-Text oder Excel-Tabelle (`CheckinInput`); Regeln unverändert.
- `src/lib/workflows/check-in.ts` — `readCheckinFile` unterscheidet `.xlsx`/`.csv` (Groß-/Kleinschreibung egal), 5 MB für beide; Meldungen „Bitte eine Excel- (.xlsx) oder CSV-Datei auswählen.“, „Excel-Datei kann nicht gelesen werden.“, „Tabellenblatt ‚Einträge‘ fehlt.“
- `src/components/workflows/check-in-dialog.tsx` — Dateiauswahl für `.xlsx` und `.csv`, Texte neutral („Die Datei wird … geprüft“, Feld „Datei für den Check-in“).

**Tests**
- Unit: neu `xlsx-reader.test.ts` (11: Rundlauf, Blattwahl inkl. einziges Blatt/mehrere ohne „Einträge“, beschädigt, Zip-Bombe, Zelladressen, Zellarten, **Testdatei aus MS Excel**) und `check-in-xlsx.test.ts` (9: unverändert, neue Zeile + Änderung inkl. Übernahme, Zahl `1` → `01`, Datumszelle → Fehler A, `'=x` bleibt, leere Zeilen und Zeilennummern des Blatts, Werte außerhalb der 28 Spalten, **Testdatei gegen Demo-Stand PHUNGUN: keine Fehler, 32 unverändert**, 5 MB, Endung in Großbuchstaben); `check-in.test.ts`/`check-in-dialog.test.tsx` an neue Meldungen angepasst.
- E2E: `tests/PROJ-9-10-excel.spec.ts` (unverändert einchecken → keine Änderungen; ergänzte Zeile → 1 neu, 11 Einträge; `.xls` abgelehnt, beschädigte `.xlsx` nicht lesbar, CSV weiterhin möglich); `PROJ-18-export.spec.ts`: Export-Excel wird bei eigener Sperre angenommen (ersetzt „Check-in lehnt .xlsx ab“).
- Gesamt: 685 Unit-Tests und 151 E2E-Tests grün.

**Hinweise / Abweichungen**
- Die Begrenzung der entpackten Größe stützt sich auf die im ZIP angegebenen Größen der benötigten Teile; Teile außerhalb von Mappe, Beziehungen, Textliste und Blättern werden nicht entpackt.
- Die Seite „XML prüfen“ (PROJ-20) spricht weiter von „CSV im Check-out-Format“ — Spalten sind identisch, der Text ist weiterhin zutreffend genug; Anpassung ggf. mit dem offenen PROJ-20-Refinement.

### Refinement 2026-11-26 — `dmc` und Informationsfelder
_Stand 2026-11-26 — gemeinsam mit PROJ-9 umgesetzt; Details → PROJ-9, Implementation Notes „Refinement 2026-11-26“ (Leser Gruppe S, Vergleich `infoChanged`, Übernahme/Erhalt der Informationsfelder, Hinweis im Dialog)._

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
- [x] Zugriff (4/4), Prüfung (7/7), Übernehmen/Abbrechen (7/7), DMRL-Status (3/3), Nachvollziehbarkeit (3/3), Demo (1/1) — Unit (`check-in.test.ts`, `qa-proj7-10.test.ts`), Dialogtests, `release.test.ts` (Statustabellen)
- [x] Nachweis neu in dieser QA: geänderter Eintrag „zu überarbeiten" → *in Bearbeitung*, `answer`/`answer_comment` bleiben erhalten; abgelehnter Check-in ändert „im Workflow verwendet" nicht

### Edge Cases Status
- [x] Datei einer anderen DMRL, älterer Check-out, Sperre zwischenzeitlich aufgehoben, Berechtigungsentzug, > 5 MB, leere Datei/nur Kopfzeile, Speicher voll (Meldung, nichts gespeichert — PROJ-1), zwei Tabs

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Empfänger-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 25/25 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

### QA-Lauf 4 — Refinement 2026-11-14 (Empfängerantworten aus der Datei übernehmen)

**Tested:** 2026-11-14 · **Tester:** QA Engineer (AI) · **Browser:** Chrome (Playwright, `PW_CHANNEL=chrome`); Firefox/Safari nicht installiert
**Automatisiert:** Vitest 444 ✅ (1 übersprungen: BUG-QA4-1, nach Behebung aktivieren) · Playwright 72/72 ✅ Gesamtlauf + 2 neue QA-Tests (XSS, 768 px) in `tests/PROJ-10-checkin-antworten.spec.ts`

#### Acceptance Criteria Status (Abschnitt „Empfängerantworten aus der Datei“)
- [x] Abweichende Antworten sind kein Fehler; Abschnitt „Abweichende Empfängerantworten (N Einträge)“ mit DMC und alt → neu (Unit, Komponente, E2E)
- [x] Häkchen standardmäßig aus, Hinweis „Nur Information …“ sichtbar (Komponente, E2E)
- [x] Ohne Häkchen: bisherige Antworten bleiben, reine Antwortabweichung = unverändert; neue Einträge ohne Antwort (Unit, Komponente, E2E)
- [x] Mit Häkchen: Werte aus der Datei, betroffene Einträge *in Bearbeitung*; ein übernommenes `y` gibt nie frei — auch bei einem Eintrag *zu überarbeiten* (Unit, QA-Test neu)
- [ ] **Nicht erreichbar (BUG-QA4-2):** „freigegebener Eintrag mit nur geänderter Antwort + Übernahme → *in Bearbeitung*, Freigabe der DMRL aufgehoben“ — freigegebene Einträge haben nie einen Eintragstyp, die Übernahme wird deshalb immer gesperrt (so beabsichtigt laut späterer Entscheidung)
- [x] Neuer Eintrag mit `y` und Übernahme → *in Bearbeitung* mit `answer = y` (Unit)
- [x] Ungültiger Antwortwert bleibt Formatfehler A (Unit)
- [x] Verlauf „N Antworten aus der Datei übernommen“ (Unit, Komponente, E2E)
- [x] Ohne Abweichung weder Abschnitt noch Häkchen (Komponente)
- [x] Eintrag ohne Eintragstyp, nur Antwort abweichend: Häkchen sperrt „Übernehmen“ mit Meldung und Liste; ohne Häkchen wieder möglich (Komponente, Screenshot geprüft)
- [x] Zahlen neu/geändert/unverändert schalten mit dem Häkchen sofort um (Komponente, E2E)
- [x] Regression: alle bisherigen Kriterien von PROJ-10 und PROJ-8 (Unit + 72 E2E-Tests)

#### Edge Cases Status
- [x] Nur `answer_comment` weicht ab → wie jede Antwortabweichung (E2E)
- [x] Antwort in der Datei entfernt → gilt als Abweichung; bei freigegebenem Eintrag gesperrt, bei Eintrag mit Typ übernommen (Unit)
- [x] Fachliche Änderung + abweichende Antwort ohne Häkchen → fachliche Änderung übernommen, bisherige Antwort bleibt (Unit)
- [ ] **Eintragstyp entfernt** (mit oder ohne Antwortübernahme) → Eintrag *in Bearbeitung* ohne Eintragstyp (BUG-QA4-1)

#### Security Audit Results
- [x] XSS: HTML in der Begründung wird im Abschnitt als Text angezeigt und unverändert als Text gespeichert; kein Skript ausgeführt (E2E, Unit)
- [x] Formelschutz: Begründungen mit `=`… überstehen Check-out → Check-in unverändert (BUG-QA2-1-Test weiterhin grün)
- [x] Keine vorgetäuschte Freigabe: Übernahme setzt nie *freigegeben*; Sperre wird beim Speichern erneut geprüft (Unit)
- [x] Responsive: 375 px und 768 px ohne waagerechtes Scrollen (E2E); 1280 px per Screenshot geprüft

#### Bugs Found

##### BUG-QA4-1: Eintrag ohne Eintragstyp kann „in Bearbeitung“ werden und wird dann nie gesendet
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Fahrzeug-DMRL auschecken (Einträge *in Bearbeitung*, Eintragstyp `n`)
  2. In der CSV bei einem Eintrag den Eintragstyp leeren; optional zusätzlich `answer` auf `y` setzen
  3. Einchecken (mit Antwort: „Antworten aus der Datei übernehmen“ ankreuzen) und übernehmen
  4. Expected: Abweisung bzw. Sperre — ein Eintrag *in Bearbeitung* braucht einen Eintragstyp, sonst kann er nie gesendet und freigegeben werden (Begründung der Entscheidung vom 2026-11-14)
  5. Actual: kein Fehler, keine Sperre; der Eintrag ist *in Bearbeitung* ohne Eintragstyp. SEND nimmt ihn nicht mit (nur `n`/`c`/`d`), ein REPLY ändert ihn nicht → die DMRL kann nicht mehr freigegeben werden, bis erneut ausgecheckt und ein Eintragstyp gesetzt wird
- **Ursache:** Regel F verlangt einen Eintragstyp nur bei fachlichen Änderungen; das Entfernen des Eintragstyps zählt nicht als fachlich. Die neue Sperre der Antwortübernahme greift nur bei „nur Antwort abweichend“ — mit gleichzeitig entferntem Eintragstyp gilt der Eintrag als *geändert* und fällt durch.
- **Hinweis:** Der Fall ohne Antwort bestand schon vor dem Refinement (seit dem MVP), wurde aber erst jetzt gefunden.
- **Vorschlag:** Regel F: Jeder Eintrag, der nach dem Check-in *in Bearbeitung* wäre, braucht `n`, `c` oder `d` (deckt beide Wege ab; die bedingte Sperre der Antwortübernahme kann darin aufgehen). Produktentscheidung nötig, ob das Entfernen des Eintragstyps je erlaubt sein soll.
- **Test:** `src/lib/workflows/qa-proj7-10.test.ts` „BUG-QA4-1 …“ als `it.skip` hinterlegt (schlägt mit dem aktuellen Code fehl) — nach der Behebung aktivieren
- **Priority:** Fix before Weitergabe
- **Status:** Spec geklärt 2026-11-14 (`/refine PROJ-10`): Regel F verlangt für jeden Eintrag, der nach dem Check-in *in Bearbeitung* wäre, einen Eintragstyp (auch Altbestand). Umsetzung offen → `/frontend bug-qa4-1`
- **Status:** Behoben 2026-11-14 (`/frontend bug-qa4-1`) — `checkEntryTypes` (Regel F) meldet „Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden.“ bei geänderten Einträgen ohne Eintragstyp ohne fachliche Änderung (z. B. nur Eintragstyp entfernt) und bei unverändertem Altbestand *in Bearbeitung* ohne Eintragstyp; bei fachlicher Änderung ohne Typ bleibt die bisherige Meldung (keine Doppelmeldung). Freigegebene unveränderte Einträge ohne Typ bleiben erlaubt. Tests: `checkin.test.ts` (+4), QA-Test „BUG-QA4-1“ in `qa-proj7-10.test.ts` aktiviert (vorher Gegenprobe rot), E2E „BUG-QA4-1“ in `tests/PROJ-10-checkin-antworten.spec.ts`. Bestätigung durch `/qa` ausstehend

##### BUG-QA4-2: Akzeptanzkriterium zur Antwortübernahme bei freigegebenen Einträgen ist nicht erreichbar (Spec)
- **Severity:** Low (Dokumentation)
- **Beschreibung:** Das Kriterium „Angenommen ein *freigegebener* Eintrag hat in der Datei nur eine geänderte Antwort und die Übernahme ist angekreuzt … dann ist der Eintrag *in Bearbeitung* und eine Freigabe der DMRL ist aufgehoben“ widerspricht der späteren Entscheidung „Eintragstyp verlangen“: Freigegebene Einträge haben nie einen Eintragstyp (der REPLY entfernt ihn), die Übernahme ist deshalb immer gesperrt. Die Umsetzung folgt korrekt der späteren Entscheidung.
- **Vorschlag:** Kriterium per `/refine PROJ-10` umformulieren, z. B. „… ein Eintrag *zu überarbeiten* (mit Eintragstyp) …“ bzw. „ein freigegebener Eintrag mit gesetztem Eintragstyp `c` …“
- **Priority:** Nice to have
- **Status:** Behoben 2026-11-14 (`/refine PROJ-10`) — Kriterium auf einen Eintrag *zu überarbeiten* umgestellt; neues Kriterium zur Sperre bei freigegebener DMRL

#### Summary
- **Acceptance Criteria (Refinement):** 11/12 passed, 1 nicht erreichbar (BUG-QA4-2, Spec)
- **Bugs Found:** 2 total (0 critical, 0 high, 1 medium, 1 low)
- **Security:** Pass
- **Production Ready:** YES (keine Critical/High-Bugs) — BUG-QA4-1 sollte vor einer Weitergabe behoben werden

### QA-Lauf 5 — Bestätigung BUG-QA4-1 / BUG-QA4-2 (2026-11-14)
**Automatisiert:** Vitest 449/449 ✅ (Test „BUG-QA4-1“ aktiv) · Playwright 75/75 ✅ (Chrome)

**Neue bzw. geänderte Kriterien aus dem Refinement**
- [x] Eintragstyp entfernt (mit oder ohne Antwort) → Prüfbericht „Eintrag in Bearbeitung braucht einen Eintragstyp …“, kein Check-in (Unit, E2E)
- [x] Altbestand *in Bearbeitung* ohne Eintragstyp, unverändert → derselbe Fehler (Unit)
- [x] Eintrag *zu überarbeiten* (mit Typ) mit nur geänderter Antwort + Übernahme → *in Bearbeitung* mit Werten aus der Datei (Unit)
- [x] Freigegebene DMRL: Antwortübernahme bei freigegebenen Einträgen ohne Typ immer gesperrt (Unit, Komponente)

**Umgehungsversuche (Red Team):** Eintragstyp „ “ (Leerzeichen) → Regel F; „N“ → Formatfehler A; Eintrag *zu überarbeiten* nur Eintragstyp entfernt → Regel F; unveränderter Eintrag *zu überarbeiten* → erlaubt (korrekt). Keine Doppelmeldung bei fachlicher Änderung ohne Typ.

**Regression:** Freigabe-, SEND-, REPLY-, Archiv- und Export-Abläufe (E2E) unverändert grün; Demo-Daten enthalten keinen Altbestand ohne Eintragstyp.

- **BUG-QA4-1:** bestätigt behoben · **BUG-QA4-2:** bestätigt behoben (Spec)
- **Offene Bugs:** keine
- **Production Ready:** YES

### QA-Lauf 6 — UI-Fix Dialogbreite Prüfbericht (2026-11-16)
**Anlass:** Prüfbericht im Check-in-Dialog abgeschnitten (Spalte „Meldung“ außerhalb, ganzer Dialog musste waagerecht gescrollt werden). Fix auch für REPLY- (PROJ-13) und SEND-Dialog (PROJ-12).

**Automatisiert:** Vitest 518/518 ✅ · Playwright 116/116 ✅ (Chrome; inkl. 6 neue Tests in `tests/PROJ-10-dialogbreite.spec.ts`) · ESLint 0 Fehler (1 bestehende Warnung in `use-toast.ts`, unabhängig)

**Geprüft (E2E, echte Check-out-CSV mit ungültigem Eintragstyp in allen Zeilen → Prüfbericht mit Fehlerliste)**
- [x] 1440 px: Dialog > 1000 px breit, Spalte „Meldung“ vollständig im Dialog, weder Dialog noch Tabelle scrollen waagerecht
- [x] 768 px: Dialog passt ins Fenster, kein waagerechtes Scrollen von Dialog oder Seite (nur die Tabelle selbst darf scrollen)
- [x] 375 px: wie 768 px
- [x] REPLY 1440 px: XSD-Fehler (TEST-1) und Regelwerk-Fehler (TEST-4) — Tabelle vollständig sichtbar, kein waagerechtes Scrollen
- [x] SEND 1440 px breit / 375 px passt ins Fenster, kein Seiten-Überlauf
- [x] Bestehender Test „375 px: Abschnitt mit Häkchen ohne waagerechtes Scrollen“ weiterhin grün

**Security:** reine Layout-Änderung (Tailwind-Klassen), keine neue Eingabe, Logik oder Datenfluss — kein neues Angriffsrisiko.

**Regression:** alle Check-in-, SEND-, REPLY-, Freigabe-, Archiv-, Export- und Responsive-Tests grün.

**Nicht geprüft:** Firefox/Safari (WebKit für Playwright auf diesem Rechner nicht installiert; wie in den bisherigen Läufen nur Chrome).

- **Offene Bugs:** keine
- **Production Ready:** YES

### QA-Lauf 7 — Refinement 2026-11-16 (Eintragstyp ↔ DM-Ausgabetyp)

**Tested:** 2026-11-16 · **Tester:** QA Engineer (AI) · **Browser:** Chrome (Playwright, `PW_CHANNEL=chrome`); Firefox/Safari nicht geprüft (WebKit nicht installiert, wie bisher)

**Automatisiert**
- Vitest: 558 bestanden, 5 übersprungen (BUG-QA7-1)
  - neu: `src/lib/workflows/qa-proj10-ausgabetyp.test.ts` (19 aktive Tests + 5 übersprungene)
- Playwright Chrome: 119 bestanden, 1 übersprungen (BUG-QA7-1)
  - neu: `tests/PROJ-10-ausgabetyp.spec.ts` (3 aktive Tests + 1 `fixme`)
- Echte XSD-Prüfung: SEND mit `c` + `status` ist gegen 2.3, 4.2 und 5.0 schemagültig (xmllint)

#### Acceptance Criteria Status (Abschnitt „Eintragstyp ↔ DM-Ausgabetyp“)
- [x] `n` + `changed` → Meldung „Eintragstyp ‚n‘ verlangt DM-Ausgabetyp ‚new‘ — gefunden: ‚changed‘“, kein Check-in (Unit)
- [x] `n` + `new` → kein Fehler (Unit)
- [x] `c` + `changed`/`revised`/`status` → kein Fehler (Unit; E2E mit `status` inkl. Übernahme)
- [x] `c` + `new`/`deleted` → Meldung mit „‚changed‘, ‚revised‘ oder ‚status‘“ (Unit; E2E 1440 px)
- [x] `d` + `deleted` → kein Fehler (Unit)
- [x] `d` + `new` → Meldung, Check-in abgelehnt, Sperre bleibt, Verlauf „Check-in abgelehnt — 1 Fehler“ (Unit, E2E)
- [x] Ohne Eintragstyp → nur Regel A, kein Typ-Vergleich (Unit)
- [x] Unveränderter Altbestand `d` + `new` → Fehler; nach Korrektur in der CSV gilt der Eintrag als *geändert* (Unit)
- [x] `status` ist kein Formatfehler (Unit, E2E)
- [x] `change` bei `c` → nur Formatfehler A (Unit)
- [x] REPLY mit unpassendem Ausgabetyp → keine Typ-Meldung, nur Regel G (QA-Test neu)
- [ ] **Nicht erreichbar wie formuliert (BUG-QA7-2):** „Demo frisch geladen → PHUNGUN auschecken → unverändert einchecken“ — PHUNGUN wartet im Demo-Zustand auf den REPLY und lässt sich nicht auschecken. Nach dem Demo-REPLY ist der unveränderte Check-in fehlerfrei (QA-Test neu).
- [x] Regression: alle bisherigen Kriterien von PROJ-10, PROJ-8, PROJ-20 (Ableitung jetzt aus `issue-type.ts`) sowie Freigabe, SEND, REPLY, Archiv und Export (Unit + E2E)

#### Edge Cases Status
- [x] Ausgabetyp passt nicht zum Eintragstyp, auch bei unverändertem Altbestand → Fehler (Unit)
- [x] Eintragstyp entfernt → keine Typ-Prüfung, aber Regel F „braucht einen Eintragstyp“ (bestehende Tests)
- [x] Großschreibung (`N`, `DELETED`, `Status`) → nur ein Formatfehler A (QA-Test neu)
- [x] Leerzeichen um die Werte (` d ` / ` deleted `) werden entfernt → gültig (QA-Test neu)
- [x] Viele Verstöße → jeder Eintrag einzeln mit Zeile gemeldet (QA-Test neu)
- [ ] **Edge Case „Alte Demo-Daten im Browser“ trifft so nicht zu (BUG-QA7-2):** Nach dem REPLY haben alle genehmigten PHUNGUN-Einträge (auch die 11 mit `d`) keinen Eintragstyp mehr, Regel 4 greift. Ein Check-in mit alten Demo-Daten scheitert deshalb nicht (QA-Test neu).

#### Security Audit Results (Red Team)
- [ ] **Prototyp-Schlüssel als Eintragstyp** (`constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf`) → Prüfung stürzt ab (BUG-QA7-1)
- [x] Ableitung des Ausgabetyps (PROJ-1/PROJ-20) liefert für dieselben Werte korrekt `new` (bisheriger PROJ-20-Code hätte hier eine Funktion in die CSV geschrieben, jetzt behoben)
- [x] Keine Freigabe durch die Regel: Sie meldet nur Fehler und setzt keinen Status
- [x] XSS: Die Meldung zeigt den gefundenen Wert als Text (bestehende Prüfbericht-Anzeige, keine HTML-Ausgabe)
- [x] Responsive: Meldung bei 1440 px vollständig im Dialog, kein waagerechtes Scrollen (E2E); 375/768 px durch die Tests aus QA-Lauf 6 abgedeckt

#### Bugs Found

##### BUG-QA7-1: Eintragstyp mit dem Namen einer JavaScript-Objekteigenschaft lässt die Check-in-Prüfung abstürzen
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Fahrzeug-DMRL als Ben auschecken
  2. In der CSV bei einem Eintrag `dmentryType` auf `constructor` setzen (ebenso `__proto__`, `toString`, `hasOwnProperty`, `valueOf`)
  3. Check-in mit dieser Datei
  4. Expected: Prüfbericht mit Formatfehler A „Format: leer, n, c oder d …“, kein Check-in
  5. Actual: Der Dialog bleibt dauerhaft bei „Prüfe ‚…csv‘ …“ stehen (Screenshot geprüft). In der Browserkonsole steht `TypeError: allowed.includes is not a function`. Es gibt keine Meldung und keinen Verlaufseintrag. Der Dialog lässt sich über das X schließen; die Sperre bleibt, Daten gehen nicht verloren.
- **Ursache:** `checkIssueTypeMatchesEntryType` liest `ALLOWED_ISSUE_TYPES_BY_ENTRY_TYPE[dmentryType]` aus einem einfachen Objekt. Für die genannten Werte liefert der Zugriff eine geerbte Eigenschaft (z. B. die Funktion `Object`), die nicht `undefined` ist. Neu durch das Refinement 2026-11-16.
- **Vorschlag:**
  - Nur eigene Schlüssel verwenden (`Object.hasOwn` oder eine `Map`).
  - Zusätzlich im Dialog Ausnahmen der Prüfung abfangen und eine Fehlermeldung zeigen, statt hängen zu bleiben.
- **Tests:**
  - `qa-proj10-ausgabetyp.test.ts` „BUG-QA7-1 …“ (5 Fälle, `it.skip`)
  - `tests/PROJ-10-ausgabetyp.spec.ts` „BUG-QA7-1 …“ (`test.fixme`)
  - Beide nach der Behebung aktivieren.
- **Priority:** Fix before Weitergabe
- **Status:** Behoben 2026-11-18 (`/frontend proj-10`), bestätigt durch `/qa` (QA-Lauf 9)
  - `src/lib/dmrl/issue-type.ts`: neue Funktion `allowedIssueTypes` liest nur eigene Schlüssel (`Object.hasOwn`); `deriveIssueType` und die Typ-Regel in `checkin.ts` nutzen sie. Werte wie `constructor` oder `__proto__` ergeben jetzt nur den Formatfehler A.
  - `check-in-dialog.tsx`: Ausnahmen der Prüfung werden abgefangen. Statt dauerhaft „Prüfe …“ erscheint die Meldung „Die Datei konnte nicht geprüft werden. Bitte die Datei kontrollieren und erneut versuchen.“
  - Tests aktiviert: `qa-proj10-ausgabetyp.test.ts` (5 Fälle), `tests/PROJ-10-ausgabetyp.spec.ts` („BUG-QA7-1 …“)

##### BUG-QA7-2: Ein Akzeptanzkriterium und ein Edge Case zur PHUNGUN-Demo sind so nicht erreichbar (Spec)
- **Severity:** Low (Dokumentation)
- **Beschreibung:**
  - **Kriterium „Demo frisch geladen → PHUNGUN auschecken → unverändert einchecken → fehlerfrei“:** PHUNGUN steht im Demo-Zustand auf *gesendet* und wartet auf den REPLY, ein Check-out ist erst danach möglich.
  - **Edge Case „Alte Demo-Daten … Check-in scheitert“:** trifft nicht zu. Nach dem REPLY haben alle genehmigten Einträge (auch die mit `d`) keinen Eintragstyp mehr, Regel 4 greift. Nur die 2 abgelehnten Einträge (`n` + `new`) behalten ihren Eintragstyp, und die passen.
  - Die Anpassung der Demo-Daten wirkt sich praktisch erst aus, wenn ein Bearbeiter einem genehmigten `d`-Eintrag erneut einen Eintragstyp gibt.
- **Vorschlag:** Per `/refine PROJ-10` umformulieren:
  - Kriterium: „… nach Import der Demo-REPLY-Datei ausgecheckt und unverändert eingecheckt …“
  - Edge Case: entsprechend korrigieren.
- **Priority:** Nice to have

#### Summary
- **Acceptance Criteria (Refinement):** 11/12 passed, 1 nicht erreichbar wie formuliert (BUG-QA7-2, Spec)
- **Bugs Found:** 2 total (0 critical, 0 high, 1 medium, 1 low)
- **Security:** 1 Befund (BUG-QA7-1, Absturz durch präparierte Eingabe; kein Datenverlust, keine Rechteausweitung)
- **Production Ready:** YES (keine Critical/High-Bugs). BUG-QA7-1 sollte vor einer Weitergabe behoben werden.

### QA-Lauf 8 — Refinement 2026-11-18 (Bestand übernehmen, Regel F1 entfällt)

**Tested:** 2026-11-18 · **Tester:** QA Engineer (AI) · **Browser:** Chrome (Playwright); Firefox/Safari nicht geprüft (WebKit nicht installiert, wie bisher)

**Automatisiert**
- **Vitest:** 576 bestanden, 6 übersprungen (5 × BUG-QA7-1, 1 × BUG-QA8-1)
  - neu: `src/lib/workflows/qa-proj10-bestand.test.ts` (13 aktive Tests + 1 übersprungener)
  - Im Gesamtlauf überschritten 2–4 Komponententests (Check-out-, REPLY-Dialog) das 5-s-Zeitlimit. Einzeln laufen sie grün; die betroffenen Tests wechseln von Lauf zu Lauf, also Last und keine Regression.
- **Playwright Chrome:** 128 bestanden, 1 übersprungen (BUG-QA7-1)
  - neu: `tests/PROJ-10-bestand.spec.ts` (5 Tests)
  - Im Gesamtlauf schlug `PROJ-15-archiv.spec.ts` beim ersten Aufruf der REPLY-Seite fehl, vermutlich weil der Dev-Server die Route erst kompilierte. Einzeln wiederholt: grün.
- **Echte XSD-Prüfung (xmllint):** Der XML-Export eines Freigabestands „Übernahme per Check-in“ ist gegen 2.3, 4.2 und 5.0 schemagültig.

#### Acceptance Criteria Status (Refinement 2026-11-18)
- [x] Neuer Eintrag mit `n`, `c` oder `d` → *in Bearbeitung* (Unit; E2E mit `c`)
- [x] Neuer Eintrag ohne Eintragstyp → *freigegeben* (Unit, E2E)
- [x] Neuer Eintrag mit `c`/`d` (passender Ausgabetyp) oder ohne Eintragstyp → keine F1-Meldung mehr (Unit, E2E)
- [x] Zusammenfassung zeigt „davon N als freigegeben übernommen“, listet die Einträge, Spalte „Status danach“ (E2E)
- [x] Neuer Eintrag **mit** Eintragstyp und Antwort `y`, Übernahme angekreuzt → *in Bearbeitung* (bestehende Tests QA-Lauf 4)
- [x] Erstübernahme (leere DMRL, nur Einträge ohne Typ) → alle Einträge und DMRL *freigegeben*, Nachweis „Übernahme Bestand per Check-in“, Freigabestand. Geprüft in 2.3, 4.2 und 5.0 (Unit).
- [x] Mischfall (ohne Typ + mit `n`/`c`/`d`) → DMRL *in Bearbeitung*, kein Nachweis, kein Freigabestand (Unit)
- [x] Freigegebene DMRL + nur neue Einträge ohne Typ → bleibt *freigegeben*, neuer Nachweis und Freigabestand (Unit, E2E inkl. Kopfbereich, Freigabestand-Seite, Archiv „Herkunft“)
- [x] Verlauf „Check-in — 1 neu (davon 1 als freigegeben übernommen), … — DMRL freigegeben (Übernahme Bestand)“ (Unit, E2E)
- [x] Ladeprüfung nach Freigabe ohne REPLY gültig, keine Meldung „beschädigt“ nach Neuladen (Unit, E2E)
- [x] PROJ-14: „Letzte Freigabe: [Datum], Übernahme per Check-in“ nach erneuter Änderung (E2E)
- [x] Regression: alle bisherigen Kriterien von PROJ-10, PROJ-8, PROJ-14 (REPLY-Freigabe unverändert), PROJ-12, PROJ-13, PROJ-15, PROJ-16 (Unit + E2E)

#### Edge Cases Status
- [x] Neuer Eintrag ohne Typ mit Antwort `n` + Antwortübernahme → *freigegeben*, `answer` = `n` gespeichert (Unit)
- [x] Ohne Antwortübernahme → freigegebener neuer Eintrag mit leeren Antwortfeldern (Unit)
- [x] Neuer Eintrag ohne Typ mit beliebigem Ausgabetyp (`deleted`) → keine Typ-Prüfung (Unit)
- [x] DMC eines bestehenden Eintrags ohne Typ geändert → „Eintrag … fehlt“ (Unit)
- [x] Vergessener Eintragstyp: grüner Hinweis „Bestand übernehmen“ mit Aufforderung zum Abbrechen sichtbar (E2E)
- [x] Nach Freigabe per Check-in ist SEND gesperrt („Es gibt keine Änderungen …“), nach neuem `n`-Eintrag wieder möglich (Unit)
- [x] 375 px: Hinweis im Dialog ohne waagerechtes Scrollen (E2E)

#### Security Audit Results (Red Team)
- [x] Ein bestehender Eintrag *in Bearbeitung* lässt sich nicht durch Entfernen des Eintragstyps *freigeben*: Fehler nach Regel F (Unit)
- [x] Ein bestehender Eintrag lässt sich nicht über einen geänderten DMC „umbenennen“ und so *freigeben*: Fehler „fehlt“ (Unit)
- [x] Ein abgelehnter Eintrag (*zu überarbeiten*) lässt sich nicht durch eine Kopie ohne Typ ersetzen: Fehler „fehlt“ (Unit)
- [x] XSS: Die neuen Texte zeigen nur Zahlen und feste Texte; DMC und Tech Name werden wie bisher als Text ausgegeben
- [ ] **Hinweis (gewollt, kein Bug):** Wer die DMRL ausgecheckt hat, kann neue Einträge ohne Empfänger-REPLY als *freigegeben* übernehmen. Das ist die Produktentscheidung vom 2026-11-18 und wird in Zusammenfassung, Verlauf, Freigabe-Nachweis und Archiv („Herkunft: Übernahme per Check-in“) sichtbar gemacht. Es gibt keine Rechteausweitung: Den Check-in kann wie bisher nur der Sperrinhaber ausführen.

#### Bugs Found

##### BUG-QA8-1: XML-Export eines Freigabestands „Übernahme per Check-in“ trägt immer DML-Code …-00001 und verweist auf sich selbst
- **Severity:** Low
- **Steps to Reproduce:**
  1. PHUNGUN mit dem Demo-REPLY (nur `y`) freigeben. Letzter SEND ist jetzt `00002-2026`.
  2. Auschecken, einen neuen Eintrag ohne Eintragstyp ergänzen und einchecken. Die DMRL bleibt *freigegeben* und erhält einen neuen Freigabestand „Übernahme per Check-in“.
  3. Diesen Freigabestand als XML exportieren.
  4. Expected: DML-Code wie beim Export des aktuellen Stands (PROJ-18), also der letzte SEND `00002-2026`; `dmlref` nicht auf sich selbst
  5. Actual: `dmlc` und `dmlref` = `…-2026-00001` (gleicher Code wie der erste, echte SEND). Die Datei ist schemagültig, aber der Kopf ist irreführend.
- **Ursache:**
  - `releaseXml` nimmt `dmlc` vom SEND des Freigabe-REPLY und fällt ohne REPLY auf `00001` des Freigabejahres zurück.
  - `dmlref` fällt ohne REPLY auf denselben Code zurück.
- **Vorschlag:** Ohne REPLY `dmlc` und `dmlref` wie beim Export des aktuellen Stands bilden (letzter nicht zurückgezogener SEND, sonst `00001`). Der Fall ist in der Spec PROJ-14 noch nicht beschrieben; gegebenenfalls kurz per `/refine PROJ-14` festlegen.
- **Test:** `qa-proj10-bestand.test.ts` „BUG-QA8-1 …“ (`it.skip`) plus Gegenprobe (zeigt das aktuelle Verhalten `00001`); nach der Behebung tauschen.
- **Priority:** Nice to have

#### Summary
- **Acceptance Criteria (Refinement 2026-11-18):** 12/12 passed
- **Edge Cases:** 7/7 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low). Weiterhin offen aus QA-Lauf 7: BUG-QA7-1 (Medium) und BUG-QA7-2 (Low).
- **Security:** keine neuen Befunde; Freigabe ohne REPLY ist gewollt und nachvollziehbar
- **Production Ready:** YES (keine Critical/High-Bugs)

### QA-Lauf 9 — Bestätigung BUG-QA7-1 (2026-11-18)

**Tested:** 2026-11-18 · **Tester:** QA Engineer (AI) · **Browser:** Chrome (Playwright); Firefox/Safari nicht geprüft (WebKit nicht installiert, wie bisher)

**Automatisiert**
- **Vitest:** 604 bestanden, 1 übersprungen (BUG-QA8-1)
  - neu in `qa-proj10-ausgabetyp.test.ts`: Block „QA-Lauf 9“ (21 Tests)
- **Playwright Chrome:** Gesamtlauf 122 bestanden, 3 Zeitüberschreitungen in PROJ-20 (`page.goto`/Sichtbarkeit nach 5–30 s)
  - Die Rechnerlast lag während des Laufs bei 15 auf 4 Kernen (Dev-Server, Kompilierung, 2 Browser-Worker).
  - Mit 1 Worker wiederholt: `PROJ-20-qa.spec.ts` und `PROJ-20-qa-refinement2.spec.ts` 13/13 grün. Keine Regression.
  - Der Test „BUG-QA7-1 …“ in `tests/PROJ-10-ausgabetyp.spec.ts` ist aktiv und grün.

#### Bestätigung BUG-QA7-1
- [x] Gegenprobe: Mit dem Stand vor dem Fix (`issue-type.ts`, `checkin.ts` aus `70fe7ab`) schlagen die 5 Bug-Tests fehl, mit dem Fix bestehen alle 24 Tests der Datei.
- [x] `constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf` als Eintragstyp → je ein Formatfehler A, keine Typ-Meldung (Unit)
- [x] E2E: Eintragstyp `constructor` → Prüfbericht mit Fehler in `dmentryType` statt hängender Prüfung
- [x] Workflow: Check-in mit `constructor` abgelehnt, Übernahme nicht möglich (Unit)
- [x] Ableitung des Ausgabetyps (PROJ-1/PROJ-20) liefert für diese Werte `new` (bestehender Test)

#### Security Audit Results (Red Team)
- [x] 7 Objekt-Eigenschaftsnamen (`constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf`, `isPrototypeOf`, `__defineGetter__`) in 12 Feldern (`dmentryType`, `type`, `answer`, `language`, `country`, `security`, `issno`, `sdc`, `techname`, `infoname`, `rpc`, `answer_comment`) → nie eine Ausnahme, immer ein Prüfbericht (Unit)
- [x] Alle Zeilen mit präpariertem Eintragstyp → je Zeile genau ein Formatfehler (Unit)
- [x] REPLY-Prüfung mit Eintragstyp `__proto__` im Empfänger-XML → kein Absturz, Prüffehler gemeldet (Unit)
- [x] Sicherheitsnetz im Dialog: Fängt Ausnahmen der Prüfung ab und zeigt eine Meldung (Code-Review; nach dem Fix nicht mehr auslösbar)

#### Summary
- **BUG-QA7-1:** bestätigt behoben
- **Offene Bugs:** BUG-QA8-1 (Low), BUG-QA7-2 (Low, Spec)
- **Neue Bugs:** keine
- **Production Ready:** YES

### QA-Lauf 10 — Refinement 2026-11-21 (`answer_timestamp`, über PROJ-13)

**Tested:** 2026-11-21 · **Tester:** QA Engineer (AI) · **App:** http://localhost:3000 (`npm run dev`) · **Browser:** Chrome (Playwright); Firefox/Safari nicht geprüft (Firefox und WebKit nicht installiert, wie bisher)

**Automatisiert**
- **Vitest:** 625 bestanden, 1 übersprungen (BUG-QA8-1) · **Lint:** 0 Fehler · **Startskript:** Tests OK
- **Playwright Chrome:** 138 von 139 im Gesamtlauf; der eine Fehlschlag (`PROJ-3-to-6-17-verwaltung.spec.ts` „Anlegen: neuer Benutzer …“) trat nur unter paralleler Last auf, dreifach einzeln wiederholt 51/51 grün → keine Regression
- **Neu:** `tests/QA-proj10-12-13-refinement.spec.ts` (14 Tests, alle grün, echte XSD-Prüfung über die Serverfunktion)

#### Acceptance Criteria Status
- [x] „Antworten aus der Datei übernehmen“ + Antwort `y` → Zeitpunkt des Check-ins (± 2 min), Wert aus der Datei (`1999-01-01T00:00:00`) ignoriert, Anzeige in der Ansicht (E2E, Unit)
- [x] Antwort per Übernahme entfernt → `answer_timestamp` leer (Unit)
- [x] Ohne Übernahme → `answer_timestamp` aller Einträge unverändert (Unit)
- [x] Nur `answer_timestamp` in der Datei geändert → kein Fehler, keine abweichende Antwort, „0 neu, 0 geändert, 10 unverändert“, Wert bleibt (E2E, Unit)
- [x] CSV mit 27 Spalten (ohne `answer_timestamp`) wird angenommen, Sperre aufgehoben (E2E, Unit)

#### Edge Cases Status
- [x] Kopfzeilen-Grenzfälle: 28er-Kopf korrekt / 27er-Kopf korrekt → ok; 27er-Kopf vertauscht → „Spalten in falscher Reihenfolge“; `answer_timestamp` am Ende → Reihenfolgefehler; fehlende Spalte → „Spalte ‚remarks' fehlt.“; 28er-Kopf mit 27 Zellen → „Zeile hat 27 statt 28 Spalten.“ (Unit-Probe)
- [x] Regression Check-in (Antwortübernahme, Bestand übernehmen, Ausgabetyp, Dialogbreite, XSS): grün; `PROJ-10-checkin-antworten.spec.ts` auf 28 Spalten angepasst

#### Security Audit Results (Red Team)
- [x] `answer_timestamp` aus einer präparierten CSV (z. B. `1999-01-01T00:00:00`) wird nie übernommen — weder mit noch ohne „Antworten aus der Datei übernehmen“ (E2E + Unit); damit kein vorgetäuschter Übernahme-Zeitpunkt
- [x] Ausgabe in Ansicht/Detailfenster über React-Text (`<time>`), kein `dangerouslySetInnerHTML`; unbekannte Formate werden unverändert als Text angezeigt (Code-Review + Unit)
- [x] CSV-Formelschutz (BUG-QA2-1) gilt auch für die neue Spalte (gemeinsamer `csv-writer`)
- [x] Präparierter `dmlref` (jedes der 5 Felder einzeln) → REPLY abgelehnt, nichts übernommen (E2E)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Daten sind über den Browser-Speicher manipulierbar

#### Bugs Found
##### BUG-QA10-2: Typprüfung (`tsc --noEmit`) schlägt in einer QA-Testdatei fehl
- **Severity:** Low
- **Feature:** PROJ-10 (Testcode, vorbestehend seit `dddb63e`)
- **Steps to Reproduce:**
  1. `npx tsc --noEmit`
  2. Expected: keine Fehler
  3. Actual: `src/lib/workflows/qa-proj10-ausgabetyp.test.ts(197,46): error TS2345: Argument of type 'string' is not assignable to parameter of type 'Uint8Array<ArrayBufferLike>'` — Vitest und `npm run build` laufen trotzdem (Testdateien werden beim Build nicht geprüft)
- **Priority:** Nice to have
- **Status:** Behoben (2026-11-21) — XML wird wie in den übrigen Tests per `new TextEncoder().encode(xml)` übergeben; `tsc --noEmit` fehlerfrei

#### Summary
- **Acceptance Criteria (Refinement):** 5/5 passed
- **Bugs Found:** 1 neu (0 critical, 0 high, 0 medium, 1 low); weiterhin offen: BUG-QA8-1 (Low), BUG-QA7-2 (Low, Spec)
- **Security:** Pass
- **Production Ready:** YES

### QA-Lauf 12 — Refinement 2026-11-25 (Check-in von MS-Excel und CSV)

**Tested:** 2026-11-25
**App URL:** http://localhost:3000 (`npm run dev`)
**Tester:** QA Engineer (AI)
**Testumfang:** PROJ-9 und PROJ-10 gemeinsam; Red-Team-Prüfung des neuen Excel-Lesers
**Automatisiert:** Vitest 693 Tests ✅ (58 Dateien) · Playwright 156 Tests ✅ · Startskript-Tests ✅
**Neue QA-Tests:** `src/lib/workflows/qa-proj9-10-excel.test.ts` (8), `tests/QA-proj9-10.spec.ts` (5)
**Browser:** Chromium (Desktop). Nur Desktop laut PRD; Firefox/Safari nicht installiert, nicht getestet.
**Testdatei aus MS Excel:** `tests/fixtures/PHUNGUN-ms-excel-aus-csv.xlsx` ✅

#### Acceptance Criteria Status
- [x] Prüfung — Dateityp: `.xls`, `.ods`, `.txt` → „Bitte eine Excel- (.xlsx) oder CSV-Datei auswählen“ (Unit, Komponententest, E2E)
- [x] Excel-Datei (13/13):
  - [x] unverändert eingecheckt → fehlerfrei, nur unverändert (Unit, E2E)
  - [x] bearbeitet (neue Zeile `n`, Änderung) → 1 neu, 1 geändert; Übernahme (Unit, E2E: 11 Einträge)
  - [x] mehrere Blätter ohne „Einträge“ → „Tabellenblatt ‚Einträge‘ fehlt.“ (Unit)
  - [x] einziges Blatt mit anderem Namen wird gelesen (Unit, MS-Excel-Testdatei)
  - [x] MS-Excel-Testdatei gegen Demo-PHUNGUN: keine Fehler, 32 unverändert (Unit)
  - [x] „Einträge“ neben anderen Blättern, auch nicht vorn → nur „Einträge“ gelesen (Unit)
  - [x] Formel → gespeichertes Ergebnis (Unit)
  - [x] Zahlzelle `1` in `security` → `01` mit Hinweis (Unit)
  - [x] Datumszelle in `day` → Formatfehler A (Unit)
  - [x] Text `'=` bleibt unverändert (Unit)
  - [x] leere Zeilen ignoriert (Unit)
  - [x] beschädigte `.xlsx` → „Excel-Datei kann nicht gelesen werden.“, Sperre bleibt (Unit, E2E)
  - [x] > 5 MB → „Datei zu groß“ (Unit)
  - [x] Export-Excel (PROJ-18) bei eigener Sperre → geprüft und angenommen (E2E)
  - [x] Prüfbericht nennt die Zeile des Blatts (Unit, E2E); abgelehnt → Sperre bleibt, „Check-in abgelehnt“ im Verlauf (E2E)
- [x] CSV weiterhin zulässig (3/3): PROJ-20-CSV (E2E `PROJ-20-qa*`), alte CSV mit 27 Spalten (E2E), Apostroph-Entfernung nur CSV (Unit)
- [x] Regression: alle bisherigen Kriterien (Zugriff, Prüfung, Typ-Regel, Übernahme, Antworten, DMRL-Status, Bestand, `answer_timestamp`) weiterhin grün — die bestehenden E2E-Tests laufen jetzt über die Excel-Check-out-Datei

#### Edge Cases Status
- [x] Spalten in Excel umsortiert → Gruppe S (QA-Unit) · ausgeblendete/gefilterte Zeilen werden gelesen (QA-Unit) · Excel-Datei einer anderen DMRL fällt durch (MI, fehlende Einträge; QA-Unit) · Formel ohne Ergebnis → leer (Unit) · Endung in Großbuchstaben (Unit)
- [x] `.xlsx` mit Endung `.csv` → „nicht UTF-8-kodiert“, keine Fehldeutung (QA-Unit)
- [x] Leistung: 1.000 Einträge lesen und prüfen in wenigen Sekunden (QA-Unit)
- [ ] BUG-QA12-2: Zelladressen weit jenseits der Excel-Grenzen (s. u.)

#### Security Audit Results (Red Team gegen den Excel-Leser)
- [x] Zip-Bombe: entpackte Größe begrenzt (Unit); **gefälschte Größenangaben** im ZIP (98 MB Inhalt, angegeben 10 bzw. 100 Bytes) → „nicht lesbar“, kein Speicherüberlauf (QA-Unit, Sonde)
- [x] Entity-Bombe („Billion Laughs“, 10⁹ Zeichen) im Blatt-XML: Chrome lehnt in rund 70 ms ab, Seite bleibt bedienbar (E2E)
- [x] XXE: externe Entity wird nicht nachgeladen (keine Netzwerkanfrage), Datei abgelehnt (E2E)
- [x] XSS über Zellinhalt: als Text angezeigt (E2E)
- [x] Nur benötigte ZIP-Teile werden entpackt; keine Server-Route, kein neues Paket
- [ ] BUG-QA12-2 (Low, Verfügbarkeit): s. u.

#### Bugs Found

##### BUG-QA12-2: Excel-Leser weist Zelladressen jenseits der Excel-Grenzen nicht ab
- **Severity:** Low
- **Steps to Reproduce:**
  1. Eine manipulierte `.xlsx` erzeugen, deren Zelle die Adresse `FXSHRXW2` (Spaltenindex ≈ 4 Milliarden) bzw. `ZZZZZZZZ2` hat (MS Excel kann das nicht erzeugen; max. Spalte `XFD`, Zeile 1 048 576).
  2. Bei eigener Sperre einchecken.
  3. Expected: sofort „Excel-Datei kann nicht gelesen werden.“
  4. Actual: `FXSHRXW2` — die Seite ist in Chrome **rund 2,2 s blockiert**, dann „nicht lesbar“ (riesiges Zellen-Array). `ZZZZZZZZ2` — Spaltenindex über 2³² wird **still verworfen** (Wert verschwindet ohne Meldung); hier fiel die Datei nur wegen anderer Fehler durch.
- **Hinweis zur Behebung:** Spalten > `XFD` (Index 16 383) und Zeilen > 1 048 576 als „nicht lesbar“ behandeln.
- **Priority:** Nice to have (nur absichtlich manipulierte Dateien; Wirkung auf den eigenen Browser beschränkt)

#### Summary
- **Acceptance Criteria:** 17/17 neue bzw. geänderte Kriterien passed; Regression aller bisherigen Kriterien grün
- **Bugs Found:** 1 neu (0 critical, 0 high, 0 medium, 1 low) — dazu BUG-QA12-1 in PROJ-9
- **Security:** Pass (Zip-Bombe, gefälschte Größen, Entity-Bombe, XXE, XSS geprüft)
- **Production Ready:** YES (keine Critical/High-Bugs)

- **Entscheidung Product Owner (2026-11-25):** freigegeben (Approved); Low-Bugs bleiben dokumentiert

### QA-Lauf 13 — Refinement 2026-11-26 (`dmc` und Informationsfelder)
Gemeinsam mit PROJ-9 getestet → **PROJ-9, QA-Lauf 13** (6/6 Check-in-Kriterien bestanden; BUG-QA13-1 Medium: CSV aus PROJ-20 leert gespeicherte Informationsfelder; BUG-QA13-2 Low: „bei 1 Einträgen“). Beide behoben 2026-11-26 (`/frontend`), Details in PROJ-9. **Re-Test 2026-11-26:** Fixes bestätigt, MS-Excel-Abnahme durch den Product Owner bestanden, 714 Unit- und 164 E2E-Tests grün → Approved (Details PROJ-9, „Re-Test QA-Lauf 13“).

## Deployment
_To be added by /deploy_
