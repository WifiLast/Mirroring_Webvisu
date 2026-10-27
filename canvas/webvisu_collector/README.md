# WebVisu-Collector RLT010113

Übergangslösung bis zum nächsten Wartungsfenster: Der OPC-UA-Server der SPS **RLT010113
(182.1.1.54)** hängt. `webvisu_client.py` liest die Werte stattdessen aus der **WebVisu** der SPS und
stellt sie unter den bisherigen Metriknamen für Prometheus bereit. Die Grafana-Dashboards bleiben
unverändert.

```
SPS (WebVisu, Port 80) --HTTP--> Edge headless + webvisu_client.py --8023--> Prometheus --> Grafana
                                 |------------------- Heaven -------------------|
```

- Auf Heaven nötig: **Python ≥ 3.8** (nur Standardbibliothek, kein `pip`) und **Edge** (oder Chrome).
- Keine Änderung an der SPS, kein Download, OPC UA wird nicht benutzt.
- Nur lesend: Die einzigen Eingaben sind Klicks auf Navigationsbuttons (Startseite, Setup,
  Temp/Feuchte/Druck, Blättern). Laut Projekt schalten diese nur die Seite um und schreiben keine Variable.
- Schonend (SPS-CPU ~90 %): eine WebVisu-Sitzung, im Normalbetrieb **eine Anfrage alle 5 s**.

## Dateien

| Datei | Zweck |
|---|---|
| `einstellungen.json` | **Standortwerte: hier eintragen** (SPS-Adresse, Ports, Prometheus, Python, Login-Datei) |
| `RLT_login.json` | **Zugangsdaten** für die Anmeldung an der Visu (`username`, `password`); steht in `.gitignore`, nicht einchecken |
| `pruefung_heaven.ps1` | Gesamtprüfung mit diesen Einstellungen, inkl. Lesen aller Werte; grün = Start möglich |
| `webvisu_client.py` | der Collector |
| `webvisu_clients.json` | Werte, Seiten, Klickpfade RLT010113 (aus dem ART_TOOL-Projekt erzeugt, nicht ändern) |
| `start_webvisu_client.bat` | Start von Hand: `--check`, `--debug`, `--discover` |
| `run_webvisu_service.bat` | Dauerbetrieb über die Aufgabenplanung |
| `webvisu_zuordnung_ART.csv` | Zuordnung Metrik → SPS-Variable → Visu-Element (Nachweis) |
| `beispiele\webvisu_clients.pfc017.json` | Formatbeispiel (Position + Beschriftung) für die frühere Test-Visu von 192.168.0.17; passt nicht zum ART-Projekt |

Der ganze Ordner ist das Paket für Heaven (als ZIP: `..\webvisu_collector.zip`). Quellen der Zuordnung
(CODESYS-Projekt, Variablenliste, Dashboards) liegen in `..\grundlagen\`.

## Inbetriebnahme auf Heaven

1. `webvisu_collector.zip` auf Heaven entpacken, sodass `C:\webvisu_collector\webvisu_client.py` entsteht.
2. **`einstellungen.json` ausfüllen** (Pfade mit `/` schreiben, z. B. `C:/Python312/python.exe`):

   | Eintrag | Bedeutung | vorbelegt |
   |---|---|---|
   | `sps_webvisu_url` | WebVisu der SPS | `http://182.1.1.54/webvisu/webvisu.htm` |
   | `collector_port` | Port, auf dem Prometheus die Werte abholt | `8023` |
   | `prometheus_host`, `prometheus_port` | Prometheus auf/für Heaven (nur für die Prüfung) | `localhost`, `9090` |
   | `python` | Python ≥ 3.8 (Name im PATH oder voller Pfad) | `python` |
   | `login_datei` | Datei mit den Zugangsdaten für die Anmeldung an der Visu (leer oder Eintrag löschen = ohne Login) | `RLT_login.json` |

3. **Gesamtprüfung** (nur lesend, ~5 min):
   ```
   powershell -ExecutionPolicy Bypass -File .\pruefung_heaven.ps1
   ```
   Prüft mit diesen Einstellungen: Python, Edge und Edge-Richtlinien, Verbindung zur SPS (Port,
   Proxy, WebVisu-Seite), Collector-Port, laufendes `opc_client.py`, Prometheus (Erreichbarkeit,
   passendes Scrape-Ziel mit fertigem YAML-Block, wer heute `ART_*` liefert, welche `ART_*`-Metriken es
   in den letzten 30 Tagen gab und welche davon der Collector nicht liefert) und zum Schluss den
   **Funktionstest**: eine Sitzung wie im Betrieb, Startseite und alle fünf Setup-Seiten, alle 33 Werte.
