# Create InterviewLens Database

Write-Host "Creating InterviewLens Database..." -ForegroundColor Cyan
Write-Host ""

# Read password from .env
$envPath = ".env"
$password = "password1234"  # Default from your .env

Write-Host "Attempting to create database 'interviewlens'..." -ForegroundColor Yellow
Write-Host ""

# Set password as environment variable for psql
$env:PGPASSWORD = $password

# Try to create database
$createCmd = 'CREATE DATABASE interviewlens;'
echo $createCmd | psql -U postgres -h localhost 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Database 'interviewlens' created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now start the backend:" -ForegroundColor Cyan
    Write-Host "   python -m uvicorn app.main:app --reload" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Could not create database automatically." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create it manually:" -ForegroundColor Cyan
    Write-Host "1. Open pgAdmin" -ForegroundColor White
    Write-Host "2. Right-click 'Databases' -> Create -> Database" -ForegroundColor White
    Write-Host "3. Name: interviewlens" -ForegroundColor White
    Write-Host "4. Click Save" -ForegroundColor White
    Write-Host ""
    Write-Host "OR run this command:" -ForegroundColor Cyan
    Write-Host "   psql -U postgres -c `"CREATE DATABASE interviewlens;`"" -ForegroundColor White
    Write-Host ""
}

# Clear password
$env:PGPASSWORD = ""

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
