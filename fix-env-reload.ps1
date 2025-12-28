#!/usr/bin/env pwsh
# Firebase Environment Fix Script
# Clears all caches and restarts Expo with fresh environment

Write-Host "`n🔧 Firebase Environment Variable Fix" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "`n❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with Firebase credentials." -ForegroundColor Yellow
    Write-Host "`nSee .env.example for template.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ .env file found" -ForegroundColor Green

# Verify environment variables
Write-Host "`n📋 Checking environment variables..." -ForegroundColor Cyan
$envContent = Get-Content .env
$requiredVars = @(
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID"
)

$allPresent = $true
foreach ($var in $requiredVars) {
    $found = $envContent | Select-String -Pattern "^$var=" -Quiet
    if ($found) {
        Write-Host "  ✅ $var" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ $var - MISSING!" -ForegroundColor Red
        $allPresent = $false
    }
}

if (-not $allPresent) {
    Write-Host "`n❌ Some environment variables are missing!" -ForegroundColor Red
    Write-Host "Please add all required variables to .env file.`n" -ForegroundColor Yellow
    exit 1
}

# Clear caches
Write-Host "`n🧹 Clearing caches..." -ForegroundColor Cyan

if (Test-Path ".expo") {
    Write-Host "  Removing .expo cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
    Write-Host "  ✅ .expo cache cleared" -ForegroundColor Green
}

if (Test-Path "node_modules\.cache") {
    Write-Host "  Removing node_modules cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
    Write-Host "  ✅ node_modules cache cleared" -ForegroundColor Green
}

# Test Firebase config
Write-Host "`n🔍 Testing Firebase configuration..." -ForegroundColor Cyan
$testOutput = node test-firebase.js 2>&1
Write-Host $testOutput

if ($testOutput -match "SUCCESS") {
    Write-Host "`n✅ Firebase configuration is valid!" -ForegroundColor Green
}
else {
    Write-Host "`n⚠️ Firebase test returned warnings" -ForegroundColor Yellow
}

# Instructions
Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start Expo with cleared cache:" -ForegroundColor White
Write-Host "   npx expo start --clear" -ForegroundColor Yellow
Write-Host "`n2. After server starts, reload your app:" -ForegroundColor White
Write-Host "   - Android: Shake device → Reload" -ForegroundColor Gray
Write-Host "   - iOS: Cmd+R or shake device → Reload" -ForegroundColor Gray
Write-Host "   - Web: Ctrl+R / Cmd+R" -ForegroundColor Gray
Write-Host "`n3. Check terminal for Firebase initialization messages" -ForegroundColor White
Write-Host "   Look for: '✅ Firebase initialized successfully'" -ForegroundColor Gray
Write-Host "`n" + "=" * 60 -ForegroundColor Gray

Write-Host "`n🚀 Ready to start? Run: " -ForegroundColor Green -NoNewline
Write-Host "npx expo start --clear" -ForegroundColor Yellow
Write-Host ""
