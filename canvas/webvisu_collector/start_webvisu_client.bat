@echo off
rem WebVisu -> Prometheus collector (Ersatz fuer opc_client.py, wenn der OPC-UA-Server der SPS haengt)
rem Einstellungen: einstellungen.json (SPS-Adresse, Port, Python), Werte: webvisu_clients.json
rem Beispiele:  start_webvisu_client.bat --check
rem             start_webvisu_client.bat --debug
rem             start_webvisu_client.bat --discover RLT010113
rem             start_webvisu_client.bat --login-test   (nur anmelden, Screenshot login_ergebnis.png)
cd /d "%~dp0"
set PYTHON=
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "(Get-Content -Raw einstellungen.json | ConvertFrom-Json).python"`) do set "PYTHON=%%p"
if "%PYTHON%"=="" set "PYTHON=python"
"%PYTHON%" webvisu_client.py %*
