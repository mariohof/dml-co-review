@echo off
rem DMRL Management System - Start per Doppelklick (Windows 11, PROJ-19)
chcp 65001 >nul
cd /d "%~dp0"

set "PYTHON="
where py >nul 2>&1 && set "PYTHON=py -3"
if not defined PYTHON where python >nul 2>&1 && set "PYTHON=python"
if not defined PYTHON (
  echo Python 3 wurde nicht gefunden. Bitte Python 3 installieren und erneut starten.
  echo Download: https://www.python.org/downloads/
  pause
  exit /b 1
)

%PYTHON% scripts\start.py 8877 --open %*
set "STATUS=%ERRORLEVEL%"
if not "%STATUS%"=="0" if not "%STATUS%"=="130" pause
exit /b %STATUS%
