# Cashiee Android Build Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Building Cashiee Android App" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Checking prerequisites..." -ForegroundColor Yellow

# Check if android folder exists
if (-not (Test-Path "android")) {
    Write-Host "ERROR: Android folder not found!" -ForegroundColor Red
    Write-Host "Please run this from the project root directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if google-services.json is in place
if (-not (Test-Path "android\app\google-services.json")) {
    Write-Host "WARNING: google-services.json not found in android/app/" -ForegroundColor Yellow
    if (Test-Path "google-services.json") {
        Write-Host "Copying google-services.json..." -ForegroundColor Green
        Copy-Item "google-services.json" "android\app\google-services.json"
    }
}

Write-Host "[2/3] Starting build process..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

Set-Location "android"

try {
    Write-Host "Building debug APK..." -ForegroundColor Green
    
    # Try PowerShell execution policy friendly approach
    if (Test-Path "gradlew.bat") {
        & ".\gradlew.bat" assembleDebug
    } elseif (Test-Path "gradlew") {
        & ".\gradlew" assembleDebug  
    } else {
        throw "Gradle wrapper not found"
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Check if APK was created
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "✅ APK Location: android\$apkPath" -ForegroundColor Green
        
        # Get file size
        $apkFile = Get-Item $apkPath
        $sizeMB = [math]::Round($apkFile.Length / 1MB, 1)
        Write-Host "✅ APK Size: ${sizeMB}MB" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "[3/3] Next steps:" -ForegroundColor Cyan
        Write-Host "1. Install on your phone: adb install $apkPath" -ForegroundColor White
        Write-Host "2. Or copy the APK file to your phone and install manually" -ForegroundColor White
        Write-Host "3. Enable 'Install from unknown sources' if needed" -ForegroundColor White
        Write-Host ""
        Write-Host "Your Cashiee app is ready! 🎉" -ForegroundColor Green
    } else {
        Write-Host "❌ APK file not found. Build may have failed." -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible fixes:" -ForegroundColor Yellow
    Write-Host "1. Install Android Studio and set environment variables" -ForegroundColor White
    Write-Host "2. Run: npx expo run:android (requires Android Studio)" -ForegroundColor White  
    Write-Host "3. Use EAS build: npx eas build --platform android --local" -ForegroundColor White
    Write-Host ""
    Write-Host "See COMPLETE_ANDROID_BUILD_GUIDE.md for detailed setup instructions." -ForegroundColor Cyan
} finally {
    Set-Location ".."
}

Write-Host ""
Read-Host "Press Enter to exit"