# Installs Flight Chaser on Windows and starts it. In PowerShell:
#
#   irm https://raw.githubusercontent.com/rg1989/FlightChaser/main/install.ps1 | iex
#
# It needs Windows 10 (version 1803) or newer, and nothing else. Where Node 24.2 or newer is not installed, a private
# copy goes into the app's folder (from nodejs.org, checked against its published SHA-256). Nothing outside that
# folder is changed. Run again, it updates the app and keeps your settings (.env.local) and your data.
#
#   $env:FLIGHT_CHASER_DIR = '<folder>'   where the app goes (default: FlightChaser in your home folder)
#   $env:FLIGHT_CHASER_START = '0'        install only, do not start
#   $env:FLIGHT_CHASER_SOURCE = '<url or file>'   another .tar.gz of the app (for testing the installer)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue' # downloads are many times faster without the progress bar
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'rg1989/FlightChaser'
$Dir = if ($env:FLIGHT_CHASER_DIR) { $env:FLIGHT_CHASER_DIR } else { Join-Path $HOME 'FlightChaser' }
$Source = if ($env:FLIGHT_CHASER_SOURCE) { $env:FLIGHT_CHASER_SOURCE } else { "https://codeload.github.com/$Repo/tar.gz/refs/heads/main" }

function Say($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
# Whether the Node at $exe runs the app (24.2 or newer).
function Test-Node($exe) {
  try {
    & $exe -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 24 || (a === 24 && b >= 2) ? 0 : 1)' 2>$null
    return $LASTEXITCODE -eq 0
  } catch { return $false }
}
function New-TempFolder {
  $path = Join-Path ([IO.Path]::GetTempPath()) ('flight-chaser-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $path | Out-Null
  return $path
}

if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) { throw 'tar.exe is needed: Windows 10 version 1803 and newer have it' }
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$Dir = (Resolve-Path $Dir).Path

# 1. Node: the one installed, the private copy from an earlier run, or a new private copy.
$installed = Get-Command node.exe -ErrorAction SilentlyContinue
$own = Join-Path $Dir '.node\node.exe'
if ($installed -and (Test-Node $installed.Source)) {
  $nodeDir = Split-Path $installed.Source
} elseif ((Test-Path $own) -and (Test-Node $own)) {
  $nodeDir = Split-Path $own
} else {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  Say "Node 24.2 or newer is not installed: fetching a private copy into $Dir\.node"
  $base = 'https://nodejs.org/dist/latest-v24.x'
  $line = ((Invoke-RestMethod "$base/SHASUMS256.txt") -split "`n") | Where-Object { $_ -match "\snode-v[\d.]+-win-$arch\.zip\s*$" } | Select-Object -First 1
  if (-not $line) { throw "nodejs.org lists no build for win-$arch" }
  $want, $file = $line.Trim() -split '\s+'
  $tmp = New-TempFolder
  try {
    $zip = Join-Path $tmp $file
    Invoke-WebRequest -UseBasicParsing "$base/$file" -OutFile $zip
    if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $want) { throw 'the Node download does not match its published checksum' }
    $nodeDir = Join-Path $Dir '.node'
    if (Test-Path $nodeDir) { Remove-Item -Recurse -Force $nodeDir }
    New-Item -ItemType Directory -Path $nodeDir | Out-Null
    tar.exe -xf $zip -C $nodeDir --strip-components=1
    if ($LASTEXITCODE -ne 0) { throw 'Node could not be unpacked' }
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}
$env:PATH = "$nodeDir;$env:PATH"

# 2. The app: a git checkout is pulled; otherwise the newest files are unpacked over the folder.
if (Test-Path (Join-Path $Dir '.git')) {
  Say "Updating the checkout in $Dir"
  git -C $Dir pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw 'git pull failed' }
} else {
  Say "Fetching Flight Chaser into $Dir"
  $tmp = $null
  $archive = $Source
  if (-not (Test-Path $Source)) {
    $tmp = New-TempFolder
    $archive = Join-Path $tmp 'flight-chaser.tar.gz'
    Invoke-WebRequest -UseBasicParsing $Source -OutFile $archive
  }
  try {
    tar.exe -xzf $archive -C $Dir --strip-components=1
    if ($LASTEXITCODE -ne 0) { throw 'the app could not be unpacked' }
  } finally {
    if ($tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
  }
}
Set-Location $Dir

Say 'Installing its dependencies'
npm.cmd ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }

# 3. The launcher: starts the app with the Node chosen above.
Set-Content -Encoding ASCII -Path 'flight-chaser.cmd' -Value @'
@echo off
rem Starts Flight Chaser (written by install.ps1). Options: --port <n>, --no-open.
cd /d "%~dp0"
if exist ".node\node.exe" set "PATH=%~dp0.node;%PATH%"
node tools/start.ts %*
'@

Say "Flight Chaser is installed in $Dir"
Write-Host "    Start it:   $Dir\flight-chaser.cmd"
Write-Host '    Update it:  run the install command again'
if ($env:FLIGHT_CHASER_START -ne '0') { & .\flight-chaser.cmd }
