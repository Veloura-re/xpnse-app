@echo off
echo ========================================
echo   Building Cashiee Android App
echo ========================================
echo.

echo [1/3] Checking prerequisites...

REM Check if android folder exists
if not exist "android" (
    echo ERROR: Android folder not found!
    echo Please run this from the project root directory.
    pause
    exit /b 1
)

REM Check if google-services.json is in place
if not exist "android\app\google-services.json" (
    echo WARNING: google-services.json not found in android/app/
    if exist "google-services.json" (
        echo Copying google-services.json...
        copy "google-services.json" "android\app\google-services.json"
    )
)

echo [2/3] Starting build process...
echo This may take 5-10 minutes...
echo.

cd android

REM Try to build debug APK
echo Building debug APK...
call gradlew.bat assembleDebug

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   BUILD FAILED!
    echo ========================================
    echo.
    echo Possible fixes:
    echo 1. Install Android Studio and set environment variables
    echo 2. Run: npx expo run:android (requires Android Studio)
    echo 3. Use EAS build: npx eas build --platform android --local
    echo.
    echo See COMPLETE_ANDROID_BUILD_GUIDE.md for detailed setup instructions.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.

REM Check if APK was created
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ APK Location: android\app\build\outputs\apk\debug\app-debug.apk
    
    REM Get file size
    for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do (
        set size=%%~zA
        set /a sizeMB=!size!/1024/1024
    )
    
    echo ✅ APK Size: ~%sizeMB%MB
    echo.
    echo [3/3] Next steps:
    echo 1. Install on your phone: adb install app\build\outputs\apk\debug\app-debug.apk
    echo 2. Or copy the APK file to your phone and install manually
    echo 3. Enable "Install from unknown sources" if needed
    echo.
    echo Your Cashiee app is ready! 🎉
) else (
    echo ❌ APK file not found. Build may have failed.
)

cd ..
echo.
pause