# Gesamtpruefung vor dem Start des WebVisu-Collectors. Nur lesend, aendert nichts.
# Alle Standortwerte (SPS-Adresse, Ports, Prometheus, Python) kommen aus einstellungen.json.
#
# Aufruf im Ordner des Collectors:
#   powershell -ExecutionPolicy Bypass -File .\pruefung_heaven.ps1
#   powershell -ExecutionPolicy Bypass -File .\pruefung_heaven.ps1 -OhneSeitentest   (ohne den ~5-min-Funktionstest)
#
# Ergebnis "ALLES GRUEN" = alle Voraussetzungen erfuellt und alle Werte aus der WebVisu gelesen.

param(
    [switch]$OhneSeitentest
)

$ErrorActionPreference = "Continue"
$script:fehler = 0
$script:warnungen = 0
function Ok($text)   { Write-Host "  OK       $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  WARNUNG  $text" -ForegroundColor Yellow; $script:warnungen++ }
function Fail($text) { Write-Host "  FEHLER   $text" -ForegroundColor Red; $script:fehler++ }
function Info($text) { Write-Host "           $text" }
function Titel($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function TcpOffen($ziel, $port) {
    $c = New-Object Net.Sockets.TcpClient
    try { $v = $c.BeginConnect($ziel, $port, $null, $null); return ($v.AsyncWaitHandle.WaitOne(3000) -and $c.Connected) }
    catch { return $false } finally { $c.Close() }
}

$ordner = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ordner
[Environment]::CurrentDirectory = $ordner

# --- Einstellungen ---------------------------------------------------------------------------
Titel "Einstellungen (einstellungen.json)"
try {
    $e = Get-Content (Join-Path $ordner "einstellungen.json") -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Fail "einstellungen.json fehlt oder ist kein gueltiges JSON: $_"
    Info "Haeufigste Ursache: Windows-Pfad mit einfachem \ . Pfade mit / oder \\ schreiben, z. B. C:/Python312/python.exe"
    Write-Host ""; Write-Host "Abbruch." -ForegroundColor Red; exit 1
}
foreach ($k in "sps_webvisu_url", "collector_port", "prometheus_host", "prometheus_port", "python") {
    if ($null -eq $e.$k -or "$($e.$k)" -eq "") { Fail "Eintrag '$k' fehlt" }
}
$spsUrl = "$($e.sps_webvisu_url)"
$port = [int]$e.collector_port
$promUrl = "http://$($e.prometheus_host):$($e.prometheus_port)"
Info "SPS-WebVisu:     $spsUrl"
Info "Collector-Port:  $port"
Info "Prometheus:      $promUrl"
Info "Python:          $($e.python)"
# Anmeldung an der Visu (optional): nur pruefen, ob die Datei da und ausgefuellt ist; Werte werden nie ausgegeben
if ("$($e.login_datei)" -ne "") {
    $loginPfad = if ([IO.Path]::IsPathRooted("$($e.login_datei)")) { "$($e.login_datei)" } else { Join-Path $ordner "$($e.login_datei)" }
    try {
        $l = Get-Content $loginPfad -Raw -Encoding UTF8 | ConvertFrom-Json
        if ("$($l.username)" -eq "") { Fail "Login-Datei $($e.login_datei): username ist leer (Zugangsdaten eintragen)" }
        elseif ("$($l.password)" -eq "") { Warn "Login-Datei $($e.login_datei): password ist leer" }
        else { Ok "Anmeldung an der Visu: $($e.login_datei), Benutzername und Passwort eingetragen" }
        Info "Anmeldung nach jedem Laden der Visu (der Funktionstest unten meldet sich ebenfalls an)"
    } catch {
        Fail "Login-Datei $($e.login_datei) fehlt oder ist kein gueltiges JSON: $_"
    }
} else {
    Info "Anmeldung an der Visu: aus (login_datei in einstellungen.json ist leer)"
}
try {
    $cfg = Get-Content (Join-Path $ordner "webvisu_clients.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    $namen = @()
    foreach ($c in @($cfg)) {
        $namen += @($c.metrics | ForEach-Object { $_.gauge_name }) + @($c.pages | ForEach-Object { $_.metrics } | ForEach-Object { $_.gauge_name })
    }
    $sitzungen = (@($cfg | ForEach-Object { $_.name }) -join ", ")
    Ok "webvisu_clients.json: $(@($cfg).Count) Sitzungen ($sitzungen), $($namen.Count) Werte, $(@($cfg | ForEach-Object { $_.pages }).Count) Zusatzseiten"
} catch {
    Fail "webvisu_clients.json nicht lesbar: $_"
    $namen = @()
}

# --- Python ----------------------------------------------------------------------------------
Titel "Python"
$py = Get-Command "$($e.python)" -ErrorAction SilentlyContinue
if ($null -eq $py) {
    Fail "'$($e.python)' nicht gefunden. In einstellungen.json bei 'python' den vollen Pfad eintragen."
} else {
    $version = (& $py.Source -c "import sys; print('%d.%d.%d' % sys.version_info[:3])") 2>$null
    $t = "$version".Split(".")
    if ($t.Count -ge 2 -and ([int]$t[0] -gt 3 -or ([int]$t[0] -eq 3 -and [int]$t[1] -ge 8))) {
        Ok "Python $version ($($py.Source))"
    } else {
        Fail "Python '$version' zu alt oder nicht startbar ($($py.Source)); noetig ist 3.8 oder neuer"
    }
    if ($py.Source -like "*WindowsApps*") { Warn "Das ist nur der Microsoft-Store-Platzhalter; echten Pfad in einstellungen.json eintragen." }
    Info "Laeuft die Aufgabe spaeter unter einem anderen Konto, braucht dieses denselben Python-Pfad."
}

# --- Browser ---------------------------------------------------------------------------------
Titel "Browser"
$kandidaten = @()
if ($cfg -and $cfg[0].browser) { $kandidaten += $cfg[0].browser }
$kandidaten += "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
               "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
               "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
               "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
$browser = $kandidaten | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($browser) { Ok "$browser ($((Get-Item $browser).VersionInfo.ProductVersion))" }
else { Fail "Weder Edge noch Chrome gefunden; Pfad als `"browser`" in webvisu_clients.json eintragen." }
$gesperrt = $false
foreach ($s in "HKLM:\SOFTWARE\Policies\Microsoft\Edge", "HKCU:\SOFTWARE\Policies\Microsoft\Edge",
               "HKLM:\SOFTWARE\Policies\Google\Chrome", "HKCU:\SOFTWARE\Policies\Google\Chrome") {
    $p = Get-ItemProperty $s -ErrorAction SilentlyContinue
    if ($null -eq $p) { continue }
    if ($p.HeadlessModeEnabled -eq 0) { Fail "Richtlinie HeadlessModeEnabled=0 ($s)"; $gesperrt = $true }
    if ($p.RemoteDebuggingAllowed -eq 0) { Fail "Richtlinie RemoteDebuggingAllowed=0 ($s)"; $gesperrt = $true }
}
if (-not $gesperrt) { Ok "keine sperrenden Browser-Richtlinien" }

# --- SPS ---------------------------------------------------------------------------------------
Titel "SPS / WebVisu"
$uri = $null
try { $uri = [Uri]$spsUrl } catch { Fail "sps_webvisu_url ist keine gueltige Adresse: $spsUrl" }
if ($uri) {
    if (TcpOffen $uri.Host $uri.Port) { Ok "TCP $($uri.Host):$($uri.Port) erreichbar" }
    else {
        Fail "TCP $($uri.Host):$($uri.Port) nicht erreichbar (Netz/Firewall)"
        foreach ($p in 4840, 80, 443, 8080) { if ($p -ne $uri.Port) { Info ("Vergleich Port {0}: {1}" -f $p, $(if (TcpOffen $uri.Host $p) { "offen" } else { "zu" })) } }
    }
    $proxy = [Net.WebRequest]::GetSystemWebProxy().GetProxy($uri)
    if ($proxy.AbsoluteUri -ne $uri.AbsoluteUri) { Warn "Proxy fuer $($uri.Host) eingestellt ($proxy); die SPS muss in den Proxy-Ausnahmen stehen" }
    else { Ok "kein Proxy fuer $($uri.Host)" }
    try {
        $a = Invoke-WebRequest -UseBasicParsing -Uri $spsUrl -TimeoutSec 15
        if ($a.StatusCode -eq 200 -and $a.Content -match "webvisu\.js") { Ok "WebVisu-Seite geladen" }
        else { Fail "Antwort ist keine WebVisu-Seite (HTTP $($a.StatusCode))" }
        $js = Invoke-WebRequest -UseBasicParsing -Uri ($spsUrl -replace "webvisu\.htm$", "webvisu.js") -TimeoutSec 15
        Ok ("webvisu.js geladen ({0:N0} Bytes)" -f $js.RawContentLength)
    } catch { Fail "WebVisu nicht abrufbar: $($_.Exception.Message)" }
}

# --- Collector-Port --------------------------------------------------------------------------
Titel "Collector-Port $port"
$laeuft = $false
$belegt = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($null -eq $belegt) { Ok "Port $port ist frei" }
else {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$(@($belegt)[0].OwningProcess)"
    if ($proc.CommandLine -like "*webvisu_client.py*") {
        $laeuft = $true
        Ok "Collector laeuft bereits (PID $($proc.ProcessId))"
        try {
            $m = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/metrics" -TimeoutSec 5).Content -split "`n"
            Info (($m | Where-Object { $_ -like "webvisu_collector_up*" -or $_ -like "webvisu_collector_values*" }) -join "   ")
        } catch { Warn "Collector antwortet nicht auf /metrics" }
    } else { Fail "Port $port belegt durch $($proc.Name): $($proc.CommandLine) -> collector_port aendern" }
}

