import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration - Read from process.env (dev) or Constants.expoConfig.extra (production builds)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || Constants.expoConfig?.extra?.firebaseAppId,
};

// Validate Firebase configuration
const missingKeys = [];
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') missingKeys.push('EXPO_PUBLIC_FIREBASE_API_KEY');
if (!firebaseConfig.authDomain || firebaseConfig.authDomain === 'undefined') missingKeys.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
if (!firebaseConfig.projectId || firebaseConfig.projectId === 'undefined') missingKeys.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');

console.log('\n🔥 Firebase Configuration Status:');
if (missingKeys.length > 0) {
  console.warn('⚠️ CONFIGURATION WARNING!');
  console.warn('Missing variables:', missingKeys.join(', '));
  console.warn('App will run but Firebase features will be disabled.');
  console.warn('\n📝 TO FIX:');
  console.warn('1. Make sure .env file exists in project root');
  console.warn('2. Add these lines to .env:');
  console.warn('   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here');
  console.warn('   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=cashiee.firebaseapp.com');
  console.warn('   EXPO_PUBLIC_FIREBASE_PROJECT_ID=cashiee');
  console.warn('   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=cashiee.firebasestorage.app');
  console.warn('   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id');
  console.warn('   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id');
  console.warn('3. Restart dev server: npm start\n');
} else {
  console.log('✅ All credentials loaded');
  console.log('\n📋 Next Steps:');
  console.log('1. Enable Email/Password in Firebase Console');
  console.log('   → https://console.firebase.google.com/project/cashiee/authentication/providers');
  console.log('2. Try signing up in the app');
  console.log('3. Check terminal for error messages\n');
}

// Initialize Firebase - non-blocking, returns null on failure
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitialized = false;
let firebaseError: Error | null = null;

try {
  if (missingKeys.length === 0) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    // Initialize Auth - Firebase handles persistence automatically per platform
    // Initialize Auth with platform-specific persistence
    if (Platform.OS === 'web') {
      // For web, use default persistence (indexedDB)
      auth = getAuth(app);
      console.log('✅ Firebase Auth initialized for web');
    } else {
      // For React Native (iOS/Android), use AsyncStorage persistence
      try {
        const { initializeAuth, getReactNativePersistence } = require('firebase/auth');

        // Try to initialize auth with AsyncStorage persistence
        try {
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
          console.log('✅ Firebase Auth initialized with AsyncStorage persistence');
          console.log('   Users will stay logged in after app restarts');
        } catch (initError: any) {
          // If auth is already initialized, get the existing instance
          if (initError?.code === 'auth/already-initialized') {
            console.log('ℹ️  Auth already initialized, using existing instance');
            auth = getAuth(app);
          } else {
            throw initError;
          }
        }
      } catch (error: any) {
        console.error('❌ Failed to setup AsyncStorage persistence:', error);
        console.error('   Falling back to default auth (users will be logged out on app restart)');
        auth = getAuth(app);
      }
    }

    db = getFirestore(app);
    storage = getStorage(app);
    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Skipping Firebase initialization due to missing config');
  }
} catch (error: any) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('Error details:', error.message || error);
  firebaseError = error as Error;
  // Don't throw - allow app to continue without Firebase
  // Set to null so providers can check and handle gracefully
  app = null;
  auth = null;
  db = null;
  storage = null;
}

// Export with null checks - providers should check if these are null before using
export { auth, db, storage, app };
export { firebaseInitialized, firebaseError };
export default app;
