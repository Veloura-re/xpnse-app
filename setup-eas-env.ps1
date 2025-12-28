# Set EAS Environment Variables from .env file
# Run this script to configure Firebase environment variables for EAS builds

Write-Host "=== Setting up EAS Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

$envVars = Get-Content $envFile
$count = 0

foreach ($line in $envVars) {
    # Skip empty lines and comments
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
        continue
    }
    
    # Match EXPO_PUBLIC_ variables
    if ($line -match '^EXPO_PUBLIC_') {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            if ([string]::IsNullOrWhiteSpace($value)) {
                Write-Host "⚠️  Skipping empty value for: $key" -ForegroundColor Yellow
                continue
            }
            
            Write-Host "Setting: $key" -ForegroundColor Yellow
            
            # EXPO_PUBLIC_ variables should be plaintext visibility (they're public by design)
            $result = npx eas env:create --name $key --value $value --scope project --type string --visibility plaintext --non-interactive 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Successfully set $key" -ForegroundColor Green
                $count++
            } else {
                # Check if it already exists
                if ($result -match 'already exists') {
                    Write-Host "  ⚠️  $key already exists, updating..." -ForegroundColor Yellow
                    # Try to update instead
                    npx eas env:update --name $key --value $value --scope project --type string --visibility plaintext --non-interactive 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "  ✅ Successfully updated $key" -ForegroundColor Green
                        $count++
                    } else {
                        Write-Host "  ❌ Failed to update $key" -ForegroundColor Red
                    }
                } else {
                    Write-Host "  ❌ Failed to set $key" -ForegroundColor Red
                    Write-Host "  Error: $result" -ForegroundColor Red
                }
            }
        }
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "✅ Set/Updated $count environment variables" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify variables: npx eas env:list" -ForegroundColor White
Write-Host "2. Build your app: npx eas build --platform android --profile preview" -ForegroundColor White
Write-Host ""

