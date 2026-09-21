# Test Backend Connection Script

Write-Host "🔍 Testing Backend Connection..." -ForegroundColor Cyan
Write-Host ""

# Test if backend is running
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Backend is running!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Backend is NOT running" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the backend:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   python -m uvicorn app.main:app --reload" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "2. Testing Google OAuth endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/google/login" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 307 -or $response.StatusCode -eq 302) {
        Write-Host "   ✓ Google OAuth endpoint working!" -ForegroundColor Green
        $location = $response.Headers.Location
        if ($location -like "*accounts.google.com*") {
            Write-Host "   ✓ Redirects to Google correctly" -ForegroundColor Green
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 307 -or $statusCode -eq 302) {
        Write-Host "   ✓ Google OAuth endpoint working!" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Google OAuth endpoint error" -ForegroundColor Red
        Write-Host "   Status: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "3. Testing GitHub OAuth endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/github/login" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 307 -or $response.StatusCode -eq 302) {
        Write-Host "   ✓ GitHub OAuth endpoint working!" -ForegroundColor Green
        $location = $response.Headers.Location
        if ($location -like "*github.com*") {
            Write-Host "   ✓ Redirects to GitHub correctly" -ForegroundColor Green
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 307 -or $statusCode -eq 302) {
        Write-Host "   ✓ GitHub OAuth endpoint working!" -ForegroundColor Green
    } else {
        Write-Host "   ✗ GitHub OAuth endpoint error" -ForegroundColor Red
        Write-Host "   Status: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "4. Checking .env configuration..." -ForegroundColor Yellow
$envPath = "backend\.env"
if (Test-Path $envPath) {
    Write-Host "   ✓ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -match 'GOOGLE_CLIENT_ID=\s*(.+)') {
        $googleId = $Matches[1].Trim()
        if ($googleId -and $googleId -ne "") {
            Write-Host "   ✓ Google Client ID configured" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Google Client ID is empty" -ForegroundColor Red
        }
    }
    
    if ($envContent -match 'GITHUB_CLIENT_ID=\s*(.+)') {
        $githubId = $Matches[1].Trim()
        if ($githubId -and $githubId -ne "") {
            Write-Host "   ✓ GitHub Client ID configured" -ForegroundColor Green
        } else {
            Write-Host "   ✗ GitHub Client ID is empty" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ✗ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Backend test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "If OAuth buttons still don't work:" -ForegroundColor Yellow
Write-Host "1. Make sure backend is running on port 8000" -ForegroundColor White
Write-Host "2. Check browser console for errors (F12)" -ForegroundColor White
Write-Host "3. Verify redirect URIs in Google/GitHub console" -ForegroundColor White
Write-Host ""
