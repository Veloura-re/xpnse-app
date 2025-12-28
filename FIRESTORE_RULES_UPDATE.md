# Firestore Security Rules Update

## Add Notifications Collection Rules

You need to add the following rules to your Firestore security rules to allow the notifications feature to work:

```javascript
// Add this to your firestore.rules file

// Notifications collection
match /notifications/{notificationId} {
  // Users can read their own notifications
  allow read: if request.auth != null && 
                 resource.data.userId == request.auth.uid;
  
  // Users can update their own notifications (mark as read)
  allow update: if request.auth != null && 
                   resource.data.userId == request.auth.uid;
  
  // Only allow creating notifications if the user is authenticated
  // In production, you might want to restrict this to server-side only via Cloud Functions
  allow create: if request.auth != null;
  
  // Users can delete their own notifications
  allow delete: if request.auth != null && 
                   resource.data.userId == request.auth.uid;
}
```

## How to Update

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Rules" tab
4. Add the above rules to your existing rules
5. Click "Publish"

## Note

The permission error you're seeing is because the notification provider is trying to query the notifications collection but the security rules don't allow it yet.
