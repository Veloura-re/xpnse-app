# GitHub Secrets Setup for Firebase

## Problem
The GitHub Actions workflow is failing because Firebase environment variables are not configured. The `.env` file is correctly excluded from Git (as it should be for security), but the CI/CD pipeline needs these values to build the app.

## Solution
Configure Firebase credentials as **GitHub Secrets** so the workflow can access them securely.

---

## Step-by-Step Instructions

### 1. Get Your Firebase Configuration

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **⚙️ Settings** icon → **Project settings**
4. Scroll down to **"Your apps"** section
5. If you don't have a web app, click **"Add app"** → **Web** (</> icon)
6. You'll see a `firebaseConfig` object with your credentials

It should look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

### 2. Add Secrets to GitHub

1. **Go to your GitHub repository** in the browser
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Add each of the following secrets:

| Secret Name | Value from Firebase Config |
|-------------|----------------------------|
| `FIREBASE_API_KEY` | The `apiKey` value |
| `FIREBASE_AUTH_DOMAIN` | The `authDomain` value |
| `FIREBASE_PROJECT_ID` | The `projectId` value |
| `FIREBASE_STORAGE_BUCKET` | The `storageBucket` value |
| `FIREBASE_MESSAGING_SENDER_ID` | The `messagingSenderId` value |
| `FIREBASE_APP_ID` | The `appId` value |

For each secret:
- Click **"New repository secret"**
- Enter the **Name** (exactly as shown above)
- Paste the **Value** from your Firebase config
- Click **"Add secret"**

### 3. Verify Setup

After adding all 6 secrets:

1. Go to **Actions** tab in your GitHub repository
2. Click on the latest failed workflow run
3. Click **"Re-run all jobs"** in the top right
4. The build should now succeed! ✅

---

## For Local Development

Your local `.env` file should still work as before. If you need to recreate it:

1. Copy the `.env.example` file:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Open `.env` and replace the placeholder values with your actual Firebase credentials

3. Make sure `.env` is in `.gitignore` (it already is ✅)

---

## What Gets Committed to GitHub

✅ **DO commit:**
- `.env.example` (template without real values)
- `.github/workflows/android-build.yml` (already configured)
- `.gitignore` (already includes `.env`)

❌ **DON'T commit:**
- `.env` (contains sensitive credentials)
- `google-services.json` (already in `.gitignore`)

---

## Troubleshooting

### Error: "Firebase not configured"
- Make sure all 6 secrets are added to GitHub
- Check that secret names match exactly (case-sensitive)
- Re-run the GitHub Actions workflow

### Build still failing after adding secrets
- Check the workflow logs in the **Actions** tab
- Verify each secret value is correct (no extra spaces or quotes)
- Make sure you added secrets to the correct repository

### Local development not working
- Verify your `.env` file exists
- Check that values in `.env` match your Firebase project
- Run the fix script: `.\fix-firebase-env.ps1`
