# Start local Postgres (docker compose) and prepare the NexGen API database.
# Prerequisites: Docker Desktop installed, running, and `docker` on PATH.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/start-local-db.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Test-Docker {
  try {
    & docker version --format '{{.Server.Version}}' 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
  } catch { return $false }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker is not installed or not on PATH." -ForegroundColor Red
  Write-Host "Install Docker Desktop: https://docs.docker.com/desktop/setup/install/windows-install/"
  Write-Host "Or run: winget install Docker.DockerDesktop"
  exit 1
}

if (-not (Test-Docker)) {
  Write-Host "Docker CLI found but the engine is not running." -ForegroundColor Yellow
  Write-Host "Start Docker Desktop from the Start menu and wait until it says 'Engine running', then run this script again."
  exit 1
}

Write-Host "Starting Postgres (docker compose)..." -ForegroundColor Cyan
& docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Waiting for Postgres to accept connections..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  & docker compose exec -T db pg_isready -U postgres 2>$null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  Write-Host "Postgres did not become ready in time. Check: docker compose logs db" -ForegroundColor Red
  exit 1
}

$backend = Join-Path $root 'backend'
if (-not (Test-Path $backend)) {
  Write-Host "backend folder not found." -ForegroundColor Red
  exit 1
}

Push-Location $backend
try {
  Write-Host "Running Prisma migrate deploy..." -ForegroundColor Cyan
  & npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Seeding database..." -ForegroundColor Cyan
  & npm run db:seed
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Done. Ensure backend/.env has DATABASE_URL for local Docker, e.g.:" -ForegroundColor Green
Write-Host '  postgresql://postgres:postgres@localhost:5432/nexgen?schema=public'
Write-Host "Then: cd backend; npm run dev"
Write-Host ""
