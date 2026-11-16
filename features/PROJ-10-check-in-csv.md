# PROJ-10: Check-in CSV

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-16

> **Refinement 2026-11-14:** Abweichende Partnerantworten (`answer`/`answer_comment`) in der CSV werden nicht mehr abgewiesen, sondern nach Abfrage optional übernommen (Anlass: PROJ-20). Betrifft auch PROJ-8 Regel K. Geänderte Stellen sind mit *(Refinement 2026-11-14)* markiert.

## Dependencies
- Requires: PROJ-8 (Fachliches Regelwerk) — Prüfung, Prüfbericht, Auffüllen führender Nullen
- Requires: PROJ-9 (Check-out CSV) — Sperre, Stand beim Check-out, CSV-Aufbau
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Check-in", Anzeige von Status und Sperre
- Requires: PROJ-17 (DMRL-Berechtigungen) — Berechtigung des Sperrinhabers
- Wird genutzt von: PROJ-20 (XML-Prüfung & CSV-Konvertierung) — konvertierte CSV, auch mit Partnerantworten
- Wirkt auf: PROJ-14 (Freigabestatus) — Aufhebung der Freigabe bei Änderung; PROJ-4/5/6 — „im Workflow verwendet"

## Beschreibung
Der Sperrinhaber lädt die bearbeitete CSV-Datei hoch. Sie wird nach dem fachlichen Regelwerk (PROJ-8) gegen den Stand beim Check-out geprüft. Nur eine fehlerfreie Datei kann — nach Sichtung einer Zusammenfassung — übernommen werden; danach ist die Sperre aufgehoben. Eine fehlerhafte Datei wird vollständig abgelehnt, die Sperre bleibt bestehen.

## Ablauf
1. Sperrinhaber wählt **„Check-in"** in der DMRL-Ansicht und wählt eine CSV-Datei.
2. Prüfung nach PROJ-8 (Gruppen S, A, B, C, D, E, I, F) gegen den Stand beim Check-out. Abweichende Antwortfelder (Gruppe K) sind kein Fehler mehr, sondern werden zur Übernahme angeboten *(Refinement 2026-11-14)*.
3. **Fehler →** Prüfbericht (mit Download), nichts übernommen, Sperre bleibt. Erneuter Upload möglich.
4. **Keine Fehler →** Zusammenfassung:
   - Zahlen: „32 Einträge geprüft · 3 neu · 2 geändert · 27 unverändert"
   - Hinweise (z. B. aufgefüllte führende Nullen)
   - Liste der neuen und geänderten Einträge; bei geänderten je Feld alter → neuer Wert
   - **Abweichende Partnerantworten (N Einträge)** *(Refinement 2026-11-14)*: nur wenn `answer` oder `answer_comment` in der Datei vom Stand der DMRL abweichen (bei neuen Einträgen: nicht leer). Liste je Eintrag: DMC, Antwort alt → neu, Begründung alt → neu. Darunter das Kästchen **„Antworten aus der Datei übernehmen“**, standardmäßig **nicht** angekreuzt, mit dem Hinweis „Übernommene Antworten sind nur Information — freigegeben wird ein Eintrag weiterhin nur durch einen REPLY.“
5. **„Übernehmen"** → Daten übernommen, Status gesetzt (s. u.), Sperre aufgehoben, Erfolgsmeldung.
   **„Abbrechen"** → nichts übernommen, Sperre bleibt.

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
| neu (DMC vorher nicht vorhanden) | *in Bearbeitung* |
| geändert (irgendein Feld weicht ab, auch der Eintragstyp) | *in Bearbeitung* |
| unverändert | bleibt (z. B. *freigegeben*, *zu überarbeiten*, *in Bearbeitung*) |
| nur Antwortfelder abweichend, Übernahme **gewählt** *(Refinement 2026-11-14)* | *in Bearbeitung* — zählt als Änderung |
| nur Antwortfelder abweichend, Übernahme **nicht gewählt** *(Refinement 2026-11-14)* | bleibt; die bisherigen Antworten bleiben erhalten, zählt nicht als Änderung |

„Unverändert" wird nach dem Auffüllen führender Nullen beurteilt (`1` → `01` ist keine Änderung).

