# Powershell script to run the SAKHI tiers concurrently on Windows:
# the FastAPI ML service and the Next.js frontend (whose API routes do the orchestration).

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptDir
$mlDir = Join-Path $scriptDir "ml-service"
$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "Cleaning up existing processes on ports 8000, 3000..." -ForegroundColor Yellow
$ports = @(8000, 3000)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($proc) {
        $pidToKill = $proc[0].OwningProcess
        Write-Host "Killing process $pidToKill on port $port"
        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    }
}

# 1. Start FastAPI ML Service
Write-Host "Starting FastAPI ML Service on port 8000..." -ForegroundColor Green
$mlJob = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$mlDir'; & .\.venv\Scripts\Activate.ps1; python -m uvicorn main:app --host 127.0.0.1 --port 8000" -PassThru -WindowStyle Minimized

# 2. Start Next.js Frontend
Write-Host "Starting Next.js Frontend..." -ForegroundColor Green
$frontendJob = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm run dev" -PassThru -WindowStyle Minimized

Write-Host "All tiers started. FastAPI is on port 8000, Next.js is on 3000." -ForegroundColor Cyan
Write-Host "You can close the spawned minimized PowerShell windows to terminate the apps." -ForegroundColor Cyan
