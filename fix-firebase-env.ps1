# Firebase Environment Variables Not Loading - Fix Script

Write-Host "🔧 Fixing Firebase Environment Variables Issue..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any running Metro/Expo processes
Write-Host "1. Stopping any running Metro/Expo processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Clear Metro bundler cache
Write-Host "2. Clearing Metro bundler cache..." -ForegroundColor Yellow
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# Step 3: Verify .env file
Write-Host "3. Verifying .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk") {
        Write-Host "   ✅ Firebase API Key found" -ForegroundColor Green
    }
    else {
        Write-Host "   ❌ Firebase API Key missing or incorrect!" -ForegroundColor Red
    }
}
else {
    Write-Host "   ❌ .env file not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npx expo start --clear" -ForegroundColor White
Write-Host "   2. Wait for Metro to bundle" -ForegroundColor White
Write-Host "   3. Press 'w' for web or 'a' for Android" -ForegroundColor White
Write-Host "   4. Check console for Firebase initialization logs" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Look for this in the console:" -ForegroundColor Cyan
Write-Host "   ✅ All credentials loaded" -ForegroundColor Green
Write-Host "   📦 Project: cashiee" -ForegroundColor Green
Write-Host "   ✅ Firebase initialized successfully" -ForegroundColor Green
Write-Host ""