**Eintrag ohne Eintragstyp** *(Refinement 2026-11-14)*: Weicht bei einem Eintrag ohne Eintragstyp (z. B. *freigegeben*) nur die Antwort ab und ist die Übernahme gewählt, braucht er einen Eintragstyp (`n`, `c` oder `d`) — sonst könnte er nie erneut gesendet und freigegeben werden. Solange solche Einträge betroffen sind, ist „Übernehmen“ bei angekreuzter Übernahme gesperrt; ohne Häkchen ist der Check-in normal möglich.

**Grundsatz Eintragstyp** *(Refinement 2026-11-14, BUG-QA4-1)*: Nach dem Check-in gibt es keinen Eintrag *in Bearbeitung* ohne Eintragstyp (`n`, `c` oder `d`) — SEND nimmt nur solche Einträge mit. Ein entfernter Eintragstyp bei einem Eintrag, der *in Bearbeitung* wäre, ist ein Fehler (PROJ-8 Regel F); das gilt auch für Altbestand, der bereits *in Bearbeitung* ohne Eintragstyp ist.

**Übernommene Partnerantworten** *(Refinement 2026-11-14)* setzen den Eintrag nie auf *freigegeben* oder *zu überarbeiten* — diese Status entstehen nur durch einen REPLY (PRD). Eine übernommene Antwortänderung zählt als Änderung (Eintrag *in Bearbeitung*, eine Freigabe der DMRL wird aufgehoben), damit *freigegeben* immer durch eine echte Partnerantwort belegt ist.

**DMRL-Status**
| Ergebnis | DMRL-Status danach |
|---|---|
| mindestens ein Eintrag neu oder geändert | *in Bearbeitung* — eine Freigabe wird aufgehoben (PRD, PROJ-14) |
| keine Änderung | unverändert (z. B. bleibt *freigegeben*) |

**Weiteres**
- Antworten des Partners (`answer`, `answer_comment`) bleiben bei geänderten Einträgen erhalten, bis der nächste REPLY sie ersetzt; sie werden nicht mitgesendet (PROJ-12). Ist „Antworten aus der Datei übernehmen“ angekreuzt, gelten stattdessen die Werte aus der Datei *(Refinement 2026-11-14)*.
- Sperre wird aufgehoben.
- Workflow-Verlauf: „Check-in" mit Datum, Benutzer und Anzahl neu/geändert/unverändert (Anzeige → PROJ-15); bei Übernahme zusätzlich „N Antworten aus der Datei übernommen" *(Refinement 2026-11-14)*.
- Ab dem ersten abgeschlossenen Check-in gelten DMRL, System und Originator-Organisation als **im Workflow verwendet** (PROJ-4/5/6) — auch wenn nichts geändert wurde.
- Die CSV-Datei wird nicht archiviert.

## User Stories
- Als **Bearbeiter** möchte ich meine bearbeitete CSV einchecken, damit meine Änderungen in die DMRL übernommen werden.
- Als **Bearbeiter** möchte ich vor der Übernahme sehen, welche Einträge neu oder geändert sind, damit ich keine ungewollten Änderungen übernehme.
- Als **Bearbeiter** möchte ich bei Fehlern einen vollständigen Prüfbericht erhalten und die Datei korrigiert erneut hochladen können, ohne erneut auschecken zu müssen.
- Als **Bearbeiter** möchte ich nach dem Check-in sehen, welche Einträge *in Bearbeitung* sind, damit ich weiß, was mit dem nächsten SEND an den Partner geht.
- Als **Bearbeiter** möchte ich eine DMRL eines Partners oder Altprojekts samt Partnerantworten übernehmen (z. B. über PROJ-20 konvertiert), damit die bisherige Abstimmung als Information erhalten bleibt *(Refinement 2026-11-14)*.
- Als **Bearbeiter** möchte ich bewusst entscheiden, ob abweichende Antworten aus der Datei übernommen werden, damit versehentlich geänderte Antworten nicht unbemerkt übernommen werden *(Refinement 2026-11-14)*.
- Als **Product Owner** möchte ich zeigen, dass eine freigegebene DMRL durch einen Check-in mit Änderungen ihre Freigabe verliert, ein Check-in ohne Änderungen aber nicht.

