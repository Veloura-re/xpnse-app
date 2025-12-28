# Testing & Building Guide

## Quick Testing (Development)
Your dev server is already running:
```bash
npx expo start --clear
```
- Scan QR code with Expo Go app
- Changes reload automatically

## Production Testing

### 1. Export Bundle (Test Production Behavior)
```bash
npx expo export --platform android
```
- Creates optimized bundle in `dist/` folder
- Tests production optimizations
- No installation needed

### 2. Build APK (Install on Device)
```bash
npm run build:android-apk
```
- Creates installable APK file
- Can share with testers
- Runs without Expo Go

### 3. Production Build (App Store)
```bash
eas build --platform android --profile production
```
- Creates production AAB for Google Play
- Requires EAS account
- Fully optimized build

## Current Status
✅ Dev server running on port (check terminal)
✅ Tab merge implemented
✅ All features working

## Recommended Testing Flow
1. **Dev**: Use `expo start` for development
2. **Pre-release**: Use `expo export` to test production bundle
3. **Beta**: Use `eas build --profile preview` for APK
4. **Release**: Use `eas build --profile production` for store

## Troubleshooting
- **Build fails**: Run `npx expo-doctor` first
- **Crashes**: Check `npx expo start --clear`
- **Slow**: Clear cache with `--clear` flag
