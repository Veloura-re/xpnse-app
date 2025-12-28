# Build Cashiee APK with EAS Build
# This creates a properly signed, installable APK

Write-Host "🚀 Building Cashiee APK with EAS Build..." -ForegroundColor Cyan
Write-Host ""

# Check if logged in to EAS
Write-Host "Checking EAS login status..." -ForegroundColor Yellow
$loginCheck = eas whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to EAS. Please login first:" -ForegroundColor Red
    Write-Host "   eas login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Logged in as: $loginCheck" -ForegroundColor Green
Write-Host ""

# Ask which profile to use
Write-Host "Select build profile:" -ForegroundColor Cyan
Write-Host "  1. Preview (faster, for testing)" -ForegroundColor White
Write-Host "  2. Production (full release build)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    $buildProfile = "preview"
    Write-Host "Building with PREVIEW profile..." -ForegroundColor Yellow
} elseif ($choice -eq "2") {
    $buildProfile = "production"
    Write-Host "Building with PRODUCTION profile..." -ForegroundColor Yellow
} else {
    Write-Host "❌ Invalid choice. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Starting build..." -ForegroundColor Cyan
Write-Host "This will take 10-15 minutes. You can close this window." -ForegroundColor Yellow
Write-Host ""

# Start the build
eas build --platform android --profile $buildProfile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build submitted successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 To download your APK:" -ForegroundColor Cyan
    Write-Host "  1. Check the link above" -ForegroundColor White
    Write-Host "  2. Or visit: https://expo.dev/accounts/zzz1/projects/business-finance-management-app-kkqzwnt/builds" -ForegroundColor White
    Write-Host ""
    Write-Host "⏱️  Build usually takes 10-15 minutes" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Build failed. Check the error above." -ForegroundColor Red
}