4. **`ERGEBNIS: ALLES GRUEN` → starten** (Abschnitte Prometheus und Dauerbetrieb). Bei Warnungen jede
   lesen und bewusst entscheiden; bei FEHLER **nicht** starten.

Einzelne Seiten genauer ansehen (Screenshot und alle Texte in `discover_…\discover.html`):
`start_webvisu_client.bat --discover RLT010113` bzw. `… --discover RLT010113 --page Setup_TT2`.
Scheitert der Funktionstest, hat die SPS meist einen anderen Projektstand als das ART_TOOL-Projekt.

## Prometheus

Den fertigen YAML-Block mit dem passenden Ziel gibt `pruefung_heaven.ps1` aus: derselbe Host wie
beim bestehenden Job für `opc_client.py` (Port 8020), Port aus `collector_port`. Läuft Prometheus in
Docker, ist `localhost` der Container; dann `host.docker.internal` oder die IP von Heaven (Firewall:
eingehend 8023).

```yaml
  - job_name: webvisu_collector
    scrape_interval: 15s
    static_configs:
      - targets: ["localhost:8023"]
```

**Doppelte Metriken vermeiden:**
1. Vorher prüfen, wer die ART-Metriken heute liefert: `count by (job, instance) ({__name__=~"ART_.*"})`.
   Liefert sie noch eine andere Quelle als `opc_client.py`, dort RLT010113 abschalten.
2. RLT010113 aus `clients.json` entfernen **und `opc_client.py` neu starten** (es behält angelegte
   Werte bis zum Neustart; der eingefrorene Wert erschiene sonst als zweite Linie).

## Dauerbetrieb

`run_webvisu_service.bat` startet den Collector und 60 s nach einem Ende neu; Warnungen landen in
`webvisu_client.log`. Python-Pfad und Port kommen aus `einstellungen.json`; ist `python` für das Konto
der Aufgabe nicht im PATH, dort den vollen Pfad eintragen. Aufgabenplanung:

- Trigger „Beim Start“; Aktion `C:\webvisu_collector\run_webvisu_service.bat`, „Starten in“
  `C:\webvisu_collector`
- „Unabhängig von der Benutzeranmeldung ausführen“, normales Benutzerkonto (nicht SYSTEM)
- „Aufgabe beenden, falls sie länger läuft als“: **deaktivieren**
- Aufgabe von Hand starten, nach 1–2 min `pruefung_heaven.ps1 -OhneSeitentest` erneut laufen lassen:
  Es zeigt den laufenden Collector (`webvisu_collector_up … 1.0`) und, sobald der Scrape-Job eingetragen
  ist, ob Prometheus ihn erreicht (`up`) und ob nur noch eine Quelle `ART_*` liefert. Steht im Log „Browser hat den DevTools-Port
  nicht geoeffnet“, startet Edge ohne Anmeldung nicht: dann „Nur ausführen, wenn der Benutzer
  angemeldet ist“ und das Konto angemeldet lassen (getrennte RDP-Sitzung genügt).

Abschalten im Wartungsfenster: Aufgabe beenden und deaktivieren, Scrape-Job entfernen, RLT010113
wieder in `clients.json`, `opc_client.py` neu starten.

## Was gelesen wird

33 Werte mit den bisherigen Namen (33 der 36 Metriken des Dashboards „RLT 010113 RR ART-Tool“):

| Seite | Werte | Klickpfad | Häufigkeit |
|---|---|---|---|
| `RLT_main` (Startseite) | TT001, TT004, TT004_SOLL, TT008, RH004, RH004_SOLL, PT005, PT005_SOLL, RV001, MV002, DBF-Sollwert, RV1-Sollwert | – | laufend, ~alle 5 s |
| `Setup_TT2` | TT004 H/HH/L/LL | Setup → Temp → `I<` → `>` | alle 30 min |
| `Setup_TT4` | TT008 H/HH, `ART_test_paramTT_TI_TT8_L`/`_LL` | Setup → Temp → `>I` | alle 30 min |
| `Setup_RH2` | RH004 H/HH/L/LL | Setup → Feuchte → `I<` → `>` | alle 30 min |
| `Setup_PT2` | PT002 und H/HH/L/LL | Setup → Druck → `I<` → `>` | alle 30 min |
| `Setup_PT5` | PT005 H/HH/L/LL | Setup → Druck → `I<` → `>`×4 | alle 30 min |

