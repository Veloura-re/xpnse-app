# Android Build Script - Fixed Version
# This script builds the Android APK with all fixes applied

Write-Host "=== Cashiee Android Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify dependencies
Write-Host "Step 1: Checking dependencies..." -ForegroundColor Yellow
$expoVersion = (Get-Content package.json | ConvertFrom-Json).dependencies.expo
$rnVersion = (Get-Content package.json | ConvertFrom-Json).dependencies."react-native"

if ($expoVersion -eq "54.0.22" -and $rnVersion -eq "0.81.5") {
    Write-Host "✓ Dependencies are correct (Expo $expoVersion, RN $rnVersion)" -ForegroundColor Green
} else {
    Write-Host "✗ Dependencies mismatch! Expected Expo 54.0.22 and RN 0.81.5" -ForegroundColor Red
    Write-Host "  Found: Expo $expoVersion, RN $rnVersion" -ForegroundColor Red
    exit 1
}

# Step 2: Run expo-doctor
Write-Host ""
Write-Host "Step 2: Running expo-doctor..." -ForegroundColor Yellow
npx expo-doctor
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ expo-doctor found some issues (this may be expected)" -ForegroundColor Yellow
}

# Step 3: Clean build
Write-Host ""
Write-Host "Step 3: Cleaning previous builds..." -ForegroundColor Yellow
Set-Location android
.\gradlew clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Clean failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✓ Clean completed" -ForegroundColor Green
Set-Location ..

# Step 4: Ask for build type
Write-Host ""
$buildType = Read-Host "Choose build type (debug/release) [default: debug]"
if ([string]::IsNullOrWhiteSpace($buildType)) {
    $buildType = "debug"
}

# Step 5: Build APK
Write-Host ""
Write-Host "Step 4: Building $buildType APK..." -ForegroundColor Yellow
Set-Location android

if ($buildType -eq "debug") {
    .\gradlew assembleDebug
} else {
    .\gradlew assembleRelease
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Step 6: Locate APK
Write-Host ""
if ($buildType -eq "debug") {
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
} else {
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
}

if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "✓ Build successful!" -ForegroundColor Green
    Write-Host "  APK location: $apkPath" -ForegroundColor Cyan
    Write-Host "  APK size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install on connected device:" -ForegroundColor Yellow
    Write-Host "  adb install $apkPath" -ForegroundColor White
} else {
    Write-Host "✗ APK not found at expected location!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan

