# 🔥 Fix Authentication - Step by Step

## ⚠️ Most Likely Issue: Email/Password Not Enabled

Your Firebase credentials are correct, but **Email/Password authentication is probably not enabled** in your Firebase Console.

---

## ✅ Step 1: Enable Email/Password in Firebase Console

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/project/uabll-d1bdc/authentication/providers
   ```

2. **Click on "Email/Password" provider**

3. **Toggle "Enable"** switch to ON

4. **Click "Save"**

---

## 🧪 Step 2: Test Authentication

### Test Registration:
1. Open your app
2. Go to Sign Up screen
3. Enter a test email (e.g., `test@example.com`)
4. Enter a password (at least 6 characters)
5. Click "Create Account"

### Check Console Logs:
Look for these messages in your terminal:

**✅ Success:**
```
✅ Firebase Configuration Loaded
Project ID: uabll-d1bdc
📝 Attempting sign up for: test@example.com
✅ Sign up successful for: test@example.com
```

**❌ Error (Email/Password not enabled):**
```
❌ Sign up error: auth/operation-not-allowed
⚠️  FIREBASE SETUP REQUIRED: Enable Email/Password authentication
```

**❌ Error (Network issue):**
```
❌ Sign up error: auth/network-request-failed
Network error. Please check your internet connection.
```

---

## 🔍 Step 3: Verify Users in Firebase

After successful registration:

1. Go to: https://console.firebase.google.com/project/uabll-d1bdc/authentication/users
2. You should see your registered user
3. Email will show as "Not verified" (this is normal)

---

## 🐛 Common Issues & Fixes

### Issue 1: "operation-not-allowed"
**Fix:** Enable Email/Password in Firebase Console (Step 1 above)

### Issue 2: "network-request-failed"
**Fix:** 
- Check internet connection
- Make sure Firebase project is active
- Verify .env file has correct credentials

### Issue 3: "email-already-in-use"
**Fix:** 
- Use a different email
- OR delete the user in Firebase Console and try again

### Issue 4: "weak-password"
**Fix:** Use at least 6 characters for password

### Issue 5: "invalid-email"
**Fix:** Make sure email format is correct (e.g., user@example.com)

---

## 📋 Checklist

- [ ] .env file exists with Firebase credentials
- [ ] Email/Password enabled in Firebase Console
- [ ] Internet connection working
- [ ] Firebase project is active (not deleted)
- [ ] Dev server running (`npm start`)
- [ ] App connected to dev server

---

## 🚀 After Fixing

Once Email/Password is enabled:
1. Restart your dev server (`npm start`)
2. Try registering a new user
3. Try logging in with that user
4. Check Firebase Console to see the user created

---

## 📱 For APK Testing

If testing on a physical device with APK:
1. Make sure you **rebuilt the APK** after adding Firebase credentials
2. The APK must be built **after** .env file was updated
3. Old APK won't work because it has placeholder credentials

---

## 🆘 Still Not Working?

Run the app and check the terminal output for detailed error messages.
The error codes will tell you exactly what's wrong:

- `auth/operation-not-allowed` → Enable Email/Password in Console
- `auth/network-request-failed` → Check internet connection
- `auth/invalid-credential` → Wrong email or password
- `auth/email-already-in-use` → User already exists
- Missing env vars → Check .env file

---

## 🔗 Quick Links

**Firebase Console:** https://console.firebase.google.com/project/uabll-d1bdc

**Authentication Providers:** https://console.firebase.google.com/project/uabll-d1bdc/authentication/providers

**Users List:** https://console.firebase.google.com/project/uabll-d1bdc/authentication/users

**Firestore Database:** https://console.firebase.google.com/project/uabll-d1bdc/firestore
