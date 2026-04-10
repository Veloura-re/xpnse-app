# Firestore Setup Guide for Cashiee Project

## Current Issue
You're seeing 400 errors from Firestore:
```
firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel ... 400 (Bad Request)
firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel ... 400 (Bad Request)
```

This means Firestore is either:
1. Not enabled in your Firebase project
2. Has restrictive security rules blocking access

## Solution Steps

### Step 1: Enable Firestore Database

1. Go to Firebase Console: https://console.firebase.google.com/project/cashiee/firestore
2. Click **"Create database"** if you haven't already
3. Choose **"Start in test mode"** (for development) or **"Start in production mode"**
4. Select a location (choose one closest to your users)
5. Click **"Enable"**

### Step 2: Update Firestore Security Rules

After enabling Firestore, update the security rules:

1. Go to: https://console.firebase.google.com/project/cashiee/firestore/rules
2. Replace the existing rules with these **development-friendly rules**:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // For development: Allow all reads/writes (REMOVE IN PRODUCTION!)
    // Uncomment these lines if you want to test without restrictions:
    // match /{document=**} {
    //   allow read, write: if true;
    // }
  }
}
```

3. Click **"Publish"**

### Step 3: Production-Ready Security Rules (Use Later)

When you're ready for production, use these stricter rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update, delete: if isOwner(userId);
    }
    
    // User-specific collections (transactions, budgets, etc.)
    match /users/{userId}/transactions/{transactionId} {
      allow read, write: if isOwner(userId);
    }
    
    match /users/{userId}/budgets/{budgetId} {
      allow read, write: if isOwner(userId);
    }
    
    match /users/{userId}/categories/{categoryId} {
      allow read, write: if isOwner(userId);
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4: Verify Setup

After completing the above steps:

1. **Restart your dev server**: Stop and run `npx expo start -c`
2. **Clear browser cache** or open in incognito mode
3. **Try signing in again**

The Firestore errors should be resolved!

## Quick Test Mode (For Development Only)

If you want to quickly test without authentication restrictions:

1. Go to Firestore Rules
2. Use these **temporary test rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **WARNING**: These rules allow anyone to read/write your database. Only use for testing and replace with proper rules before going to production!

## Troubleshooting

### Still getting 400 errors?

1. **Check if Firestore is enabled**: Visit https://console.firebase.google.com/project/cashiee/firestore
2. **Verify your API key**: Make sure `.env` has the correct credentials
3. **Check browser console**: Look for more specific error messages
4. **Try in incognito mode**: Sometimes cached credentials cause issues

### Authentication works but Firestore doesn't?

This usually means:
- Firestore is not enabled, OR
- Security rules are too restrictive

Follow Steps 1 and 2 above to fix this.

## Current Status

✅ **Authentication**: Working (sign up and sign in successful)
❌ **Firestore**: Not working (400 errors)

After following this guide, both should work perfectly!
