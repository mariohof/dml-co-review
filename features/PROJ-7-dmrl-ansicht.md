# PROJ-7: DMRL-Ansicht

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — DMRL, Einträge, Archiv
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriffsschutz, Dashboard als Einstieg
- Requires: PROJ-6 (DMRL anlegen) — Kopfangaben der DMRL
- Requires: PROJ-17 (DMRL-Berechtigungen) — Sichtbarkeit für Bearbeiter
- Wird genutzt von: PROJ-9, 10, 12, 13, 15 (Aktionen werden aus der DMRL-Ansicht gestartet)

## Beschreibung
Die DMRL-Ansicht ist die zentrale Arbeitsseite einer DMRL. Sie zeigt Kopfdaten, Status, Sperre und alle Datenmodul-Einträge. Sie ist **reine Anzeige**: Einträge ändern sich ausschließlich über die Workflows Check-out/Check-in (PROJ-9/10) und REPLY-Import (PROJ-13), damit jede Änderung die Prüfungen durchläuft. Die Ansicht stellt die Schaltflächen für die Workflows bereit; deren Verhalten ist in den jeweiligen Features spezifiziert.

## Aufbau

```
DMRL-Ansicht
+-- Kopfbereich
|   +-- Systembezeichnung · Model Ident Code · S1000D-Issue
|   +-- Originator · DML-Typ · Sicherheitseinstufung
|   +-- Versionsindex (z. B. 00002-2026) · letzter SEND (Partner, Datum, Bearbeiter)
|   +-- DMRL-Status (farbiges Kennzeichen) · Sperre ("ausgecheckt von … seit …")
|   +-- Hinweisbanner, solange nicht freigegeben
+-- Aktionsleiste: Check-out · Check-in · SEND · REPLY importieren · Archiv
|   (Verhalten → PROJ-9, 10, 12, 13, 15)
+-- Zählerleiste je Eintragsstatus
+-- Filter (Eintragsstatus, Eintragstyp) · Suche (DMC, Tech Name, Info Name)
+-- Eintragstabelle
|   +-- DMC · Tech Name · Info Name · Eintragstyp · Sicherheitseinstufung · Eintragsstatus · Partner-Kommentar
+-- Detailfenster (Klick auf Zeile): alle Felder des Eintrags
```

## Darstellung der Einträge

**DMC** wird aus den Einzelfeldern zusammengesetzt (Issue 2.3):
`modelic-sdc-chapnum-section subsect-subject-discode discodev-incode incodev-itemloc`
Beispiel: `PHUNGUN-A-A05-40-0000-01A-000A-A`

Es gibt **zwei verschiedene Typ-Felder**, die nicht verwechselt werden dürfen:

| Begriff | XPath | Werte | Bedeutung |
|---|---|---|---|
| **Eintragstyp** (`dmentryType`) | `/dml/dmentry/@type` | leer, `n`, `c`, `d` | Änderungsart des DMRL-Eintrags in der Abstimmung mit dem Partner |
| **DM-Ausgabetyp** (`type`) | `/dml/dmentry/addresdm/issno/@type` | `new`, `changed`, `revised`, `deleted` | Art der Ausgabe des Datenmoduls selbst |

**Eintragstyp (`/dml/dmentry/@type`) — Bedeutung für die Abstimmung:**
| Eintragstyp | Anzeige | Bedeutung |
|-----|---------|-----------|
| `n` | „neu" | neuer Eintrag, wartet auf Abstimmung |
| `c` | „geändert" | geänderter Eintrag, wartet auf Abstimmung |
| `d` | „Löschung" (durchgestrichen, ausgegraut) | Löschung beantragt, wartet auf Abstimmung |
| leer | — | abgestimmt / genehmigt |

**DM-Ausgabetyp (`/dml/dmentry/addresdm/issno/@type`) = `deleted`:** Kennzeichen „DM gelöscht" — das Datenmodul ist gelöscht; der Eintrag bleibt zur Information in der DMRL. Der Wert wird vom Bearbeiter manuell eingetragen. Der DM-Ausgabetyp wird nur angezeigt (Detailfenster, Kennzeichen); er hat keinen Einfluss auf den Eintragsstatus.

