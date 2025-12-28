# 📱 How to Download Your Cashiee APK

I've set up **2 FREE methods** to build and download your APK. Choose either one!

---

## 🎯 METHOD 1: GitHub Actions (100% Free, No Account Needed)

### Step 1: Push to GitHub

```bash
# If you haven't initialized git yet:
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/cashiee.git
git push -u origin main
```

### Step 2: Trigger Build

1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/cashiee`
2. Click **"Actions"** tab at the top
3. Click **"Build APK (Free - No EAS)"** in the left sidebar
4. Click **"Run workflow"** button (top right)
5. Click the green **"Run workflow"** button in the dropdown
6. Wait 5-10 minutes ⏱️

### Step 3: Download APK

1. Click on the completed workflow run (green checkmark ✅)
2. Scroll down to **"Artifacts"** section
3. Click **"cashiee-release-apk"** to download
4. Unzip the downloaded file
5. You'll get `app-release.apk` 🎉

### Step 4: Install on Phone

**Option A: USB Cable**
```bash
adb install app-release.apk
```

**Option B: Manual Install**
1. Copy `app-release.apk` to your phone
2. Open file manager on phone
3. Tap the APK file
4. Enable "Install from unknown sources" if asked
5. Tap "Install"
6. Done! 🎉

---

## 🚀 METHOD 2: EAS Build (30 Free Builds/Month)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

**Don't have an account?**
- Go to https://expo.dev
- Click "Sign Up"
- Create FREE account
- Come back and run `eas login`

### Step 3: Configure EAS (First Time Only)

```bash
eas build:configure
```

This creates `eas.json` file.

### Step 4: Build APK

```bash
eas build --platform android --profile production
```

**What happens:**
1. 📤 Uploads your code to Expo servers
2. 🏗️ Builds APK in the cloud (10-20 minutes)
3. 📧 Sends you email when done
4. 📥 Provides download link

### Step 5: Download APK

**Option A: From Terminal**
```bash
eas build:download --platform android
```

**Option B: From Website**
1. Go to https://expo.dev/accounts/YOUR_USERNAME/projects/cashiee/builds
2. Click on latest build
3. Click "Download" button
4. Get `build-xxxxx.apk`

**Option C: From Email**
- Check your email
- Click download link
- Get APK directly

### Step 6: Install on Phone

Same as Method 1 Step 4 above.

---

## 📊 Comparison

| Feature | GitHub Actions | EAS Build |
|---------|----------------|-----------|
| **Cost** | 100% FREE | FREE (30/month) |
| **Account** | GitHub (you probably have) | Expo (free signup) |
| **Build Time** | 5-10 minutes | 10-20 minutes |
| **Setup** | Already done! | 2 commands |
| **Builds/Month** | Unlimited | 30 free |
| **Download** | From GitHub Actions | From Expo website/email |

---

## 🎯 Quick Start Commands

### GitHub Actions:
```bash
git add .
git commit -m "Ready to build"
git push
# Then go to GitHub → Actions → Run workflow
```

### EAS Build:
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

---

## 🔥 Which Should You Use?

**Use GitHub Actions if:**
- ✅ You already use GitHub
- ✅ You want unlimited free builds
- ✅ You don't want another account

**Use EAS Build if:**
- ✅ You want the easiest setup
- ✅ You're okay with 30 builds/month
- ✅ You want email notifications

**My recommendation: Try GitHub Actions first!**

---

## 📱 Installing APK on Your Phone

### Android Phone:

1. **Enable Unknown Sources:**
   - Settings → Security → Unknown Sources → Enable
   - Or: Settings → Apps → Special Access → Install Unknown Apps → Enable for your file manager

2. **Transfer APK:**
   - USB cable: Copy to phone storage
   - Cloud: Upload to Google Drive, download on phone
   - Email: Email to yourself, download on phone

3. **Install:**
   - Open file manager
   - Navigate to APK file
   - Tap to install
   - Tap "Install" button
   - Tap "Open" when done

### Via ADB (Developer):
```bash
# Make sure phone is connected via USB with USB debugging enabled
adb devices
adb install app-release.apk
```

---

## 🐛 Troubleshooting

### GitHub Actions Build Fails:
- Check the Actions log for errors
- Make sure all files are committed
- Try running `npx expo prebuild --clean` locally first

### EAS Build Fails:
- Run `eas build:list` to see error
- Check your Expo account has free builds left
- Try `eas build --platform android --profile preview` for faster build

### APK Won't Install:
- Enable "Install from unknown sources"
- Make sure you downloaded the APK (not the zip)
- Try different file manager app
- Check phone has enough storage

### "App not installed" error:
- Uninstall any existing version first
- Make sure APK is not corrupted (re-download)
- Check Android version compatibility

---

## 📞 Need Help?

**GitHub Actions not working?**
- Check Actions tab for error logs
- Make sure repo is public or you have Actions enabled

**EAS Build not working?**
- Run `eas whoami` to check login
- Run `eas build:list` to see builds
- Check https://expo.dev for build status

---

## 🎉 Summary

**Fastest way to get APK:**

1. **GitHub Actions:**
   ```bash
   git push
   # Go to GitHub → Actions → Run workflow → Download artifact
   ```

2. **EAS Build:**
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform android --profile production
   eas build:download
   ```

**Both are FREE! Pick one and get your APK in 10-20 minutes!** 🚀
