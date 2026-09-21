# PostgreSQL Connection Test Script

Write-Host "PostgreSQL Connection Troubleshooter" -ForegroundColor Cyan
Write-Host "=" -NoNewline
Write-Host "=" -NoNewline
Write-Host "=" -NoNewline
Write-Host "=" -NoNewline
Write-Host "=" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
Write-Host "1. Checking PostgreSQL installation..." -ForegroundColor Yellow
$pgPath = Get-Command psql -ErrorAction SilentlyContinue
if ($pgPath) {
    Write-Host "   PostgreSQL found" -ForegroundColor Green
}
else {
    Write-Host "   psql command not found in PATH" -ForegroundColor Yellow
}

Write-Host ""

# Check PostgreSQL service
Write-Host "2. Checking PostgreSQL service..." -ForegroundColor Yellow
$pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
if ($pgService) {
    foreach ($service in $pgService) {
        if ($service.Status -eq 'Running') {
            Write-Host "   PostgreSQL service running: $($service.Name)" -ForegroundColor Green
        }
        else {
            Write-Host "   PostgreSQL service NOT running: $($service.Name)" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "   No PostgreSQL service found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=" -NoNewline
Write-Host "=" -NoNewline
Write-Host "=" -NoNewline
Write-Host "=" -NoNewline
Write-Host "=" -ForegroundColor Cyan
Write-Host ""

# Provide instructions
Write-Host "How to Fix the Database Password:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Find your PostgreSQL password" -ForegroundColor Yellow
Write-Host "   - Check pgAdmin if you can connect" -ForegroundColor Gray
Write-Host "   - Check your password manager" -ForegroundColor Gray
Write-Host "   - Try common defaults: postgres, admin" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Update the .env file" -ForegroundColor Yellow
Write-Host "   - Open: backend\.env" -ForegroundColor Gray
Write-Host "   - Find: DATABASE_URL=..." -ForegroundColor Gray
Write-Host "   - Change password in the connection string" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Example .env line:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/interviewlens" -ForegroundColor White
Write-Host ""

Write-Host "Would you like to update the password now? (y/n): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Enter your PostgreSQL password: " -NoNewline -ForegroundColor Yellow
    $newPassword = Read-Host
    
    Write-Host "Enter database name (default: interviewlens): " -NoNewline -ForegroundColor Yellow
    $dbName = Read-Host
    if ([string]::IsNullOrWhiteSpace($dbName)) {
        $dbName = "interviewlens"
    }
    
    $newDbUrl = "DATABASE_URL=postgresql+asyncpg://postgres:$newPassword@localhost:5432/$dbName"
    
    # Update .env file
    $envPath = ".env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
        $pattern = 'DATABASE_URL=.*'
        $envContent = $envContent -replace $pattern, $newDbUrl
        Set-Content $envPath -Value $envContent -NoNewline
        
        Write-Host ""
        Write-Host ".env file updated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now try starting the backend:" -ForegroundColor Cyan
        Write-Host "   python -m uvicorn app.main:app --reload" -ForegroundColor White
        Write-Host ""
    }
    else {
        Write-Host ""
        Write-Host ".env file not found!" -ForegroundColor Red
        Write-Host ""
    }
}
else {
    Write-Host ""
    Write-Host "No changes made." -ForegroundColor Yellow
    Write-Host "Edit .env manually to update the password." -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