# --- opc_client.py ---------------------------------------------------------------------------
Titel "Bestehender OPC-UA-Collector (opc_client.py)"
$opc = Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -like "*opc_client*" }
if ($opc) {
    foreach ($o in $opc) { Info "laeuft: PID $($o.ProcessId)  $($o.CommandLine)" }
    Info "Beim Start: RLT010113 aus seiner clients.json entfernen und ihn neu starten."
} else { Info "kein laufendes opc_client.py gefunden (ggf. als Dienst unter anderem Namen)" }

# --- Prometheus ------------------------------------------------------------------------------
Titel "Prometheus ($promUrl)"
try {
    $b = Invoke-RestMethod "$promUrl/api/v1/status/buildinfo" -TimeoutSec 10
    Ok "Prometheus $($b.data.version) erreichbar"
    $ziele = (Invoke-RestMethod "$promUrl/api/v1/targets" -TimeoutSec 10).data.activeTargets
    $ziel = "localhost:$port"
    $alt = @($ziele | Where-Object { $_.scrapeUrl -match ":8020/" })
    if ($alt.Count -gt 0) {
        foreach ($z in $alt) { Info "bestehender Job $($z.labels.job) -> $($z.scrapeUrl) ($($z.health))" }
        $ziel = "$(([Uri]$alt[0].scrapeUrl).Host):$port"
    } else { Warn "kein Job fuer Port 8020 gefunden; Ziel '$ziel' angenommen (Prometheus in Docker? dann Heaven-IP)" }
    $neu = @($ziele | Where-Object { $_.scrapeUrl -match ":$port/" })
    if ($neu.Count -gt 0) {
        foreach ($z in $neu) {
            if ($z.health -eq "up") { Ok "Job $($z.labels.job) scrapt $($z.scrapeUrl): up" }
            elseif ($laeuft) { Fail "Job $($z.labels.job) scrapt $($z.scrapeUrl): $($z.health) $($z.lastError)" }
            else { Info "Job $($z.labels.job) fuer $($z.scrapeUrl) eingetragen ($($z.health), Collector laeuft noch nicht)" }
        }
    } else {
        Info "Beim Start in prometheus.yml ergaenzen und Prometheus neu laden:"
        Info "  - job_name: webvisu_collector"
        Info "    scrape_interval: 15s"
        Info "    static_configs:"
        Info "      - targets: [`"$ziel`"]"
    }
    # Wer liefert heute ART_*?
    $q = [Uri]::EscapeDataString('count by (job, instance) ({__name__=~"ART_.*"})')
    $quellen = @((Invoke-RestMethod "$promUrl/api/v1/query?query=$q" -TimeoutSec 30).data.result)
    if ($quellen.Count -gt 0) {
        foreach ($r in $quellen) { Info ("liefert ART_* jetzt: job={0} instance={1} ({2} Metriken)" -f $r.metric.job, $r.metric.instance, $r.value[1]) }
        if ($quellen.Count -gt 1) { Warn "mehrere Quellen fuer ART_*; nach der Umstellung darf nur webvisu_collector uebrig bleiben" }
    } else { Info "derzeit liefert niemand ART_*-Metriken" }
    # Welche ART_*-Metriken gab es in den letzten 30 Tagen, und liefert der Collector sie?
    $q = [Uri]::EscapeDataString('group by (__name__) (last_over_time({__name__=~"ART_.*"}[30d]))')
    $hist = @((Invoke-RestMethod "$promUrl/api/v1/query?query=$q" -TimeoutSec 120).data.result | ForEach-Object { $_.metric.__name__ }) | Sort-Object
    if ($hist.Count -gt 0) {
        $fehlend = @($hist | Where-Object { $namen -notcontains $_ })
        $eigen = @($fehlend | Where-Object { $_ -notmatch "_010115|_010203|_010305" })
        Info "$($hist.Count) ART_*-Metriken in den letzten 30 Tagen, davon liefert der Collector $($hist.Count - $fehlend.Count)."
        if ($eigen.Count -gt 0) {
            Warn "$($eigen.Count) Metriken von RLT010113 liefert der Collector nicht (nicht in der Visu oder nicht ausgewaehlt):"
            foreach ($n in $eigen) { Info "  $n" }
        }
        $andere = $fehlend.Count - $eigen.Count
        if ($andere -gt 0) { Info "$andere Metriken der RLTs 010115/010203/010305 (nur mit Login in der Visu, nicht lieferbar)" }
    } else { Info "keine ART_*-Metriken in den letzten 30 Tagen gefunden" }
} catch {
    Fail "Prometheus unter $promUrl nicht erreichbar: $($_.Exception.Message) -> prometheus_host/prometheus_port pruefen"
}

# --- Funktionstest -----------------------------------------------------------------------------
Titel "Funktionstest: alle Seiten der WebVisu wie im Betrieb lesen"
if ($OhneSeitentest) {
    Warn "uebersprungen (-OhneSeitentest)"
} elseif ($null -eq $py) {
    Fail "nicht moeglich ohne Python"
} else {
    Info "dauert etwa 3-5 min, belegt kurz einen WebVisu-Client ..."
    & $py.Source webvisu_client.py --check 2>&1 | ForEach-Object { Info "$_" }
    if ($LASTEXITCODE -eq 0) { Ok "alle Werte gelesen" } else { Fail "nicht alle Werte gelesen (Ausgabe oben)" }
}

# --- Ergebnis --------------------------------------------------------------------------------
Write-Host ""
if ($script:fehler -eq 0 -and $script:warnungen -eq 0) {
    Write-Host "ERGEBNIS: ALLES GRUEN - Start moeglich (README, Abschnitte Prometheus und Dauerbetrieb)." -ForegroundColor Green
    exit 0
} elseif ($script:fehler -eq 0) {
    Write-Host "ERGEBNIS: keine Fehler, $($script:warnungen) Warnung(en) - Warnungen lesen und bewusst entscheiden." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "ERGEBNIS: $($script:fehler) Fehler, $($script:warnungen) Warnung(en) - NICHT starten, erst beheben." -ForegroundColor Red
    exit 1
}