Grenzwerte werden bis zum nächsten Besuch weiter gemeldet (höchstens 75 min).

**Nicht lesbar:**

| Metrik | Grund |
|---|---|
| `ART_mv_paramMV_MV_RKL2_SOLL`, `ART_rAQ_DBF001` (+ `_010115`/`_010305`) | in keiner Visu angezeigt |
| `ART_CMD_MAN_IST` | nur auf der FFU-Seite, Button braucht Login |
| alle Metriken von RLT 010115, 010203, 010305 | Wechsel dorthin („Select“) ohne Login nur sichtbar, nicht bedienbar |
| `ASN_*` | andere SPS |

Mit Login (Abschnitt „Anmeldung“) werden die Seiten bedienbar, hinter denen heute „Select“ und `ART_CMD_MAN_IST`
stehen. Welche Seiten und Metriken sich damit zusätzlich lesen lassen, ist noch nicht untersucht und nicht in
`webvisu_clients.json` eingetragen.

## Anmeldung (Login)

Ohne Anmeldung zeigt die Visu „Zum Bedienen bitte einloggen!“ und reagiert nicht auf Select/Alarme. Mit
`login_datei` in `einstellungen.json` meldet sich der Collector nach **jedem Laden der Visu** an (nach einem Neuladen ist die
Sitzung der SPS neu und nicht mehr angemeldet):

1. In `RLT_login.json` `username` und `password` eintragen (am besten ein Konto **nur mit Leserechten**: eine angemeldete
   Sitzung kann die Anlage bedienen; der Collector klickt aber weiterhin nur die konfigurierten Seitenwechsel).
2. Prüfen, ohne den Dauerbetrieb: `start_webvisu_client.bat --login-test` (meldet nur an, speichert `login_ergebnis.png`,
   Exit-Code 0, wenn der Dialog schließt). `--check` und `--discover` melden sich ebenfalls an.

Ablauf wie von Hand: Knopf „Login“, im Dialog das Feld „User name“ anklicken, den Namen mit der **Bildschirmtastatur der
Visu** eingeben (die Visu nimmt keine Tastaturereignisse an; die Tasten sind Texte auf den Canvases `cdsCanvas_2_<id>`, ein
Zeichen auf der anderen Ebene wird nach „Shift“ gesucht), mit deren `OK` bestätigen, ebenso das Passwort, dann `Ok` im
Dialog. **Nach jedem Klick 1 s Pause** (die SPS arbeitet die Klicks einzeln ab, sonst gehen Eingaben verloren). Danach 20 s
warten und die Seite neu zeichnen lassen (Fenstergröße kurz ändern).

- **Erfolg heißt: der Dialog schließt sich.** Die Visu zeigt weder ein falsches Passwort noch sofort den Zustand an;
  ob die SPS die Anmeldung angenommen hat, lässt sich aus der Anzeige nicht sicher ablesen (Kopfzeile und Login-Symbol
  können hinterherhinken). Zugangsdaten und Benutzer in der SPS müssen stimmen.
- **Schutz vor Sperren:** Scheitert die Anmeldung (Dialog öffnet sich nicht, Tastatur schließt sich nicht, Dialog bleibt offen),
  läuft der Collector ohne sie weiter; nach 2 Fehlversuchen hintereinander wird nicht mehr versucht (Warnung im Log), bis er neu
  gestartet wird. Passwort und Benutzername werden nie ausgegeben oder protokolliert (Fehlermeldungen nennen kein Zeichen).
- Während der Anmeldung (rund 1 – 2 min, die SPS ist langsam) werden keine Werte gemeldet (`up = 0`).
- **Die Anmeldung bleibt in der SPS stehen und gilt für alle Clients.** Eine neue Browser-Sitzung (leeres Profil) startet auf der
  Test-SPS schon mit „Logout“ und „geloggt als: …“. Der Collector erkennt das („Logout“ sichtbar) und überspringt den Dialog,
  meldet sich aber auch nie ab. Heißt: Nach dem ersten Login sind alle Clients, auch ein echtes Bedienpanel, als dieser Benutzer
  angemeldet, bis jemand „Logout“ drückt oder die SPS (Zeitlimit?) abmeldet. Darum ein Konto mit möglichst geringen Rechten nehmen.
