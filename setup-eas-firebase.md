# Setup EAS Environment Variables

## Your Firebase credentials are ready to be added to EAS!

**Run these commands one by one:**

```powershell
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk" --environment preview --visibility plaintext --non-interactive

eas env:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "cashiee.firebaseapp.com" --environment preview --visibility plaintext --non-interactive

eas env:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "cashiee" --environment preview --visibility plaintext --non-interactive

eas env:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "cashiee.firebasestorage.app" --environment preview --visibility plaintext --non-interactive

eas env:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "572518473431" --environment preview --visibility plaintext --non-interactive

eas env:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:572518473431:android:342a9725a05b2fa48c5a92" --environment preview --visibility plaintext --non-interactive
```

## Or run them all at once:

```powershell
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyD65DFf80JpbowSZQu6w2a6FYGxZnSJSMk" --environment preview --visibility plaintext --non-interactive; eas env:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "cashiee.firebaseapp.com" --environment preview --visibility plaintext --non-interactive; eas env:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "cashiee" --environment preview --visibility plaintext --non-interactive; eas env:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "cashiee.firebasestorage.app" --environment preview --visibility plaintext --non-interactive; eas env:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "572518473431" --environment preview --visibility plaintext --non-interactive; eas env:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:572518473431:android:342a9725a05b2fa48c5a92" --environment preview --visibility plaintext --non-interactive
```

## Then verify:

```powershell
eas env:list --environment preview
```

You should see all 6 variables listed.

## Finally, build your APK:

```powershell
npx eas build --platform android --profile preview
```

---

**Note:** The new EAS project is now linked to your account (@abud21).
- Project: https://expo.dev/accounts/abud21/projects/business-finance-management-app-kkqzwnt
- Project ID: 556b8b1f-04d6-428d-ac17-15b073dd5584
