# InterviewLens OAuth Setup Script (Windows PowerShell)
# This script automates the OAuth setup process

Write-Host "🚀 InterviewLens OAuth Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgRunning = Get-Service -Name postgresql* -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'}
if ($pgRunning) {
    Write-Host "✓ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "⚠ PostgreSQL not detected. Make sure your database is running." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Set-Location -Path "backend"

# Install dependencies
pip install authlib==1.3.0
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Authlib installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Install all requirements
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Some dependencies failed to install" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Running database migration..." -ForegroundColor Yellow
alembic upgrade head
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database migration completed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Database migration failed. Check your database connection." -ForegroundColor Red
    Write-Host "  Make sure PostgreSQL is running and .env is configured correctly." -ForegroundColor Yellow
    exit 1
}

Set-Location -Path ".."

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Get OAuth credentials:" -ForegroundColor White
Write-Host "   - Google: https://console.cloud.google.com/" -ForegroundColor Gray
Write-Host "   - GitHub: https://github.com/settings/developers" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Add credentials to backend\.env:" -ForegroundColor White
Write-Host "   GOOGLE_CLIENT_ID=your-google-client-id" -ForegroundColor Gray
Write-Host "   GOOGLE_CLIENT_SECRET=your-google-secret" -ForegroundColor Gray
Write-Host "   GITHUB_CLIENT_ID=your-github-client-id" -ForegroundColor Gray
Write-Host "   GITHUB_CLIENT_SECRET=your-github-secret" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the backend:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   python -m uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start the frontend:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see OAUTH_SETUP.md" -ForegroundColor Cyan
Write-Host ""