## Regel REPLY → Eintrag (festgehalten für PROJ-13/14)
Betrifft ausschließlich den **Eintragstyp** (`/dml/dmentry/@type`); der DM-Ausgabetyp bleibt unverändert.
- `answer="y"` → **Eintragstyp wird entfernt**, Eintrag ist **genehmigt** (Status *freigegeben*). Gilt auch für Eintragstyp `d`: der Eintrag bleibt in der DMRL bestehen.
- `answer="n"` → **Eintragstyp bleibt**, Eintrag muss überarbeitet und erneut an den Partner gesendet werden (Status *zu überarbeiten*).

## User Stories
- Als **Bearbeiter** möchte ich alle Einträge einer DMRL mit DMC, Titel, Eintragstyp und Status sehen, damit ich den Stand der Abstimmung kenne.
- Als **Bearbeiter** möchte ich auf einen Blick sehen, ob die DMRL freigegeben, gesendet oder ausgecheckt ist und von wem, damit ich weiß, was als Nächstes zu tun ist.
- Als **Bearbeiter** möchte ich nach Status und Eintragstyp filtern und nach DMC oder Titel suchen, damit ich bei großen DMRLs gezielt die Einträge „zu überarbeiten" finde.
- Als **Bearbeiter** möchte ich die Kommentare des Partners zu abgelehnten Einträgen sehen, damit ich weiß, was zu überarbeiten ist.
- Als **Bearbeiter** möchte ich alle Felder eines Eintrags im Detail sehen, damit ich ihn vollständig prüfen kann.
- Als **Product Owner** möchte ich einen deutlichen Hinweis sehen, solange eine DMRL nicht freigegeben ist, damit niemand sie versehentlich in einem TP-Projekt verwendet.

## Out of Scope
- Direkte Bearbeitung von Einträgen in der Anwendung — bewusst ausgeschlossen (nur über Workflows)
- Verhalten der Aktionen Check-out, Check-in, SEND, REPLY, Archiv → PROJ-9, 10, 12, 13, 15
- Ermittlung/Änderung des DMRL-Status → PROJ-14
- Schalter „Löschungen ausblenden"
- Entfernen von Einträgen aus der DMRL nach genehmigter Löschung (Einträge bleiben bestehen)
- Sortierung/Spaltenauswahl durch den Benutzer (feste Sortierung nach DMC)
- Export der Ansicht (Druck, PDF)
- DMC-Darstellung für Issue 4.2/5.0 mit abweichender Struktur → bei Klärung des Mappings (PROJ-12/13)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Bearbeiter ist für eine DMRL berechtigt, wenn er sie im Dashboard anklickt, dann öffnet sich die DMRL-Ansicht
- [ ] Angenommen ein Administrator ist angemeldet, wenn er eine beliebige DMRL im Dashboard anklickt, dann öffnet sich die DMRL-Ansicht
- [ ] Angenommen ein Bearbeiter ist für eine DMRL nicht berechtigt, wenn er ihre Ansicht direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)
- [ ] Angenommen eine DMRL existiert nicht (mehr), wenn ihre Ansicht direkt aufgerufen wird, dann erscheint „DMRL nicht gefunden" mit Link zum Dashboard

### Kopfbereich
- [ ] Angenommen die DMRL-Ansicht ist geöffnet, wenn der Kopfbereich angezeigt wird, dann zeigt er Systembezeichnung, Model Ident Code, S1000D-Issue, Originator (CAGE-Code und Name), DML-Typ, Sicherheitseinstufung und DMRL-Status
- [ ] Angenommen die DMRL wurde mindestens einmal gesendet, wenn der Kopfbereich angezeigt wird, dann zeigt er den aktuellen Versionsindex sowie Partner, Datum und Bearbeiter des letzten SEND
- [ ] Angenommen die DMRL wurde noch nie gesendet, wenn der Kopfbereich angezeigt wird, dann steht beim Versionsindex „— noch nicht gesendet —"
- [ ] Angenommen die DMRL ist ausgecheckt, wenn der Kopfbereich angezeigt wird, dann zeigt er „Ausgecheckt von [Name] seit [Datum/Uhrzeit]"
- [ ] Angenommen die DMRL ist nicht freigegeben, wenn die Ansicht angezeigt wird, dann erscheint das Banner „Nicht freigegeben — darf nicht in einem Technische-Publikation-Projekt verwendet werden"
- [ ] Angenommen die DMRL ist freigegeben, wenn die Ansicht angezeigt wird, dann erscheint kein Banner und der Status ist als „freigegeben" hervorgehoben