## Out of Scope
- Prüfregeln selbst → PROJ-8
- Check-out, Rücknahme, Aufheben der Sperre → PROJ-9
- Excel-Format (.xlsx) → nur CSV (PROJ-9)
- Teilweise Übernahme (nur fehlerfreie Einträge) — alles oder nichts (PROJ-8)
- Bearbeiten einzelner Einträge direkt in der Anwendung
- Check-in durch Administrator bei fremder Sperre
- Archivierung der CSV-Datei
- Anzeige des Workflow-Verlaufs → PROJ-15
- Rückgängig machen eines Check-ins
- Übernahme von Partnerantworten je Eintrag einzeln — nur alle oder keine *(Refinement 2026-11-14)*
- Freigabe von Einträgen oder DMRLs durch übernommene Antworten — nur per REPLY (PROJ-13/14)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen die DMRL ist von mir gesperrt, wenn ich die Ansicht öffne, dann ist „Check-in" verfügbar
- [ ] Angenommen die DMRL ist nicht gesperrt, wenn ich die Ansicht öffne, dann ist „Check-in" nicht verfügbar
- [ ] Angenommen die DMRL ist von einem anderen Benutzer gesperrt, wenn ein Administrator oder Bearbeiter die Ansicht öffnet, dann ist „Check-in" nicht verfügbar
- [ ] Angenommen ein Administrator hat die DMRL selbst ausgecheckt, wenn er „Check-in" wählt, dann ist der Check-in wie für einen Bearbeiter möglich

### Prüfung
- [ ] Angenommen eine Datei wird hochgeladen, wenn sie keine `.csv`-Datei ist, dann erscheint „Bitte eine CSV-Datei auswählen" und es wird nichts geprüft
- [ ] Angenommen eine CSV ist nicht in UTF-8 kodiert, wenn sie geprüft wird, dann wird sie mit „Datei ist nicht UTF-8-kodiert" abgelehnt
- [ ] Angenommen die Datei enthält Fehler nach PROJ-8, wenn die Prüfung endet, dann erscheint der Prüfbericht mit allen Fehlern, „Übernehmen" ist nicht verfügbar und die Sperre bleibt bestehen
- [ ] Angenommen ein Prüfbericht mit Fehlern wird angezeigt, wenn der Bearbeiter eine korrigierte Datei hochlädt, dann wird diese erneut geprüft, ohne erneuten Check-out
- [ ] Angenommen die Datei ist fehlerfrei, wenn die Prüfung endet, dann zeigt die Zusammenfassung Anzahl geprüft/neu/geändert/unverändert, Hinweise und die Liste der neuen und geänderten Einträge
- [ ] Angenommen ein Eintrag wurde geändert, wenn die Zusammenfassung angezeigt wird, dann sind je geändertem Feld alter und neuer Wert sichtbar
- [ ] Angenommen in der Datei wurde `security` von `01` zu `1` (Excel), wenn geprüft wird, dann gilt der Eintrag als unverändert und ein Hinweis auf das Auffüllen erscheint

- [ ] Angenommen bei einem Eintrag wurde der Eintragstyp entfernt (mit oder ohne geänderte Antwort) und er wäre nach dem Check-in *in Bearbeitung*, wenn geprüft wird, dann meldet der Prüfbericht „Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden.“ und der Check-in ist nicht möglich *(Refinement 2026-11-14, BUG-QA4-1)*
- [ ] Angenommen ein Eintrag ist bereits *in Bearbeitung* ohne Eintragstyp (Altbestand vor der Korrektur), wenn eine Datei eingecheckt wird, in der er unverändert ist, dann wird derselbe Fehler gemeldet, damit der Eintragstyp nachgetragen wird *(Refinement 2026-11-14)*

### Übernehmen / Abbrechen
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Abbrechen" gewählt wird, dann wird nichts übernommen und die Sperre bleibt bestehen
- [ ] Angenommen die Zusammenfassung ist sichtbar, wenn „Übernehmen" gewählt wird, dann werden alle Einträge übernommen, die Sperre ist aufgehoben und eine Erfolgsmeldung erscheint
- [ ] Angenommen ein Eintrag ist neu, wenn übernommen wird, dann hat er den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag mit Status *freigegeben* wurde geändert, wenn übernommen wird, dann hat er den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag mit Status *zu überarbeiten* wurde geändert, wenn übernommen wird, dann hat er den Status *in Bearbeitung* und `answer`/`answer_comment` bleiben erhalten
- [ ] Angenommen ein Eintrag ist unverändert, wenn übernommen wird, dann behält er seinen Status
- [ ] Angenommen bei einem Eintrag wurde nur der Eintragstyp geändert (z. B. abgelehnter Eintrag erneut mit `n`), wenn übernommen wird, dann gilt er als geändert und hat den Status *in Bearbeitung*

