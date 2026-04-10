#!/usr/bin/env pwsh
# Setup EAS Environment Variables for Firebase
# Run this to push your .env variables to EAS

Write-Host "`n🔧 EAS Environment Setup" -ForegroundColor Cyan
Write-Host "=" * 60

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "`n❌ ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Reading variables from .env..." -ForegroundColor Cyan

# Read .env file
$envContent = Get-Content .env
$variables = @{}

foreach ($line in $envContent) {
    if ($line -match '^EXPO_PUBLIC_FIREBASE_(.+)=(.+)$') {
        $key = "EXPO_PUBLIC_FIREBASE_$($matches[1])"
        $value = $matches[2]
        $variables[$key] = $value
    }
}

Write-Host "✅ Found $($variables.Count) Firebase variables" -ForegroundColor Green

Write-Host "`n🚀 Pushing to EAS (preview environment)..." -ForegroundColor Cyan

# Push each variable to EAS
foreach ($key in $variables.Keys) {
    $value = $variables[$key]
    Write-Host "  Setting $key..." -ForegroundColor Gray
    
    # Use eas env:create to set the variable
    $env:TEMP_VALUE = $value
    $result = eas env:create --name $key --value $value --environment preview --visibility plain 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ $key" -ForegroundColor Green
    }
    else {
        Write-Host "    ⚠️ $key (may already exist)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Environment variables configured!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npx eas build --platform android --profile preview" -ForegroundColor White
Write-Host "2. Wait for build to complete" -ForegroundColor White
Write-Host "3. Download and install APK" -ForegroundColor White
Write-Host ""