### Zählerleiste
- [ ] Angenommen die DMRL hat Einträge, wenn die Zählerleiste angezeigt wird, dann zeigt sie die Anzahl je Eintragsstatus (in Bearbeitung, gesendet, freigegeben, zu überarbeiten) und die Gesamtzahl
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die DMRL PHUNGUN geöffnet wird, dann zeigt die Zählerleiste 32 Einträge, davon 32 gesendet

### Eintragstabelle
- [ ] Angenommen die DMRL hat Einträge, wenn die Tabelle angezeigt wird, dann zeigt sie je Eintrag DMC, Tech Name, Info Name, Eintragstyp, Sicherheitseinstufung, Eintragsstatus und Partner-Kommentar, sortiert nach DMC
- [ ] Angenommen ein Eintrag hat die Felder `PHUNGUN`, `A`, `A05`, `4`, `0`, `0000`, `01`, `A`, `000`, `A`, `A`, wenn die Tabelle angezeigt wird, dann lautet sein DMC `PHUNGUN-A-A05-40-0000-01A-000A-A`
- [ ] Angenommen ein Eintrag hat Eintragstyp `n`, `c` oder `d`, wenn die Tabelle angezeigt wird, dann wird der Eintragstyp als „neu", „geändert" bzw. „Löschung" angezeigt
- [ ] Angenommen ein Eintrag hat Eintragstyp `d`, wenn die Tabelle angezeigt wird, dann ist die Zeile durchgestrichen und ausgegraut
- [ ] Angenommen ein Eintrag hat einen leeren Eintragstyp, wenn die Tabelle angezeigt wird, dann ist die Spalte Eintragstyp leer
- [ ] Angenommen ein Eintrag hat den DM-Ausgabetyp `deleted` (`addresdm/issno/@type`), wenn die Tabelle angezeigt wird, dann trägt er das Kennzeichen „DM gelöscht"
- [ ] Angenommen ein Eintrag hat Status „zu überarbeiten", wenn die Tabelle angezeigt wird, dann ist der Status farblich hervorgehoben und der Partner-Kommentar sichtbar
- [ ] Angenommen eine Zeile wird angeklickt oder per Tastatur ausgewählt, wenn das Detailfenster öffnet, dann zeigt es alle Felder des Eintrags (inkl. `rpc`, `rpcname`, `language`, `country`, `issno`, DM-Ausgabetyp `type`, Datum, `answer`, `answer_comment`, `remarks`) ohne Bearbeitungsmöglichkeit
- [ ] Angenommen die DMRL hat keine Einträge, wenn die Ansicht angezeigt wird, dann erscheint „Noch keine Einträge — Einträge werden über Check-out/Check-in erfasst"

### Filter & Suche
- [ ] Angenommen die Tabelle wird angezeigt, wenn ein Eintragsstatus als Filter gewählt wird, dann werden nur Einträge mit diesem Status angezeigt
- [ ] Angenommen die Tabelle wird angezeigt, wenn ein Eintragstyp als Filter gewählt wird (neu, geändert, Löschung, ohne Typ), dann werden nur Einträge mit diesem Eintragstyp angezeigt
- [ ] Angenommen die Tabelle wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur Einträge angezeigt, deren DMC, Tech Name oder Info Name den Begriff enthält (ohne Unterscheidung Groß-/Kleinschreibung)
- [ ] Angenommen Filter und Suche liefern keine Treffer, wenn die Tabelle angezeigt wird, dann erscheint „Keine Einträge gefunden" mit der Aktion „Filter zurücksetzen"

### Reine Anzeige
- [ ] Angenommen die DMRL-Ansicht ist geöffnet, wenn ein Eintrag betrachtet wird, dann gibt es keine Möglichkeit, ihn direkt zu ändern, hinzuzufügen oder zu löschen

