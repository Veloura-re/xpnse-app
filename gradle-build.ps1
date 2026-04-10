# Simple Gradle Release Build
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Gradle Release Build" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if android folder exists
if (-not (Test-Path "android")) {
    Write-Host "ERROR: Android folder not found!" -ForegroundColor Red
    Write-Host "Run this from project root." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Building release APK with Gradle..." -ForegroundColor Yellow
Write-Host "This may take 5-15 minutes..." -ForegroundColor Yellow
Write-Host ""

Set-Location "android"

try {
    # Clean
    Write-Host "[1/2] Cleaning previous builds..." -ForegroundColor Green
    if (Test-Path "gradlew.bat") {
        & ".\gradlew.bat" clean
    } else {
        & ".\gradlew" clean
    }
    
    # Build release
    Write-Host "[2/2] Building release APK..." -ForegroundColor Green
    if (Test-Path "gradlew.bat") {
        & ".\gradlew.bat" assembleRelease
    } else {
        & ".\gradlew" assembleRelease
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Check APK
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $apkFile = Get-Item $apkPath
        $sizeMB = [math]::Round($apkFile.Length / 1MB, 1)
        
        Write-Host "✅ APK Location: android\$apkPath" -ForegroundColor Green
        Write-Host "✅ APK Size: ${sizeMB}MB" -ForegroundColor Green
        Write-Host ""
        
        # Copy to root
        Set-Location ".."
        Copy-Item "android\$apkPath" "cashiee-release.apk" -Force
        Write-Host "✅ Copied to: cashiee-release.apk" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Install on device:" -ForegroundColor Cyan
        Write-Host "  adb install cashiee-release.apk" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Release APK ready!" -ForegroundColor Green
    } else {
        Write-Host "❌ APK not found. Build may have failed." -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "1. APK needs signing - see BUILD_WITH_GRADLE.md" -ForegroundColor White
        Write-Host "2. Build errors - check output above" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Set ANDROID_HOME environment variable" -ForegroundColor White
    Write-Host "2. Install Android SDK via Android Studio" -ForegroundColor White
    Write-Host "3. For signing errors, see BUILD_WITH_GRADLE.md" -ForegroundColor White
    Write-Host ""
} finally {
    if (Get-Location | Select-Object -ExpandProperty Path | Select-String "android") {
        Set-Location ".."
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