- Das Symbol links oben zeigt „Login“ (abgemeldet) bzw. „Logout“ (angemeldet); der Benutzername in der Kopfzeile ist bei kleinem
  Fenster nicht lesbar abgeschnitten. Das ist nur die Anzeige.
- Die Canvas-Ids der Visu sind nicht eindeutig (der `Ok`-Knopf des Dialogs teilt sich die Id mit einem Symbol der
  Seite); darum werden Felder und Knöpfe nach Lage im Dialog gefunden, Tasten über den Canvas-Namen der Tastatur.
- Beim Packen als ZIP für Heaven `RLT_login.json` bewusst mitnehmen oder dort neu anlegen (sie steht nicht im Git).

Getestet an der Test-SPS 192.168.0.17: kompletter Ablauf bis zum Schließen des Dialogs (Exit-Code 0). Dort ist der Benutzer
falsch eingerichtet, die Annahme der Anmeldung ließ sich deshalb nicht prüfen; das ist auf RLT010113 noch zu tun.

## Wie die Werte zugeordnet und abgesichert sind

Die WebVisu überträgt keine Variablennamen, nur Zeichenbefehle („Text `21.500` an x/y“). Die Zuordnung
stammt aus dem CODESYS-Projekt `..\grundlagen\ART_TOOL_RLT_IBN1_SCH_ABR.project`:

1. Metrik → Variable: `ART_rAI_TT004` = `GVL_OPC.rAI_TT004`, in `CALL_OPC` befüllt aus
   `GVL_GENERAL.TI_TT4_IST`; `ART_mv_`/`ART_dbf_`/`ART_test_` direkt aus `GVL_PERSISTENT.param…`.
2. Variable → Visu-Element mit Position und Größe. Gegenprobe mit `..\grundlagen\RLT_main_Visu_Variablen.csv`: alle
   155 Textvariablen stimmen überein.
3. Zur Laufzeit werden die Projekt-Koordinaten über je 5 feste Beschriftungen der Seite (`anchors`)
   auf Bildschirm-Pixel umgerechnet.

Ein Wert wird nur gemeldet, wenn die richtige Seite offen ist, alle 5 Beschriftungen genau einmal da
sind und auf 8 px zur Umrechnung passen, im Element ein reiner Zahlentext steht (eine Beschriftung wie
„TT004 - …“ wird nie als Zahl gelesen) und Beschriftung und Wert **nach** dem letzten Seitenwechsel bzw.
dem letzten WebVisu-Fehler gezeichnet wurden.

Im Projekt geprüft: Start-Visu `RLT010113_ART`, Client-Größe 1280×1024, Sprache `de` (Übersetzungen nur
für Alarmtexte), bis 100 Clients; keine Unsichtbarkeits-Bedingung an Werten oder Kalibrierpunkten;
kein fremder Text in Wert-Elementen; Klickziele eindeutig; Ruhebildschirm wird nie aktiv.

## Last und Störungsverhalten

| Zustand | Anfragen an die SPS |
|---|---|
| normaler Browser (Vergleich) | ~5 pro s |
| Normalbetrieb (`poll_delay_ms: 5000`) | 1 alle ~5 s |
| Laden, Seitenbesuch (`nav_delay_ms: 1000`) | ~1 pro s, nur für die Dauer (Laden < 30 s, Besuch ~10–40 s) |
| Störung | 1 alle ~5 s |

| Störung | Verhalten |
|---|---|
| kurzer Aussetzer | letzte Werte bis 15 s weiter gemeldet |
| SPS antwortet nicht / WebVisu-Fehler | nach ~10 s `up = 0`, nach 15 s keine Werte (Lücke statt eingefrorener Werte); WebVisu startet sich selbst neu |
| Startseite > 2 min nicht lesbar | Neuladen; Wiederholung nach 4, 8, 16, 30 … min |
| Seitenbesuch scheitert | übrige Werte unberührt, neuer Versuch nach 5 min |
| Browser hängt/abgestürzt | Neustart nach 10 s, verdoppelt bis 5 min; zusätzlich täglich |
| Collector beendet (auch Taskkill) | Edge wird mitbeendet, WebVisu-Sitzung frei |

Zustandsmetriken (Label `controller`): `webvisu_collector_up`, `_values` (Soll 33),
`_configured_values`, `_last_response_timestamp_seconds`, `_plc_requests_since_load`,
`_visu_errors_since_load`, `_texts_on_page`.

## Konfiguration `webvisu_clients.json`

