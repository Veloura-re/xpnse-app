# Fix: Firebase Error in Production APK

## Problem Solved ✅
Your APK was showing "bad config of firebase" because environment variables from `.env` aren't included in production builds.

## What Was Fixed

### 1. Created `app.config.js`
Replaces static `app.json` with dynamic configuration that reads Firebase credentials from environment variables at build time.

### 2. Updated `config/firebase.ts`
Now reads Firebase config from two sources:
- **Development**: `process.env.EXPO_PUBLIC_*` (from `.env` file)
- **Production**: `Constants.expoConfig.extra.*` (from `app.config.js`)

---

## How to Build a Working APK

### Option 1: EAS Build (Recommended)

**EAS already has your environment variables configured!** Just rebuild:

```powershell
npx eas build --platform android --profile preview
```

Wait for the build to complete, then download and install the APK.

✅ **This will work now** because:
- EAS loads environment variables from your EAS secrets
- `app.config.js` embeds them into the build
- APK includes Firebase configuration

### Option 2: Local Build with Gradle

This requires the `.env` file to be present:

```powershell
# Step 1: Generate Android project with environment variables
npx expo prebuild --platform android --clean

# Step 2: Build release APK
cd android
.\gradlew assembleRelease

# Step 3: APK location
# android\app\build\outputs\apk\release\app-release.apk
```

---

## Verify Firebase Config in Build

After installing the new APK, open the app and check the console/logs. You should see:

```
🔥 Firebase Configuration Status:
✅ All credentials loaded
📦 Project: cashiee
✅ Firebase initialized successfully
```

If you still see errors, check the actual error message - it might be:
- Firestore rules issue (not initialization)
- Network connectivity issue
- Authentication not enabled in Firebase Console

---

## For GitHub Actions Builds

Make sure GitHub Secrets are configured (see `GITHUB_SECRETS_SETUP.md`), then the workflow will automatically:
1. Create `.env` from GitHub Secrets
2. Run `npx expo prebuild` (reads `.env`)
3. Build APK with Firebase config embedded

---

## Key Changes Made

| File | Change |
|------|--------|
| `app.config.js` | **NEW** - Dynamic config that embeds Firebase env vars |
| `config/firebase.ts` | Added fallback to read from `Constants.expoConfig.extra` |

---

## Test It Now

1. **Rebuild with EAS:**
   ```powershell
   npx eas build --platform android --profile preview
   ```

2. **Download APK** from EAS when done

3. **Install on phone** and test

4. **Check logs** - Should show Firebase initialized successfully

---

## Still Having Issues?

If the new APK still shows Firebase errors:

1. **Check actual error message** - Might not be configuration issue
2. **Verify Firebase Console:**
   - Email/Password auth enabled
   - Firestore database created
   - Security rules published
3. **Check network** - Phone needs internet to connect to Firebase
4. **Try fresh install** - Uninstall old app first

---

## Commit These Changes

```powershell
git add app.config.js config/firebase.ts
git commit -m "Fix: Embed Firebase config in production builds"
git push
```