### Partnerantworten aus der Datei *(Refinement 2026-11-14)*
- [ ] Angenommen in der Datei weichen `answer` oder `answer_comment` bei Einträgen vom Stand der DMRL ab (bei neuen Einträgen: nicht leer), wenn die Prüfung endet, dann ist das kein Fehler, und die Zusammenfassung zeigt „Abweichende Partnerantworten (N Einträge)" mit DMC und alt → neu je Feld
- [ ] Angenommen abweichende Antworten werden angezeigt, wenn die Zusammenfassung erscheint, dann ist „Antworten aus der Datei übernehmen" nicht angekreuzt und der Hinweis „nur Information — freigegeben wird nur durch einen REPLY" sichtbar
- [ ] Angenommen „Antworten aus der Datei übernehmen" ist nicht angekreuzt, wenn übernommen wird, dann behalten alle Einträge ihre bisherigen Antworten, und Einträge, bei denen nur die Antworten abweichen, gelten als unverändert
- [ ] Angenommen „Antworten aus der Datei übernehmen" ist angekreuzt, wenn übernommen wird, dann stehen bei allen betroffenen Einträgen die Werte aus der Datei, und diese Einträge haben den Status *in Bearbeitung*
- [ ] Angenommen ein Eintrag *zu überarbeiten* (mit Eintragstyp) hat in der Datei nur eine geänderte Antwort und die Übernahme ist angekreuzt, wenn übernommen wird, dann ist er *in Bearbeitung* mit den Werten aus der Datei *(korrigiert 2026-11-14, BUG-QA4-2; vorher: „freigegebener Eintrag …“ — nicht erreichbar, da freigegebene Einträge keinen Eintragstyp haben und die Übernahme dann gesperrt ist)*
- [ ] Angenommen die DMRL ist *freigegeben*, wenn eine Datei mit nur geänderten Antworten bei freigegebenen Einträgen geprüft und das Häkchen gesetzt wird, dann ist „Übernehmen“ gesperrt — eine Freigabe lässt sich durch übernommene Antworten allein nie aufheben oder herbeiführen *(2026-11-14)*
- [ ] Angenommen ein neuer Eintrag hat in der Datei die Antwort `y` und die Übernahme ist angekreuzt, wenn übernommen wird, dann ist er *in Bearbeitung* (nicht *freigegeben*) mit `answer` = `y`
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
- **Sehr große Datei (z. B. > 5 MB):** wird mit „Datei zu groß" abgelehnt.
- **Leere Datei / nur Kopfzeile:** Fehler laut PROJ-8.
- **Speicher voll (localStorage):** Übernahme schlägt mit Fehlermeldung fehl, Datenbestand und Sperre bleiben unverändert (PROJ-1).
- **Nur `answer_comment` weicht ab** (Antwort gleich): wird wie jede Antwortabweichung behandelt *(Refinement 2026-11-14)*.
- **Antwort entfernt** (in der Datei leer, in der DMRL `y`/`n`): gilt als abweichende Antwort; bei Übernahme ist die Antwort danach leer *(Refinement 2026-11-14)*.
- **Eintrag mit fachlicher Änderung und abweichender Antwort, Übernahme nicht gewählt:** fachliche Änderung wird übernommen (*in Bearbeitung*), die bisherige Antwort bleibt *(Refinement 2026-11-14)*.
- **Eintragstyp entfernt** (z. B. `n` → leer): Fehler nach Regel F, wenn der Eintrag *in Bearbeitung* wäre — unabhängig von der Antwortübernahme *(Refinement 2026-11-14, BUG-QA4-1)*.
- **Altbestand *in Bearbeitung* ohne Eintragstyp** (vor der Korrektur entstanden): beim nächsten Check-in Fehler, bis ein Eintragstyp gesetzt ist — repariert den Zustand *(Refinement 2026-11-14)*.
- **Zwei Tabs:** Übernahme im zweiten Tab nach bereits erfolgtem Check-in schlägt fehl, da keine Sperre mehr besteht.

## Technical Requirements (optional)
- Prüfung und Übernahme im Browser, ohne Serverfunktion
- 1.000 Einträge in wenigen Sekunden prüfen und übernehmen
- Maximale Dateigröße 5 MB

