# PROJ-19: Lokaler Start (Python-Startskript)

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-11 (XSD-Validierung) — xmllint wird als Voraussetzung geprüft
- Betrifft alle Features: startet die gesamte Anwendung lokal
- Bezug: PROJ-1 (Daten bleiben im Browser; Formatwechsel nach Update → Hinweis „Demo-Daten neu laden")

## Beschreibung
Der Prototyp läuft nur lokal auf einem Rechner mit macOS, Windows 11 oder Linux (PRD). Damit der Product Owner und andere Anwender ihn ohne Entwicklerkenntnisse starten können, gibt es **Startdateien zum Doppelklicken** je Betriebssystem. Sie rufen ein **Python-Startskript** auf, das die Voraussetzungen prüft, die Anwendung bei Bedarf installiert und baut, sie lokal startet und den Browser öffnet.

## Startdateien (Doppelklick)
| Betriebssystem | Datei | Verhalten |
|---|---|---|
| macOS | `Start.command` | prüft Python 3; fehlt es → Meldung, Fenster wartet auf Tastendruck; sonst Python-Startskript mit Port 8877 und Browser öffnen; bei Fehler bleibt das Fenster offen |
| Windows 11 | `Start.bat` | wie macOS; probiert `py` und `python` |
| Linux | `start.sh` | wie macOS |

Alle drei liegen im Hauptordner des Projekts.

## Python-Startskript
1. **Voraussetzungen prüfen**
   | Voraussetzung | Mindestversion | fehlt / zu alt |
   |---|---|---|
   | Python | 3.9 | verständliche Meldung mit benötigter Version |
   | Node.js | 20 LTS | Abbruch mit Installationshinweis je Betriebssystem |
   | xmllint | beliebig | Abbruch mit Installationshinweis (macOS vorinstalliert, Linux `libxml2-utils`, Windows libxml2-Binärpaket inkl. Pfad) |

   Keine automatische Installation von Node.js oder xmllint.
2. **Pakete installieren** — nur beim ersten Start oder wenn sich die Paketliste geändert hat.
3. **App bauen** — nur beim ersten Start oder wenn sich der Projektstand geändert hat (Update); `--neu-bauen` erzwingt den Neubau.
4. **App starten** im Produktionsmodus, **nur unter localhost** erreichbar, Standard-Port **8877**. Ist der Port belegt, **Abbruch** mit „Port 8877 ist belegt — läuft die Anwendung bereits? Dann einfach http://localhost:8877 im Browser öffnen." (kein Ausweichen, da die Browser-Daten an die Adresse gebunden sind).
5. **Warten**, bis die App erreichbar ist, dann **Standard-Browser öffnen** (außer `--kein-browser`).
6. **Konsole:** deutsche Fortschrittsmeldungen („Prüfe Voraussetzungen … ok", „Baue Anwendung …"), am Ende „Anwendung läuft unter http://localhost:8877 — Beenden mit Strg+C oder Fenster schließen".
7. **Beenden** mit Strg+C oder Schließen des Fensters: App stoppt sauber; Daten bleiben im Browser.

**Optionen:** Port als Zahl (z. B. `8877`), `--open` / `--kein-browser`, `--neu-bauen`.

## Weitergabe & Update
- Weitergabe als **Projektordner** (ZIP oder Git-Klon) mit Kurzanleitung **`START-HIER.md`** (Voraussetzungen je Betriebssystem, Doppelklick-Start, macOS-Freigabe der blockierten Startdatei beim ersten Start, Beenden).
- **Update:** neuer Projektstand wird eingespielt; das Skript erkennt die Änderung beim nächsten Start und installiert/baut neu.
- **Daten** bleiben im Browser; bei geändertem Datenformat greift PROJ-1 (Hinweis + „Demo-Daten neu laden").

## User Stories
- Als **Product Owner** möchte ich den Prototyp per Doppelklick starten, damit ich ihn ohne Entwicklerkenntnisse vorführen kann.
- Als **Anwender** möchte ich bei fehlenden Voraussetzungen eine klare Meldung mit Installationshinweis für mein Betriebssystem erhalten, damit ich das Problem selbst lösen kann.
- Als **Anwender** möchte ich, dass sich nach dem Start automatisch der Browser mit der Anwendung öffnet.
- Als **Anwender** möchte ich, dass ein zweiter Start schnell geht (ohne erneutes Installieren und Bauen), wenn sich nichts geändert hat.
- Als **Anwender** möchte ich nach einem Update einfach wieder doppelklicken können, ohne manuelle Schritte.
- Als **Anwender** möchte ich die Anwendung sauber beenden können, ohne meine Daten zu verlieren.

## Out of Scope
- Automatische Installation von Node.js, xmllint oder Python
- Installer-Pakete (.dmg, .msi), App-Symbole, Autostart
- Betrieb als Server für mehrere Rechner / Netzwerkzugriff (nur localhost)
- Cloud-Hosting (Vercel o. ä.) — PRD
- Automatische Update-Prüfung oder Download neuer Versionen
- Datensicherung/Übertragung der Browser-Daten auf einen anderen Rechner
- Entwicklungsmodus (`npm run dev`) — bleibt für Entwickler wie gehabt

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Startdateien
- [ ] Angenommen macOS mit Python 3, Node.js 20+ und xmllint, wenn `Start.command` doppelgeklickt wird, dann startet die Anwendung und der Browser öffnet `http://localhost:8877`
- [ ] Angenommen Windows 11 mit `py` oder `python`, Node.js und xmllint, wenn `Start.bat` doppelgeklickt wird, dann startet die Anwendung und der Browser öffnet sich
- [ ] Angenommen Linux mit Python 3, Node.js und xmllint, wenn `start.sh` ausgeführt wird, dann startet die Anwendung und der Browser öffnet sich
- [ ] Angenommen Python 3 ist nicht installiert, wenn eine Startdatei ausgeführt wird, dann erscheint „Python 3 wurde nicht gefunden. Bitte Python 3 installieren und erneut starten." und das Fenster wartet auf einen Tastendruck
- [ ] Angenommen das Startskript endet mit einem Fehler, wenn es aus einer Startdatei aufgerufen wurde, dann bleibt das Fenster offen, bis eine Taste gedrückt wird

### Voraussetzungen
- [ ] Angenommen Python ist älter als 3.9, wenn das Startskript läuft, dann meldet es die benötigte Version und beendet sich
- [ ] Angenommen Node.js fehlt oder ist älter als 20, wenn das Startskript läuft, dann bricht es mit einem Installationshinweis für das erkannte Betriebssystem ab
- [ ] Angenommen xmllint fehlt, wenn das Startskript läuft, dann bricht es mit einem Installationshinweis für das erkannte Betriebssystem ab
- [ ] Angenommen eine Voraussetzung fehlt, wenn das Startskript abbricht, dann wurde nichts installiert oder gestartet

### Installieren, Bauen, Starten
- [ ] Angenommen der erste Start, wenn das Startskript läuft, dann werden Pakete installiert, die App gebaut, gestartet und der Browser geöffnet
- [ ] Angenommen ein zweiter Start ohne Änderung am Projektstand, wenn das Startskript läuft, dann wird weder installiert noch gebaut
- [ ] Angenommen der Projektstand wurde aktualisiert, wenn das Startskript läuft, dann wird automatisch neu installiert (falls nötig) und neu gebaut
- [ ] Angenommen `--neu-bauen` wird angegeben, wenn das Startskript läuft, dann wird die App neu gebaut
- [ ] Angenommen Port 8877 ist belegt, wenn das Startskript läuft, dann bricht es mit dem Hinweis „Port 8877 ist belegt — läuft die Anwendung bereits? …" ab und startet keine zweite Instanz
- [ ] Angenommen ein anderer Port wird ausdrücklich angegeben (z. B. `8900`), wenn das Startskript läuft, dann startet die App auf diesem Port und die Konsole weist darauf hin, dass dort ein eigener Datenbestand im Browser gilt
- [ ] Angenommen ein anderer Rechner im Netzwerk ruft die Adresse des Rechners auf, wenn die App läuft, dann ist sie dort nicht erreichbar (nur localhost)
- [ ] Angenommen `--kein-browser` wird angegeben, wenn die App gestartet ist, dann öffnet sich kein Browser, die Adresse steht in der Konsole
- [ ] Angenommen Installation oder Build schlagen fehl, wenn das Startskript läuft, dann erscheint eine verständliche Meldung mit Hinweis auf die Ursache und das Skript endet mit Fehler

### Betrieb & Beenden
- [ ] Angenommen die App läuft, wenn die XSD-Prüfung (PROJ-11) genutzt wird, dann funktioniert sie mit dem geprüften xmllint
- [ ] Angenommen die App läuft, wenn Strg+C gedrückt oder das Fenster geschlossen wird, dann wird sie beendet und der Port wieder frei
- [ ] Angenommen Daten wurden in der Anwendung geändert, wenn die App beendet und erneut gestartet wird, dann sind die Daten im selben Browser weiterhin vorhanden

### Weitergabe
- [ ] Angenommen der Projektordner wird weitergegeben, wenn `START-HIER.md` geöffnet wird, dann beschreibt sie Voraussetzungen je Betriebssystem, den Start per Doppelklick, den macOS-Hinweis zum Freigeben der blockierten Startdatei (ab macOS 15: Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“; bis macOS 14: „Rechtsklick → Öffnen“) und das Beenden

## Edge Cases
- **macOS blockiert die Startdatei (Gatekeeper/Quarantäne):** Kurzanleitung beschreibt die Freigabe über Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“ (ab macOS 15), „Rechtsklick → Öffnen“ (bis macOS 14) und alternativ `xattr -dr com.apple.quarantine` im Terminal; Startdatei ist als ausführbar gespeichert.
- **Projektordner mit Leerzeichen oder Umlauten im Pfad** (z. B. „DMRL Prüfung"): Start funktioniert trotzdem.
- **Windows: xmllint nicht im Systempfad:** Hinweis, den Pfad in der Einstellung von PROJ-11 anzugeben bzw. in den Systempfad aufzunehmen.
- **Zweimal gestartet:** zweiter Start bricht ab, da Port 8877 belegt ist; Hinweis, die bereits laufende Anwendung im Browser zu öffnen.
- **Port 8877 durch ein anderes Programm belegt:** Abbruch mit Hinweis; Ausweg: anderen Port angeben — mit Hinweis, dass dort ein eigener Datenbestand gilt (Kurzanleitung).
- **Keine Internetverbindung beim ersten Start:** Paketinstallation scheitert → Meldung „Für den ersten Start ist eine Internetverbindung nötig".
- **Build-Ordner beschädigt:** `--neu-bauen` als Hinweis in der Fehlermeldung.
- **Standard-Browser lässt sich nicht öffnen:** Adresse steht in der Konsole zum manuellen Öffnen.

## Technical Requirements (optional)
- Nur Python-Standardbibliothek (keine zusätzlichen Python-Pakete)
- Läuft unter macOS, Windows 11, Linux
- Zweiter Start ohne Änderung in wenigen Sekunden bis zur geöffneten Anwendung

## Open Questions
- [x] Browser-Daten hängen am Port: bei belegtem Port 8877 abbrechen statt ausweichen? → Ja, Abbruch mit Hinweis; anderer Port nur auf ausdrückliche Angabe (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Start per Doppelklick über Startdatei je Betriebssystem, die ein Python-Startskript aufruft | Vorgabe Product Owner (Beispiel `Start.command`) | 2026-11-12 |
| Standard-Port 8877, Browser wird geöffnet | Vorgabe Product Owner (Beispiel) | 2026-11-12 |
| Belegter Port → Abbruch statt Ausweichport; anderer Port nur ausdrücklich | Browser-Daten sind an die Adresse gebunden — Daten immer unter derselben Adresse | 2026-11-12 |
| Prüfung von Python ≥ 3.9, Node.js ≥ 20, xmllint; keine automatische Installation | Kein Systemeingriff, keine Administratorrechte nötig | 2026-11-12 |
| Installieren/Bauen nur bei Bedarf, `--neu-bauen` als Ausweg | Schneller Start im Alltag | 2026-11-12 |
| Nur localhost erreichbar | Lokaler Betrieb laut PRD; keine Zugriffssteuerung nötig (PROJ-11) | 2026-11-12 |
| Weitergabe als Projektordner mit `START-HIER.md`; Update durch neuen Projektstand, automatischer Neubau | Einfach, ohne Installer | 2026-11-12 |
| Fenster bleibt bei Fehlern offen | Meldungen bleiben lesbar | 2026-11-12 |
| macOS-Freigabe in `START-HIER.md` je macOS-Version beschrieben (ab 15 Systemeinstellungen, bis 14 Rechtsklick) plus Terminal-Alternative | Apple hat „Rechtsklick → Öffnen“ mit macOS 15 entfernt (BUG-QA3-2); eine Signierung/Notarisierung ist für den Prototyp nicht vorgesehen | 2026-11-14 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Startskript `scripts/start.py`, nur Python-Standardbibliothek; Startdateien im Hauptordner | Keine Zusatzinstallation, Logik an einer Stelle | 2026-11-12 |
| Update-Erkennung über Fingerabdruck von Lock-Datei und Projektstand (Stand-Vermerk, nicht in Git) | Funktioniert auch bei ZIP-Weitergabe | 2026-11-12 |
| Paketinstallation exakt nach Lock-Datei | Reproduzierbar | 2026-11-12 |
| Next.js-Produktionsserver nur an localhost, Port vorab geprüft | Sicherheit, Datenbindung an Adresse | 2026-11-12 |
| Unterprozesse beim Beenden mitstoppen (auch Fensterschließen unter Windows) | Port wird frei, kein hängender Server | 2026-11-12 |
| Ausführliche Ausgaben in Protokolldatei, Konsole mit Kurzmeldungen | Verständlich und fehlersuchbar | 2026-11-12 |
| Next.js-Telemetrie abgeschaltet | Keine Datenübertragung | 2026-11-12 |
| Ausführbar-Kennzeichen und Zeilenenden der Startdateien im Projekt festgelegt | Funktion nach ZIP/Git-Klon | 2026-11-12 |
| Node.js-Mindestversion 20 in der Paketbeschreibung | Klare Voraussetzung | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
PROJ-19 hat **keine Oberfläche in der App**. Es besteht aus drei kleinen **Startdateien** (je Betriebssystem), einem **Python-Startskript** (nur Standardbibliothek) und der Kurzanleitung **`START-HIER.md`**. Das Skript steuert die vorhandenen Projektbefehle (Pakete installieren, bauen, starten) und überwacht den laufenden Server. Die Anwendung selbst bleibt unverändert.

### A) Bestandteile
```
Projektordner (Hauptebene)
+-- Start.command      (macOS, Doppelklick)
+-- Start.bat          (Windows 11, Doppelklick)
+-- start.sh           (Linux)
+-- START-HIER.md      (Kurzanleitung)
+-- scripts/
    +-- start.py       (Python-Startskript)
```

### B) Ablauf des Startskripts
```
1. Optionen lesen (Port, --open / --kein-browser, --neu-bauen)
2. Voraussetzungen prüfen
   +-- Python ≥ 3.9
   +-- Node.js ≥ 20 (Versionsabfrage)
   +-- xmllint (Versionsabfrage; Pfad aus der Einstellung von PROJ-11, sonst Systempfad)
   +-- fehlt etwas → Installationshinweis für das erkannte Betriebssystem, Ende mit Fehler
3. Port prüfen (Standard 8877) → belegt: Hinweis „läuft die Anwendung bereits?", Ende mit Fehler
4. Pakete installieren, falls nötig
   +-- nötig, wenn noch keine installiert sind oder sich die Paketliste (Lock-Datei) geändert hat
   +-- exakt nach Lock-Datei installieren (reproduzierbar)
5. App bauen, falls nötig
   +-- nötig, wenn noch kein Build existiert, sich der Projektstand geändert hat oder --neu-bauen
6. App starten (Produktionsmodus, nur an localhost gebunden, gewählter Port)
7. Warten bis erreichbar (max. ca. 60 s) → Browser öffnen (außer --kein-browser)
8. Meldung „Anwendung läuft unter http://localhost:8877 — Beenden mit Strg+C oder Fenster schließen"
9. Beenden: Strg+C / Fenster schließen → Server und alle Unterprozesse werden gestoppt
```

### C) Daten (in Klartext)
Das Skript speichert nur **einen kleinen Stand-Vermerk** im Projektordner (nicht in Git): Fingerabdruck der Paketliste und des Projektstands beim letzten Installieren/Bauen. Daraus erkennt es Updates. Anwendungsdaten berührt es nicht (sie liegen im Browser, PROJ-1).

**Projektstand** = Inhalt der Quell- und Konfigurationsdateien, die das Ergebnis des Builds beeinflussen (Quellcode, öffentliche Dateien, Schemas, Paket- und Build-Konfiguration).

### D) Startdateien
- Wechseln in den Projektordner (auch bei Leerzeichen/Umlauten im Pfad).
- Suchen Python: macOS/Linux `python3`; Windows `py`, dann `python`.
- Fehlt Python → Meldung, Fenster wartet auf Tastendruck.
- Rufen das Startskript mit Port 8877 und „Browser öffnen" auf; bei Fehler bleibt das Fenster offen.
- macOS/Linux-Dateien werden als ausführbar im Projekt gespeichert; Zeilenenden je Betriebssystem werden festgelegt (Windows-Datei mit Windows-Zeilenenden), damit sie nach ZIP/Git-Klon funktionieren.

### E) Meldungen und Protokoll
- Konsole: kurze deutsche Schrittmeldungen („Prüfe Voraussetzungen … ok", „Installiere Pakete (einmalig) …", „Baue Anwendung …").
- Ausführliche Ausgaben von Installation und Build gehen in eine **Protokolldatei** im Projektordner; bei einem Fehler zeigt das Skript die letzten Zeilen und den Pfad zur Protokolldatei.
- Typische Fehler bekommen eine klare Erklärung (keine Internetverbindung beim ersten Start, Build fehlgeschlagen → `--neu-bauen`, Browser nicht öffnbar → Adresse manuell aufrufen).

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Python nur mit Standardbibliothek | Keine zusätzliche Installation; läuft mit jedem Python ≥ 3.9. |
| Startdateien rufen ein gemeinsames Python-Skript | Logik nur einmal; die Startdateien bleiben winzig. |
| Update-Erkennung über Fingerabdruck statt Git | Funktioniert auch bei Weitergabe als ZIP. |
| Installation exakt nach Lock-Datei | Auf jedem Rechner dieselben Paketversionen. |
| Server nur an localhost gebunden | Nicht aus dem Netzwerk erreichbar (PRD, PROJ-11). |
| Port vor dem Start prüfen, bei Belegung abbrechen | Daten im Browser hängen an der Adresse (Spec-Entscheidung). |
| Unterprozesse beim Beenden mitstoppen | Kein „hängender" Server, Port wird wieder frei — auch beim Fensterschließen unter Windows. |
| Ausführliche Ausgabe in Protokolldatei | Konsole bleibt verständlich; Details für Fehlersuche vorhanden. |
| Next.js-Telemetrie abgeschaltet | Lokaler Betrieb ohne Datenübertragung an Dritte. |
| xmllint-Pfad aus derselben Einstellung wie PROJ-11 | Was das Skript prüft, nutzt auch die App. |
| Mindestversion Node.js in der Paketbeschreibung hinterlegt | Klare Voraussetzung auch für Entwickler. |

### G) Abhängigkeiten (Pakete)
- **Keine** neuen npm- oder Python-Pakete.
- Systemvoraussetzungen: Python ≥ 3.9, Node.js ≥ 20, xmllint.

### H) Testbarkeit
- Unit-Tests des Startskripts mit der Python-Standard-Testbibliothek: Versionsvergleich, Fingerabdruck/Update-Erkennung, Port-Prüfung, Optionen, Installationshinweise je Betriebssystem.
- Manuelle Prüfung je Betriebssystem (macOS, Windows 11, Linux): Erststart, Zweitstart ohne Build, Update, fehlendes Node.js/xmllint, belegter Port, Beenden per Strg+C und Fensterschließen, Pfad mit Leerzeichen/Umlauten.

## Implementation Notes
_Stand 2026-11-13 — `/frontend PROJ-19` (keine App-Oberfläche; Startskript, Startdateien, Kurzanleitung)_

**Umgesetzt**
- `scripts/start.py` (nur Python-Standardbibliothek):
  - Prüfung Python ≥ 3.9 (vor allen anderen Anweisungen), Node.js ≥ 20 und xmllint (Pfad aus `XMLLINT_PATH` wie in PROJ-11, sonst Systempfad). Bei Fehlen: Installationshinweise je Betriebssystem; es wird nichts installiert oder gestartet.
  - Port prüfen (Standard 8877): Verbindung und Bindung an 127.0.0.1; belegt → „Port 8877 ist belegt — läuft die Anwendung bereits? …".
  - Anderer Port nur ausdrücklich, mit Hinweis auf den eigenen Datenbestand im Browser.
  - Stand-Vermerk `.start-stand.json` (nicht in Git): Fingerabdruck der Lock-Datei sowie des Projektstands (`src`, `public`, `schemas`, Paket- und Build-Konfiguration; ohne Testdateien).
  - `npm ci` nur bei fehlenden Paketen oder geänderter Lock-Datei; Build nur bei fehlendem Build, geändertem Projektstand oder `--neu-bauen` (löscht `.next`).
  - Start: Produktionsserver von Next.js direkt über Node (ohne Shell), **nur an 127.0.0.1**, Telemetrie aus, Arbeitsordner = Projektordner (Schemas für PROJ-11).
  - Warten bis erreichbar (max. 60 s), danach Browser öffnen (außer `--kein-browser`); ist das nicht möglich, steht die Adresse in der Konsole.
  - Deutsche Kurzmeldungen in der Konsole; ausführliche Ausgaben in `start.log` (nicht in Git), bei Fehlern mit den letzten Zeilen. Gesonderte Hinweise bei fehlender Internetverbindung beim ersten Start und bei Build-Fehlern (`--neu-bauen`).
  - Beenden mit Strg+C, SIGTERM/SIGHUP (Fenster schließen) bzw. SIGBREAK (Windows): Server samt Unterprozessen stoppen (eigene Prozessgruppe; Windows `taskkill /T`).
- `Start.command` (macOS), `start.sh` (Linux), `Start.bat` (Windows, probiert `py -3`, dann `python`):
  - Wechsel in den Projektordner (Pfade mit Leerzeichen/Umlauten), Meldung bei fehlendem Python 3.
  - Fenster bleibt bei Fehlern offen (nicht bei Strg+C).
  - Ausführbar-Kennzeichen gesetzt; Zeilenenden über `.gitattributes` festgelegt (`.bat` CRLF, `.command`/`.sh`/`.py` LF).
- `START-HIER.md` — Voraussetzungen je Betriebssystem, Doppelklick-Start, macOS-Freigabe der blockierten Startdatei (BUG-QA3-2: ab macOS 15 über „Dennoch öffnen“ in den Systemeinstellungen, bis macOS 14 „Rechtsklick → Öffnen“, alternativ `xattr` im Terminal), Beenden, Update, Fehlerbehebung, Optionen.
- `package.json` — `engines.node >= 20`; `.gitignore` — Stand-Vermerk und Protokoll; `CLAUDE.md` — Befehle ergänzt.

**Tests**
- `scripts/test_start.py` (12, `python3 -m unittest discover -s scripts -p "test_*.py"`): Versionen, Hinweise je Betriebssystem, `XMLLINT_PATH`, Port frei/belegt, Optionen, Fingerabdruck (Testdateien ignoriert, Umlaute/Leerzeichen), Installieren/Bauen nur bei Bedarf, Abbruch ohne Installation/Start.
- Echter Lauf auf macOS (Port 8899, `--kein-browser`):
  - Erststart baut und startet; HTTP 200; XSD-Prüfung über die Serverfunktion liefert „gültig"; Server lauscht nur auf `127.0.0.1`.
  - Zweiter Start bei laufender App → Abbruch „Port … ist belegt".
  - Zweitstart ohne Änderung → „kein Neubau nötig", erreichbar nach ca. 1 s.
  - Strg+C und SIGTERM → Server beendet, Port frei.

**Noch nicht geprüft (manuell bei QA)**
- `npm ci` beim allerersten Start auf einem frischen Rechner (hier waren die Pakete bereits passend installiert; der Stand-Vermerk wurde dafür vorbelegt).
- Windows 11 und Linux, macOS-Doppelklick inkl. Gatekeeper, Python < 3.9, Fensterschließen unter Windows.

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
- [ ] Startdateien (0/5 geprüft, **ausstehend manuell**): Doppelklick macOS/Windows/Linux, Meldung bei fehlendem Python, Fenster bleibt offen — Skripte syntaktisch geprüft (`bash -n`, CRLF für `.bat`), echte Doppelklick-Tests stehen aus
- [x] Voraussetzungen (3/4): Node.js fehlt/zu alt, xmllint fehlt (Hinweise je Betriebssystem), Abbruch ohne Installation/Start — Unit; **ausstehend:** Python < 3.9 (Codeprüfung ok)
- [x] Installieren, Bauen, Starten (7/9): Zweitstart ohne Neubau (≈ 1 s), Update-Erkennung, `--neu-bauen`, Port belegt → Abbruch, anderer Port mit Hinweis, nur `127.0.0.1` (geprüft mit `lsof`), `--kein-browser` — echter Lauf auf macOS + Unit; **ausstehend:** Paketinstallation beim allerersten Start auf frischem Rechner, Meldung bei fehlgeschlagener Installation/Build im echten Lauf
- [x] Betrieb & Beenden (3/3): XSD-Prüfung im Produktionsbetrieb, Strg+C und SIGTERM beenden den Server (Port frei), Daten im Browser bleiben
- [x] Weitergabe (1/1): `START-HIER.md`

### Edge Cases Status
- [x] Pfad mit Leerzeichen/Umlauten (Fingerabdruck-Test), xmllint-Pfad unter Windows (Hinweis), zweimal gestartet, Port belegt, Browser nicht öffnbar (Adresse in der Konsole)
- [ ] Ausstehend manuell: Gatekeeper (macOS), keine Internetverbindung beim ersten Start, beschädigter Build-Ordner im echten Lauf

### Security Audit Results
- [x] Server nur an `127.0.0.1` gebunden (aus dem Netzwerk nicht erreichbar), Aufrufe ohne Shell, Next.js-Telemetrie aus, keine Geheimnisse; Stand-Vermerk und Protokoll nicht in Git

### Bugs Found

Keine Bugs gefunden. (Während der Umsetzung behoben: geerbtes „SIGINT ignorieren" verschluckte Strg+C.)

### Summary
- **Acceptance Criteria:** 14/22 passed, 8 ausstehend (manuelle Prüfung auf Windows 11, Linux, macOS-Doppelklick, frischer Rechner)
- **Bugs Found:** 0 total
- **Security:** Pass
- **Production Ready:** NO — erst nach manueller Prüfung auf den drei Betriebssystemen (Status bleibt *In Review*)

### Re-Test 2026-11-14 (QA-Lauf 3: echte Startläufe auf macOS)

**Umgebung:** macOS 27.2.1, Python 3.14.3, Node.js 26.8.1, xmllint (libxml2 2.9.13). Alle Läufe in einem **frischen Git-Klon** im Ordner „DMRL Prüfung“ (Leerzeichen und Umlaut im Pfad). Das Öffnen des Browsers wurde über die Umgebungsvariable `BROWSER` abgefangen und protokolliert. Linux war nicht prüfbar (Docker-Dienst nicht gestartet), Windows nicht verfügbar.

**Startdateien**
- [x] macOS `Start.command` wie per Doppelklick (Aufruf aus dem Home-Ordner als Arbeitsverzeichnis): startet auf Port 8877, Browser wird mit `http://localhost:8877` geöffnet
- [ ] Windows 11 `Start.bat`: **ausstehend manuell**; Codeprüfung ergibt BUG-QA3-1
- [ ] Linux `start.sh`: **ausstehend manuell** (gleicher Inhalt wie `Start.command`; die Fälle „Python fehlt“ und „wartet auf Taste“ sind mit bash geprüft)
- [x] Python fehlt (`Start.command` und `start.sh`, PATH ohne Python): Meldung „Python 3 wurde nicht gefunden …“, das Fenster wartet auf einen Tastendruck, Exit 1
- [x] Fehler aus dem Startskript (Port belegt): Meldung, Aufforderung „Taste drücken …“ im Terminal, Fenster bleibt offen bis zum Tastendruck; bei Strg+C (Exit 0) dagegen kein Warten

**Voraussetzungen**
- [x] Python älter als 3.9 (Version 3.8 simuliert): „Python 3.9 oder neuer wird benötigt (gefunden: 3.8)“, Exit 1, nichts gestartet. Die Syntax von `start.py` ist mit Python 3.6–3.8 lesbar (ast-Prüfung), die Versionsprüfung greift also

**Installieren, Bauen, Starten**
- [x] Erststart im frischen Klon: Pakete installiert, App gebaut und gestartet, Browser geöffnet; XSD-Prüfung im Produktionsbetrieb liefert „gültig“; nur an `127.0.0.1` gebunden (`lsof`)
- [x] Zweitstart ohne Änderung: kein Installieren/Bauen (0,9 s); mit `--kein-browser` öffnet sich kein Browser
- [x] Ohne Internet beim ersten Start (Registry nicht erreichbar, leerer Paket-Cache): Abbruch mit npm-Auszug und „Für den ersten Start ist eine Internetverbindung nötig.“, Exit 1, nichts gestartet
- [x] Build schlägt fehl (absichtlicher Typfehler): „Bauen der Anwendung ist fehlgeschlagen“ mit Protokollauszug, der die fehlerhafte Zeile zeigt, Tipp `--neu-bauen`, Exit 1; nach der Korrektur automatischer Neubau und Start
- [x] Build-Ordner beschädigt: Fehlt die Build-Kennung, wird automatisch neu gebaut. Fehlen Teile des Builds, erscheint „Die Anwendung ist nicht gestartet … Tipp: Mit „--neu-bauen“ erneut versuchen“; `--neu-bauen` repariert den Build

**Betrieb & Beenden**
- [x] Strg+C (SIGINT) und Fenster schließen (SIGHUP) beenden die App, der Port ist danach frei
- [x] Stand-Vermerk und `start.log` erscheinen nicht im Git-Status

**Automatisiert:** 12 Unit-Tests des Startskripts grün

**Hinweis (kein Bug):** Der Protokollauszug bei einem Build-Fehler enthält Farbcodes von Next.js. Im Terminal werden sie als Farben angezeigt, in `start.log` erscheinen sie als Steuerzeichen.

#### BUG-QA3-1: Windows — der Microsoft-Store-Platzhalter für Python verhindert die eigene Meldung
- **Severity:** Low
- **Gefunden durch:** Codeprüfung von `Start.bat`, nicht auf Windows ausgeführt
- **Steps to Reproduce:**
  1. Windows 11 ohne installiertes Python (die App-Ausführungsaliase für `python.exe` sind standardmäßig aktiv)
  2. `Start.bat` doppelklicken
  3. Expected: „Python 3 wurde nicht gefunden. Bitte Python 3 installieren und erneut starten.“
  4. Actual (erwartet laut Code): `where python` findet den Platzhalter unter `%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe`. Er wird ausgeführt und meldet auf Englisch bzw. Deutsch, dass Python im Microsoft Store installiert werden kann (Exit 9009). Das Fenster bleibt offen, aber die eigene Meldung mit dem Link zu python.org erscheint nicht.
- **Hinweis zur Behebung:** Python nicht mit `where`, sondern durch einen Probeaufruf erkennen (z. B. `python -c "import sys"` mit Prüfung des Exit-Codes)
- **Priority:** Nice to have

#### BUG-QA3-2: macOS — Anleitung „Rechtsklick → Öffnen“ gilt seit macOS 15 nicht mehr
- **Severity:** Low (Dokumentation)
- **Steps to Reproduce:**
  1. Projektordner als ZIP weitergeben und entpacken; `Start.command` erhält dabei die Quarantäne-Markierung
  2. Doppelklick → macOS blockiert (geprüft: `spctl` lehnt die markierte Datei ab, „no usable signature“)
  3. Expected: Der in `START-HIER.md` beschriebene Weg führt zum Start
  4. Actual: Seit macOS 15 (Sequoia) hat Apple das Umgehen über „Rechtsklick → Öffnen“ entfernt; der Weg führt über **Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“** (alternativ im Terminal `xattr -d com.apple.quarantine Start.command`)
- **Hinweis:** Der Dialog selbst ist ohne Bildschirmbedienung nicht prüfbar. Bitte beim manuellen Test bestätigen.
- **Priority:** Fix before Weitergabe (sonst bleibt der Empfänger am ersten Start hängen)
- **Status:** Behoben 2026-11-14 (`/frontend`) — `START-HIER.md` hat einen eigenen Abschnitt „macOS: blockierte Startdatei freigeben“: ab macOS 15 Schritt für Schritt über Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“, bis macOS 14 „Rechtsklick → Öffnen“, alternativ `xattr -dr com.apple.quarantine <Projektordner>` im Terminal. Die Terminal-Alternative ist geprüft: Nach dem Befehl hat der Ordner keine Quarantäne-Markierung mehr. Akzeptanzkriterium und Edge Case sind angepasst. Bestätigung des Dialogablaufs durch `/qa` bzw. den manuellen Test ausstehend.

### Summary (Re-Test 2026-11-14)
- **Acceptance Criteria:** 20/22 passed, 2 ausstehend (Windows 11 und Linux, nur manuell prüfbar)
- **Bugs Found:** 2 total (0 critical, 0 high, 0 medium, 2 low)
- **Security:** Pass
- **Production Ready:** keine Critical/High-Bugs. Der Status bleibt *In Review*, bis die Starts unter Windows 11 und Linux manuell bestätigt sind

## Deployment
_To be added by /deploy_
