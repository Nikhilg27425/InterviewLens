# Start Development Environment
# This script starts both backend and frontend

Write-Host "🚀 Starting InterviewLens Development Environment" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if backend is already running
Write-Host "Checking if backend is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Backend is already running on port 8000" -ForegroundColor Green
    $backendRunning = $true
} catch {
    Write-Host "Backend is not running, will start it..." -ForegroundColor Gray
    $backendRunning = $false
}

Write-Host ""

# Check if frontend is already running
Write-Host "Checking if frontend is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Frontend is already running on port 5173" -ForegroundColor Green
    $frontendRunning = $true
} catch {
    Write-Host "Frontend is not running, will start it..." -ForegroundColor Gray
    $frontendRunning = $false
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

if ($backendRunning -and $frontendRunning) {
    Write-Host "✅ Both services are already running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

# Start backend if not running
if (-not $backendRunning) {
    Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host '🐍 Backend Server' -ForegroundColor Green; python -m uvicorn app.main:app --reload"
    Write-Host "✓ Backend starting on http://localhost:8000" -ForegroundColor Green
    Start-Sleep -Seconds 3
}

# Start frontend if not running
if (-not $frontendRunning) {
    Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '⚛️ Frontend Server' -ForegroundColor Blue; npm run dev"
    Write-Host "✓ Frontend starting on http://localhost:5173" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "✅ Development Environment Started!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Open your browser:" -ForegroundColor Cyan
Write-Host "   http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "📝 Services:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Gray
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Keep the terminal windows open!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop servers: Close the terminal windows or press Ctrl+C" -ForegroundColor Gray
Write-Host ""