## Open Questions
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
| Partner-Antworten bleiben bis zum nächsten REPLY erhalten | Begründung der Überarbeitung bleibt sichtbar | 2026-11-12 |
| Änderung nur des Eintragstyps zählt als Änderung | Erneutes Senden abgelehnter Einträge mit `n` (NSG) | 2026-11-12 |
| Erster abgeschlossener Check-in (auch ohne Änderung) → „im Workflow verwendet" | Konsistent mit PROJ-4/5/6/9 | 2026-11-12 |
| Abweichende `answer`/`answer_comment` sind kein Fehler mehr, sondern werden optional übernommen | Übernahme von Altbeständen mit Partnerantworten (PROJ-20) | 2026-11-14 |
| Eine Abfrage für alle abweichenden Antworten (Kästchen, standardmäßig aus) statt je Eintrag | Einfach; bewusste Entscheidung, keine unbemerkte Übernahme | 2026-11-14 |
| Übernommene Antworten sind nur Information; Status nie *freigegeben*/*zu überarbeiten* | PRD: Freigabe nur durch Partner per REPLY | 2026-11-14 |
| Übernommene Antwortänderung zählt als Änderung (*in Bearbeitung*, Freigabe der DMRL aufgehoben) | *freigegeben* bleibt immer durch einen REPLY belegt | 2026-11-14 |
| Nach dem Check-in kein Eintrag *in Bearbeitung* ohne Eintragstyp — Fehler nach Regel F, auch bei entferntem Eintragstyp und für Altbestand | QA-Befund BUG-QA4-1: solche Einträge würden nie gesendet, die DMRL nie wieder freigegeben | 2026-11-14 |
| Kriterium „freigegebener Eintrag mit geänderter Antwort → in Bearbeitung“ ersetzt durch Eintrag *zu überarbeiten*; freigegebene Einträge ohne Typ sind bei Antwortübernahme immer gesperrt | QA-Befund BUG-QA4-2: Widerspruch zur Entscheidung „Eintragstyp verlangen“ | 2026-11-14 |
| Antwortübernahme bei Einträgen ohne Eintragstyp verlangt einen Eintragstyp; sonst „Übernehmen“ gesperrt (nur bei angekreuzter Übernahme) | Sonst entstünde ein Eintrag *in Bearbeitung*, der nie gesendet und freigegeben werden kann; entspricht Regel F | 2026-11-14 |

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

### I) Refinement 2026-11-14 — Partnerantworten aus der Datei übernehmen
Ergänzt das bestehende Design; alles Übrige (A–H) gilt unverändert. Weiterhin alles im Browser, kein Backend.

**Komponenten (Änderungen im Check-in-Dialog, Schritt 3b „Zusammenfassung“)**
```
Zusammenfassung
+-- Zahlen: geprüft · neu · geändert · unverändert   ← passen sich dem Häkchen sofort an
+-- Hinweise, Liste neuer / geänderter Einträge       ← Antwortfelder erscheinen hier nicht mehr
+-- NEU: Abschnitt „Abweichende Partnerantworten (N Einträge)“ (nur wenn N > 0)
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
- E2E: Partnerantworten in der Check-out-CSV ändern → einchecken ohne Häkchen (Antworten bleiben, unverändert) und mit Häkchen (Werte übernommen, *in Bearbeitung*, Verlaufszusatz); freigegebenen Eintrag nur in der Antwort ändern → Sperre bei Häkchen; Durchlauf mit einer über PROJ-20 konvertierten CSV, sobald PROJ-20 umgesetzt ist.

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

### Refinement 2026-11-14 — Partnerantworten aus der Datei übernehmen
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
- `src/components/workflows/check-in-dialog.tsx` — neuer Abschnitt „Abweichende Partnerantworten (N Einträge)“ in der Zusammenfassung:
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
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 25/25 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

### QA-Lauf 4 — Refinement 2026-11-14 (Partnerantworten aus der Datei übernehmen)

**Tested:** 2026-11-14 · **Tester:** QA Engineer (AI) · **Browser:** Chrome (Playwright, `PW_CHANNEL=chrome`); Firefox/Safari nicht installiert
**Automatisiert:** Vitest 444 ✅ (1 übersprungen: BUG-QA4-1, nach Behebung aktivieren) · Playwright 72/72 ✅ Gesamtlauf + 2 neue QA-Tests (XSS, 768 px) in `tests/PROJ-10-checkin-antworten.spec.ts`

#### Acceptance Criteria Status (Abschnitt „Partnerantworten aus der Datei“)
- [x] Abweichende Antworten sind kein Fehler; Abschnitt „Abweichende Partnerantworten (N Einträge)“ mit DMC und alt → neu (Unit, Komponente, E2E)
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

## Deployment
_To be added by /deploy_
