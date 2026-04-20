# start.ps1 — RepWave demo startup helper for Windows
# Run from the repo root: d:\full_repwave\full_repwave\rep.merkwave.com\
# Usage: .\start.ps1 [--fresh]   (--fresh recreates volumes, full clean start)
#
# What it does:
#   1. Ensures Docker Desktop is running
#   2. Creates the shared Docker network if needed
#   3. Starts all containers via docker compose (local override removes external-network requirement)
#   4. Waits for MySQL to become healthy
#   5. Prints the URLs to open

param(
    [switch]$Fresh   # pass --fresh to tear down volumes and rebuild from scratch
)

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RepWave Demo — Starting..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── 1. Check Docker is available ─────────────────────────────────
Write-Host ""
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerOk = $false
for ($i = 0; $i -lt 15; $i++) {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true; break }
    if ($i -eq 0) {
        Write-Host "  Docker not ready — launching Docker Desktop..." -ForegroundColor DarkYellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    }
    Write-Host "  Waiting for Docker ($($i+1)/15)..."
    Start-Sleep -Seconds 5
}
if (-not $dockerOk) {
    Write-Host "  ERROR: Docker did not start in time. Please start Docker Desktop manually." -ForegroundColor Red
    exit 1
}
Write-Host "  Docker is ready." -ForegroundColor Green

# ── 2. Create shared network if missing ──────────────────────────
Write-Host ""
Write-Host "Checking Docker network..." -ForegroundColor Yellow
$netExists = docker network ls --format "{{.Name}}" 2>&1 | Where-Object { $_ -eq "repwave_share_network" }
if (-not $netExists) {
    Write-Host "  Creating repwave_share_network..." -ForegroundColor DarkYellow
    docker network create repwave_share_network | Out-Null
    Write-Host "  Network created." -ForegroundColor Green
}
else {
    Write-Host "  Network already exists." -ForegroundColor Green
}

# ── 3. Start containers ───────────────────────────────────────────
Write-Host ""
Write-Host "Starting containers..." -ForegroundColor Yellow

if ($Fresh) {
    Write-Host "  --fresh flag: removing old volumes..." -ForegroundColor DarkYellow
    docker compose -f docker-compose.yml -f docker-compose.local.yml down -v 2>&1 | Out-Null
}
else {
    docker compose -f docker-compose.yml -f docker-compose.local.yml down 2>&1 | Out-Null
}

docker compose -f docker-compose.yml -f docker-compose.local.yml up -d 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: docker compose failed." -ForegroundColor Red
    exit 1
}

# ── 4. Wait for MySQL healthy ─────────────────────────────────────
Write-Host ""
Write-Host "Waiting for MySQL to become healthy..." -ForegroundColor Yellow
$mysqlReady = $false
for ($i = 0; $i -lt 30; $i++) {
    $health = docker inspect --format "{{.State.Health.Status}}" repwave_share_mysql 2>&1
    if ($health -eq "healthy") { $mysqlReady = $true; break }
    Write-Host "  MySQL status: $health ($($i+1)/30)"
    Start-Sleep -Seconds 3
}
if (-not $mysqlReady) {
    Write-Host "  WARNING: MySQL did not report healthy in 90s. App may not be ready." -ForegroundColor DarkYellow
}
else {
    Write-Host "  MySQL is healthy." -ForegroundColor Green
}

# ── 5. Show status & URLs ─────────────────────────────────────────
Write-Host ""
Write-Host "Container status:" -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.local.yml ps

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RepWave Demo is RUNNING" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nginx gateway:  http://localhost:8082"
Write-Host "  Website:        http://localhost:5173"
Write-Host "  RepWave app:    http://localhost:5174"
Write-Host ""
Write-Host "  Demo admin credentials:"
Write-Host "    Email:    admin@demo.repwave.local"
Write-Host "    Password: DemoPass123"
Write-Host ""
Write-Host "  Run tests:      .\api\clients\demo_company\migrations\test_demo.ps1"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Open in browser
Start-Process "http://localhost:5174"