| Feld | Bedeutung |
|---|---|
| `name`, `url` | Name (Label `controller`) und WebVisu-URL |
| `viewport` | Fenstergröße, Standard `[1280, 1024]` |
| `read_interval` | wie oft der Browser ausgelesen wird (s), keine Last an der SPS |
| `poll_delay_ms` / `nav_delay_ms` | Pause vor jeder Anfrage an die SPS im Normalbetrieb / beim Laden und bei Seitenbesuchen |
| `expect_text` | Texte, die auf der Startseite stehen müssen |
| `anchors` | feste Beschriftungen `{"text", "x", "y", "align"}` mit Projekt-Koordinaten (`align` = Textausrichtung) |
| `metrics[]` | `gauge_name` + `rect` `[x, y, Breite, Höhe]` des Visu-Elements im Projekt |
| `home_clicks` | Rückweg zur Startseite; klappt er nicht, wird neu geladen |
| `pages[]` | weitere Seiten: `name`, `clicks`, `every` (s), `settle` (max. Wartezeit s), `expect_text`, `anchors`, `metrics` |

Klicks: `{"text": "Setup", "then": "Temp"}` (Text muss eindeutig sein, sonst `"index": n`; bis 30 s
Warten auf das Ziel) oder `[x, y]`. `then` ist der Text, der nach dem Klick erscheinen muss, bevor der
nächste Klick folgt (z. B. `"Seite 2/4"` nach `>`). Wichtig, weil die Unterseiten ihre Blätter-Buttons
an derselben Stelle haben: Ohne Warten landet ein Klick sonst noch in der vorigen Ansicht. Felder mit `_` sind Notizen. Für andere SPS ohne Projekt gibt es Metriken über
Bildschirmposition plus Beschriftung (`{"gauge_name", "x", "y", "label"}`, Positionen aus
`--discover`), siehe `beispiele\webvisu_clients.pfc017.json`. Optional: `map` (`{"EIN": 1, "AUS": 0}`), `scale`,
`offset`, `tolerance`, `browser` (Pfad zu Edge/Chrome).

## Grenzen

- Edge-Richtlinien `HeadlessModeEnabled = 0` oder `RemoteDebuggingAllowed = 0` verhindern den Start
  („Browser hat den DevTools-Port nicht geoeffnet“) → Chrome (`browser`) oder Richtlinie freigeben.
- Gelesen wird nur, was die Visu anzeigt, mit der angezeigten Genauigkeit (2–3 Nachkommastellen).

## Getestet (Test-SPS 192.168.0.17)

**Mit dem echten Projekt** (ART_TOOL auf die Test-SPS geladen, Konfiguration wie für Heaven, nur die
URL auf 192.168.0.17):
- Startseite und alle fünf Setup-Seiten: Seite erkannt, Kalibrierung ok, 33 von 33 Werten gefunden.
- Abgleich mit OPC UA (Quellvariablen und `GVL_OPC`): 33 von 33 Werten stimmen.
- Gefunden und behoben dabei: Blätter-Klicks landeten zu früh in der vorigen Unterseite (jetzt `then`).
- Dauerbetrieb 12 min: alle 5 Setup-Seiten besucht, danach 33/33 Werte, 0 Warnungen.
- `pruefung_heaven.ps1` mit `einstellungen.json` auf die Testumgebung (SPS 192.168.0.17, Prometheus
  192.168.0.24:9092): alle Prüfungen und der Funktionstest (33/33) durchgelaufen.

Mit der früheren Test-Visu:
- Abgleich mit OPC UA über den OPC MCP: 154 von 154 Wertänderungen stimmten.
- Kalibrierung mit künstlich umgerechneten Projekt-Koordinaten exakt wiedergefunden.
- Drosselung 5000/1000 ms: Sitzung stabil, Seitenbesuche vollständig in 11 s.
- Störungen: Verbindung 25 s blockiert, WebVisu-Fehler ohne Neuzeichnen, fehlende Klickziele,
  Browser-Absturz, SPS nicht erreichbar, Collector hart beendet, Port doppelt belegt.
- Dauerläufe 16 + 10 + 7 min, Speicher stabil (Edge ~535 MB, Python ~32 MB).

**Nicht getestet:** die SPS RLT010113 selbst (anderer Projektstand möglich → Inbetriebnahme
Schritte 3–5), Start über die Aufgabenplanung ohne Anmeldung, Scrapen durch das Prometheus auf Heaven.
