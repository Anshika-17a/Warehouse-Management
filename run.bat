@echo off
echo ===================================================================
echo  Starting MongoDB Big Data Analytics Platform (AtlasStream)
echo ===================================================================

echo [1/2] Starting FastAPI Backend on port 8000...
start "AtlasStream Backend" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Frontend on port 3000...
start "AtlasStream Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo - Frontend:  http://localhost:3000
echo - Backend:   http://127.0.0.1:8000
echo - API Docs:  http://127.0.0.1:8000/docs
echo ===================================================================
