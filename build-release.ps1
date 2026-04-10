# Cashiee Android Release Build Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Building Cashiee Release APK" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

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

Write-Host "[2/5] Checking keystore..." -ForegroundColor Yellow

$keystorePath = "android\app\cashiee-release.keystore"
$keystorePropsPath = "android\keystore.properties"

if (-not (Test-Path $keystorePath)) {
    Write-Host "No keystore found. Creating new keystore..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please enter the following information:" -ForegroundColor Cyan
    Write-Host "(Press Enter to use default values)" -ForegroundColor Gray
    Write-Host ""
    
    $keyAlias = Read-Host "Key Alias [default: cashiee-key]"
    if ([string]::IsNullOrWhiteSpace($keyAlias)) { $keyAlias = "cashiee-key" }
    
    $keyPassword = Read-Host "Key Password [default: cashiee123]" -AsSecureString
    $keyPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassword))
    if ([string]::IsNullOrWhiteSpace($keyPasswordPlain)) { $keyPasswordPlain = "cashiee123" }
    
    $storePassword = Read-Host "Store Password [default: cashiee123]" -AsSecureString
    $storePasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePassword))
    if ([string]::IsNullOrWhiteSpace($storePasswordPlain)) { $storePasswordPlain = "cashiee123" }
    
    Write-Host ""
    Write-Host "Generating keystore..." -ForegroundColor Green
    
    # Generate keystore
    $keytoolCmd = "keytool -genkeypair -v -storetype PKCS12 -keystore `"$keystorePath`" -alias `"$keyAlias`" -keyalg RSA -keysize 2048 -validity 10000 -storepass `"$storePasswordPlain`" -keypass `"$keyPasswordPlain`" -dname `"CN=Cashiee, OU=Development, O=Cashiee, L=City, S=State, C=US`""
    
    try {
        Invoke-Expression $keytoolCmd
        Write-Host "✅ Keystore created successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create keystore. Make sure Java/JDK is installed." -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Create keystore.properties
    Write-Host "Creating keystore.properties..." -ForegroundColor Green
    $keystoreProps = @"
storePassword=$storePasswordPlain
keyPassword=$keyPasswordPlain
keyAlias=$keyAlias
storeFile=cashiee-release.keystore
"@
    Set-Content -Path $keystorePropsPath -Value $keystoreProps
    Write-Host "✅ keystore.properties created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Keep these credentials safe!" -ForegroundColor Yellow
    Write-Host "Store Password: $storePasswordPlain" -ForegroundColor White
    Write-Host "Key Password: $keyPasswordPlain" -ForegroundColor White
    Write-Host "Key Alias: $keyAlias" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ Keystore found: $keystorePath" -ForegroundColor Green
}

Write-Host "[3/5] Checking build configuration..." -ForegroundColor Yellow

# Check if build.gradle is configured for release
$buildGradlePath = "android\app\build.gradle"
$buildGradleContent = Get-Content $buildGradlePath -Raw

if ($buildGradleContent -notmatch "signingConfigs") {
    Write-Host "Configuring build.gradle for release signing..." -ForegroundColor Yellow
    
    # Backup original
    Copy-Item $buildGradlePath "$buildGradlePath.backup"
    
    # Add signing config
    $signingConfig = @"

    // Load keystore properties
    def keystorePropertiesFile = rootProject.file("keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
"@
    
    # Insert after android {
    $buildGradleContent = $buildGradleContent -replace '(android\s*\{)', "`$1`n$signingConfig"
    
    # Add signingConfig to release buildType
    $buildGradleContent = $buildGradleContent -replace '(release\s*\{[^}]*)', '$1`n            signingConfig signingConfigs.release'
    
    Set-Content -Path $buildGradlePath -Value $buildGradleContent
    Write-Host "✅ build.gradle configured!" -ForegroundColor Green
}

Write-Host "[4/5] Starting release build..." -ForegroundColor Yellow
Write-Host "This may take 5-15 minutes..." -ForegroundColor Yellow
Write-Host ""

Set-Location "android"

try {
    Write-Host "Building release APK..." -ForegroundColor Green
    
    # Clean previous builds
    if (Test-Path "gradlew.bat") {
        & ".\gradlew.bat" clean
        & ".\gradlew.bat" assembleRelease
    } elseif (Test-Path "gradlew") {
        & ".\gradlew" clean
        & ".\gradlew" assembleRelease
    } else {
        throw "Gradle wrapper not found"
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   RELEASE BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Check if APK was created
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        Write-Host "✅ Release APK Location: android\$apkPath" -ForegroundColor Green
        
        # Get file size
        $apkFile = Get-Item $apkPath
        $sizeMB = [math]::Round($apkFile.Length / 1MB, 1)
        Write-Host "✅ APK Size: ${sizeMB}MB" -ForegroundColor Green
        Write-Host ""
        
        # Copy to root for easy access
        $outputPath = "..\cashiee-release.apk"
        Copy-Item $apkPath $outputPath -Force
        Write-Host "✅ Copied to: cashiee-release.apk (in project root)" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "[5/5] Next steps:" -ForegroundColor Cyan
        Write-Host "1. Install on your phone: adb install cashiee-release.apk" -ForegroundColor White
        Write-Host "2. Or copy cashiee-release.apk to your phone and install" -ForegroundColor White
        Write-Host "3. Enable 'Install from unknown sources' if needed" -ForegroundColor White
        Write-Host "4. Share the APK with others!" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Your Cashiee release app is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  Remember:" -ForegroundColor Yellow
        Write-Host "- Keep your keystore file safe (android\app\cashiee-release.keystore)" -ForegroundColor White
        Write-Host "- Keep keystore.properties secure (contains passwords)" -ForegroundColor White
        Write-Host "- You need the same keystore to update the app later" -ForegroundColor White
    } else {
        Write-Host "❌ Release APK file not found. Build may have failed." -ForegroundColor Red
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
    Write-Host "1. Make sure Java/JDK is installed (for keytool)" -ForegroundColor White
    Write-Host "2. Install Android Studio and set ANDROID_HOME" -ForegroundColor White
    Write-Host "3. Check if keystore.properties exists and is correct" -ForegroundColor White
    Write-Host "4. Try: npx expo run:android --variant release" -ForegroundColor White
    Write-Host ""
} finally {
    Set-Location ".."
}

Write-Host ""
Read-Host "Press Enter to exit"
