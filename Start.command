#!/bin/bash
# DMRL Management System — Start per Doppelklick (macOS, PROJ-19)
cd "$(dirname "$0")" || exit 1

warte() {
  echo
  read -n 1 -s -r -p "Taste drücken, um das Fenster zu schließen …"
  echo
}

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 wurde nicht gefunden. Bitte Python 3 installieren und erneut starten."
  echo "Download: https://www.python.org/downloads/"
  warte
  exit 1
fi

python3 scripts/start.py 8877 --open "$@"
status=$?
if [ $status -ne 0 ] && [ $status -ne 130 ]; then
  warte
fi
exit $status
