$ErrorActionPreference = "Stop"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dataDir = Join-Path $PSScriptRoot "..\.data\postgres"
$log = Join-Path $PSScriptRoot "..\.data\postgres.log"

if (-not (Test-Path (Join-Path $dataDir "PG_VERSION"))) {
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
  & "$pgBin\initdb.exe" -D $dataDir -U fv -A trust --locale=C --encoding=UTF8
}

$status = & "$pgBin\pg_ctl.exe" -D $dataDir status 2>&1
if ($LASTEXITCODE -ne 0) {
  & "$pgBin\pg_ctl.exe" -D $dataDir -l $log -o "-p 5433" start
  Start-Sleep -Seconds 2
}

$dbExists = & "$pgBin\psql.exe" -h localhost -p 5433 -U fv -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='fruits_vegs'"
if ($dbExists -ne "1") {
  & "$pgBin\createdb.exe" -h localhost -p 5433 -U fv fruits_vegs
}

Write-Host "PostgreSQL ready on localhost:5433 (user=fv, db=fruits_vegs)"