### Aktionsleiste
- [ ] Angenommen die DMRL-Ansicht ist geöffnet, wenn die Aktionsleiste angezeigt wird, dann enthält sie Check-out, Check-in, SEND, REPLY importieren und Archiv; Verfügbarkeit und Verhalten richten sich nach PROJ-9, 10, 12, 13, 15

## Edge Cases
- **Große DMRL (mehrere hundert Einträge):** Tabelle bleibt bedienbar (Seitenweise Anzeige oder Scrollen); Filter und Suche reagieren ohne spürbare Verzögerung.
- **Leere DMC-Teilfelder:** werden im DMC als leerer Abschnitt dargestellt, kein Absturz.
- **Sehr lange Tech-/Info-Namen:** werden in der Tabelle gekürzt, im Detailfenster vollständig angezeigt.
- **DMRL wird in anderem Tab ausgecheckt:** Sperre wird beim nächsten Laden angezeigt.
- **Bearbeiter verliert Berechtigung, während Ansicht geöffnet ist:** nächster Seitenaufruf → „Keine Berechtigung".
- **Eintragstyp `d` mit `answer="y"`:** Eintragstyp ist leer, Zeile nicht mehr durchgestrichen; ggf. Kennzeichen „DM gelöscht", falls der DM-Ausgabetyp `deleted` gesetzt ist.
- **Mobile Ansicht:** Tabelle horizontal scrollbar, Kopfbereich untereinander.

## Technical Requirements (optional)
- Zugriff nur für berechtigte Bearbeiter und Administratoren (PROJ-2, PROJ-17)
- Reine Anzeige — keine Schreibzugriffe aus dieser Ansicht heraus (außer über die Workflow-Aktionen)
- Tastaturbedienbarkeit der Tabelle und des Detailfensters

## Open Questions
- [ ] DMC-Zusammensetzung für Issue 4.2 / 5.0 (abweichende Codestruktur, z. B. Learn Code) — nach Schema-Vergleich (PROJ-12/13)
- [ ] Soll die Spalte „Sicherheitseinstufung" Abweichungen zur DMRL-Einstufung hervorheben? (Annahme: nein, unabhängig — PROJ-6)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| DMRL-Ansicht ist reine Anzeige; Änderungen nur über Workflows | Vorgabe Product Owner — jede Änderung durchläuft die Prüfungen | 2026-11-12 |
| Kopfbereich mit Versionsindex, letztem SEND, Status, Sperre und Hinweisbanner | Bearbeiter sieht sofort Stand und nächste Schritte; TP-Sperre sichtbar (PRD) | 2026-11-12 |
| DMC als zusammengesetzter Code in einer Spalte | Lesbarkeit; Einzelfelder im Detailfenster | 2026-11-12 |
| Filter nach Status und Eintragstyp, Suche über DMC/Tech Name/Info Name | Gezieltes Finden abgelehnter Einträge | 2026-11-12 |
| Eintragstyp `d` wird angezeigt (durchgestrichen); kein Schalter „Löschungen ausblenden" | Vorgabe Product Owner | 2026-11-12 |
| REPLY `answer="y"` entfernt den Eintragstyp (`dmentry/@type`), Eintrag genehmigt; `answer="n"` behält ihn, zu überarbeiten | Vorgabe Product Owner (Regel für PROJ-13/14) | 2026-11-12 |
| Genehmigte Löschung (`d` + `y`): Eintrag bleibt in der DMRL, nur der Eintragstyp wird entfernt | Vorgabe Product Owner | 2026-11-12 |
| DM-Ausgabetyp `addresdm/issno/@type = deleted` kennzeichnet gelöschte Datenmodule; manuell vom Bearbeiter gesetzt; Anzeige „DM gelöscht" | Vorgabe Product Owner | 2026-11-12 |
| Zwei Typ-Felder getrennt benannt: „Eintragstyp" (`/dml/dmentry/@type`) und „DM-Ausgabetyp" (`/dml/dmentry/addresdm/issno/@type`) | Hinweis Product Owner — Verwechslungsgefahr | 2026-11-12 |
| Aktionsleiste in der Ansicht, Verhalten in den Workflow-Features | Ein zentraler Einstieg für alle Workflows | 2026-11-12 |

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
