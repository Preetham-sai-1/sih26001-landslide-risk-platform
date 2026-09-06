# scripts/start_prototype.ps1
# One-command launcher for the SIH 2026 Landslide Risk Platform Prototype

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SIH 2026 — NER LANDSLIDE RISK PLATFORM PROTOTYPE LAUNCHER " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$Root = Resolve-Path "."

Write-Host "`n[1/2] Starting Python FastAPI Backend Server on http://localhost:8000..." -ForegroundColor Green
$BackendProc = Start-Process -FilePath "$Root/ml-service/.venv/Scripts/python.exe" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "$Root/ml-service/src/api" -PassThru

Start-Sleep -Seconds 2

Write-Host "`n[2/2] Starting React Frontend Development Server on http://localhost:5173..." -ForegroundColor Green
$FrontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host" -WorkingDirectory "$Root/frontend/react" -PassThru

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " PROTOTYPE SERVICES RUNNING CLEANLY " -ForegroundColor Green
Write-Host " Frontend URL: http://localhost:5173" -ForegroundColor White
Write-Host " Backend API : http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Press Ctrl+C in this terminal window to stop all services." -ForegroundColor Gray
