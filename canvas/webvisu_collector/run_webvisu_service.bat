@echo off
rem Dauerbetrieb (Aufgabenplanung): startet den Collector neu, falls er sich beendet.
rem Ausgabe (Warnungen/Fehler) nach webvisu_client.log. Python-Pfad: "python" in einstellungen.json.
cd /d "%~dp0"
set PYTHON=
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "(Get-Content -Raw einstellungen.json | ConvertFrom-Json).python"`) do set "PYTHON=%%p"
if "%PYTHON%"=="" set "PYTHON=python"
:loop
echo %date% %time% Start >> webvisu_client.log
"%PYTHON%" webvisu_client.py >> webvisu_client.log 2>&1
echo %date% %time% Ende (Exit-Code %errorlevel%), Neustart in 60 s >> webvisu_client.log
rem ping statt timeout: timeout bricht ohne Konsole (Aufgabenplanung) sofort ab -> Endlosschleife
ping -n 61 127.0.0.1 > nul
goto loop
