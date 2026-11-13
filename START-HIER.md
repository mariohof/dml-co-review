# DMRL Management System — Start

Prototyp zur Verwaltung von Datenmodul-Anforderungslisten (S1000D). Er läuft **nur auf diesem Rechner** und ist im Netzwerk nicht erreichbar.

## 1. Voraussetzungen (einmalig installieren)

| Programm | macOS | Windows 11 | Linux |
|---|---|---|---|
| **Python 3.9 oder neuer** | meist vorhanden; sonst [python.org](https://www.python.org/downloads/) | [python.org](https://www.python.org/downloads/) — beim Installieren „Add python.exe to PATH" ankreuzen | meist vorhanden (`python3`) |
| **Node.js 20 oder neuer** | [nodejs.org](https://nodejs.org) (LTS) oder `brew install node` | [nodejs.org](https://nodejs.org) (LTS-Installer) | Paketverwaltung oder [nodejs.org](https://nodejs.org) |
| **xmllint** (XSD-Prüfung) | vorinstalliert; sonst `xcode-select --install` | libxml2-Binärpaket für Windows; Ordner mit `xmllint.exe` in den Systempfad aufnehmen **oder** Umgebungsvariable `XMLLINT_PATH` auf `…\xmllint.exe` setzen | Debian/Ubuntu: `sudo apt install libxml2-utils` · Fedora: `sudo dnf install libxml2` |

Fehlt etwas, meldet das Startskript, was zu tun ist — es installiert nichts selbst.

## 2. Starten (Doppelklick)

| Betriebssystem | Datei im Projektordner |
|---|---|
| macOS | **`Start.command`** |
| Windows 11 | **`Start.bat`** |
| Linux | **`start.sh`** (im Terminal: `./start.sh`) |

- Der **erste Start** dauert einige Minuten: Pakete werden installiert (Internetverbindung nötig) und die Anwendung gebaut.
- Danach öffnet sich der Browser mit **http://localhost:8877**. Folgende Starts gehen in wenigen Sekunden.
- **macOS, erster Start:** Falls macOS die Datei blockiert („kann nicht geöffnet werden"), **Rechtsklick auf `Start.command` → Öffnen → Öffnen**. Danach genügt der Doppelklick.

## 3. Beenden

Im Startfenster **Strg+C** drücken oder das Fenster schließen. Die Daten bleiben im Browser gespeichert und sind beim nächsten Start wieder da (gleicher Browser, gleiche Adresse).

## 4. Update

Neuen Projektstand in den Ordner übernehmen (ZIP entpacken bzw. `git pull`) und wie gewohnt starten — das Startskript erkennt die Änderung und installiert bzw. baut automatisch neu. Meldet die Anwendung danach ein geändertes Datenformat, „Demo-Daten neu laden" wählen.

## 5. Wenn etwas nicht klappt

| Meldung | Lösung |
|---|---|
| „Port 8877 ist belegt — läuft die Anwendung bereits?" | Die Anwendung läuft schon: einfach http://localhost:8877 öffnen. Ist ein anderes Programm auf dem Port, im Terminal einen anderen Port angeben: `python3 scripts/start.py 8900` — **Achtung:** unter einer anderen Adresse gilt im Browser ein eigener Datenbestand. |
| Fehler beim Bauen / Anwendung startet nicht | Neu bauen: `python3 scripts/start.py --neu-bauen` (Windows: `py -3 scripts\start.py --neu-bauen`). Details stehen in `start.log` im Projektordner. |
| „Für den ersten Start ist eine Internetverbindung nötig" | Mit dem Internet verbinden und erneut starten. |
| Browser öffnet sich nicht | Adresse aus dem Startfenster (http://localhost:8877) manuell im Browser öffnen. |
| „XSD-Prüfung nicht verfügbar" in der Anwendung | xmllint prüfen (siehe Voraussetzungen), Anwendung neu starten. |

## Optionen des Startskripts

```
python3 scripts/start.py [PORT] [--open | --kein-browser] [--neu-bauen]
```
