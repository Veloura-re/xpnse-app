# GitHub Actions Native Android Build Setup

## Setup GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to: Repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

- `FIREBASE_API_KEY` - Your Firebase API key
- `FIREBASE_AUTH_DOMAIN` - cashiee.firebaseapp.com
- `FIREBASE_PROJECT_ID` - cashiee
- `FIREBASE_STORAGE_BUCKET` - cashiee.firebasestorage.app
- `FIREBASE_MESSAGING_SENDER_ID` - Your sender ID
- `FIREBASE_APP_ID` - Your app ID

## How It Works

The workflow will:
1. Checkout your code
2. Install Node.js and Android SDK
3. Install npm dependencies
4. Create .env file from secrets
5. Generate native Android project with `expo prebuild`
6. Build APK with Gradle
7. Upload APK as artifact

## Trigger Build

- **Automatic**: Push to main/master branch
- **Manual**: Actions tab → Build Android APK → Run workflow

## Download APK

After build completes:
1. Go to Actions tab
2. Click on the workflow run
3. Download "app-release" artifact
4. Extract and install the APK

## No Expo Account Needed!

This workflow builds the APK directly using Gradle, no Expo/EAS account required.
