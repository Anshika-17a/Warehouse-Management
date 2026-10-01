# PowerShell launcher for AtlasStream Platform
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " Starting MongoDB Big Data Analytics Platform (AtlasStream)" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan

# 1. Start Backend in separate window
Write-Host "`n[1/2] Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

# 2. Start Frontend in separate window
Write-Host "[2/2] Starting Next.js Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nAll services launched successfully!" -ForegroundColor Green
Write-Host "  Frontend Dashboard : http://localhost:3000" -ForegroundColor White
Write-Host "  FastAPI Swagger UI : http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  Backend Health     : http://127.0.0.1:8000/health" -ForegroundColor White
Write-Host "===================================================================`n" -ForegroundColor Cyan
