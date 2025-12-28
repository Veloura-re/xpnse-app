# Update .env file with Firebase configuration from google-services.json

$envContent = @"
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=cashiee.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=cashiee
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=cashiee.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=572518473431
EXPO_PUBLIC_FIREBASE_APP_ID=1:572518473431:android:342a9725a05b2fa48c5a92
"@

# Write to .env file
$envPath = Join-Path $PSScriptRoot ".env"
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host "Successfully updated .env file!" -ForegroundColor Green
Write-Host ""
Write-Host "Firebase Configuration:" -ForegroundColor Cyan
Write-Host "  Project ID: cashiee"
Write-Host "  API Key: AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk"
Write-Host "  Auth Domain: cashiee.firebaseapp.com"
Write-Host ""
Write-Host "IMPORTANT: Restart your development server for changes to take effect!" -ForegroundColor Yellow
Write-Host "Run: npm start" -ForegroundColor Yellow
