@echo off
echo ==========================================================
echo  SIH 2026 -- NER LANDSLIDE RISK PLATFORM PROTOTYPE LAUNCHER
echo ==========================================================

echo [1/2] Starting Python FastAPI Backend on http://localhost:8000...
start "SIH FastAPI Backend" /D "%~dp0..\ml-service\src\api" "%~dp0..\ml-service\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000

timeout /t 2 /nobreak > NUL

echo [2/2] Starting React Frontend on http://localhost:5173...
start "SIH React Frontend" /D "%~dp0..\frontend\react" npm run dev -- --host

echo ==========================================================
echo  PROTOTYPE SERVICES RUNNING CLEANLY
echo  Frontend URL: http://localhost:5173
echo  Backend API : http://localhost:8000/api/v1/health
echo ==========================================================
