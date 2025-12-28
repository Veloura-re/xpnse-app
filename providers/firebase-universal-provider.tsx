import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

// Conditional imports based on platform
let auth: any;

if (Platform.OS === 'web') {
  // Web Firebase
  auth = require('@/config/firebase').auth;
} else {
  // Native Firebase
  auth = require('@react-native-firebase/auth').default();
}

interface FirebaseContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any; data: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<{ error: any }>;
}

export const [FirebaseUniversalProvider, useFirebaseUniversal] = createContextHook((): FirebaseContextType => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: any;
    
    if (Platform.OS === 'web') {
      // Web Firebase listener
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setIsLoading(false);
      });
    } else {
      // React Native Firebase listener
      unsubscribe = auth.onAuthStateChanged((user: FirebaseUser | null) => {
        setUser(user);
        setIsLoading(false);
      });
    }

    return unsubscribe;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    if (!email?.trim() || !password?.trim()) {
      return { data: null, error: { message: 'Email and password are required' } };
    }
    
    try {
      let userCredential;
      
      if (Platform.OS === 'web') {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName?.trim() && userCredential.user) {
          await updateProfile(userCredential.user, { displayName: displayName.trim() });
        }
      } else {
        userCredential = await auth.createUserWithEmailAndPassword(email.trim(), password);
        if (displayName?.trim() && userCredential.user) {
          await userCredential.user.updateProfile({ displayName: displayName.trim() });
        }
      }
      
      return { data: { user: userCredential.user }, error: null };
    } catch (err: any) {
      let errorMessage = err.message || 'Network error. Check your connection.';
      
      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 8 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
      }
      
      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email?.trim() || !password?.trim()) {
      return { data: null, error: { message: 'Email and password are required' } };
    }
    
    try {
      let userCredential;
      
      if (Platform.OS === 'web') {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        userCredential = await auth.signInWithEmailAndPassword(email.trim(), password);
      }
      
      return { data: { user: userCredential.user }, error: null };
    } catch (err: any) {
      let errorMessage = err.message || 'Network error. Check your connection.';
      
      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
      }
      
      return { data: null, error: { message: errorMessage } };
    }
  }, []);


  const signOutUser = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        await signOut(auth);
      } else {
        await auth.signOut();
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Sign out failed' } };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!email?.trim()) {
      return { error: { message: 'Email is required' } };
    }
    
    try {
      if (Platform.OS === 'web') {
        await sendPasswordResetEmail(auth, email.trim());
      } else {
        await auth.sendPasswordResetEmail(email.trim());
      }
      return { error: null };
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to send reset email';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
      }
      
      return { error: { message: errorMessage } };
    }
  }, []);

  const updateUserProfile = useCallback(async (updates: { displayName?: string; photoURL?: string }) => {
    if (!user) {
      return { error: { message: 'No user logged in' } };
    }
    
    try {
      if (Platform.OS === 'web') {
        await updateProfile(user, updates);
      } else {
        await user.updateProfile(updates);
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Failed to update profile' } };
    }
  }, [user]);

  return useMemo(() => ({
    user,
    isLoading,
    signUp,
    signIn,
    signOut: signOutUser,
    resetPassword,
    updateUserProfile,
  }), [user, isLoading, signUp, signIn, signOutUser, resetPassword, updateUserProfile]);
});