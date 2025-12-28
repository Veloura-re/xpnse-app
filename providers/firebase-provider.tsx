import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser as firebaseDeleteUser,
  sendEmailVerification,
  reload,
  UserCredential,
  AuthError,
  User as AuthUser,
  updatePhoneNumber,
  updateProfile,
  UserProfile,
  UserMetadata,
  MultiFactorUser,
  confirmPasswordReset as firebaseConfirmPasswordReset,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayRemove, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth, firebaseInitialized, firebaseError } from '@/config/firebase';
import { User, Profile, UserRole } from '@/types';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { ActionCodeSettings } from 'firebase/auth';

interface FirebaseContextType {
  // Auth state
  user: User | null;
  isLoading: boolean;

  // Authentication - Unified return type
  signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<{ data: User | null; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: User | null; error: any }>;
  signOut: () => Promise<{ data: null; error: any }>;
  resetPassword: (email: string) => Promise<{ data: null; error: any }>;
  confirmPasswordReset: (oobCode: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<{ data: null; error: any }>;

  // User management - Unified return type
  reloadCurrentUser: () => Promise<{ data: User | null; error: any }>;
  updateUserProfile: (updates: Partial<Profile>) => Promise<{ data: User | null; error: any }>;
  updateEmail: (newEmail: string) => Promise<{ data: User | null; error: any }>;
  updatePassword: (newPassword: string) => Promise<{ data: User | null; error: any }>;
  reauthenticate: (password: string) => Promise<{ data: boolean; error: any }>;
  deleteUser: () => Promise<{ data: boolean; error: any }>;
  getCurrentUser: () => User | null;

  // Profile management
  updateUserProfileData: (userId: string, updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  getUserProfile: (userId: string) => Promise<{ data: Profile | null; error: any }>;

  // Deprecated (kept for backward compatibility)
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<{ error: any }>;
}

// Helper function to map Firebase user to our User type
const mapFirebaseUser = async (firebaseUser: FirebaseUser | null): Promise<User | null> => {
  if (!firebaseUser) return null;

  // Check if Firebase is initialized before accessing db
  if (!firebaseInitialized || !db) {
    console.warn('⚠️ Firebase not initialized - returning basic user info');
    // Return basic user info without Firestore data
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      emailVerified: firebaseUser.emailVerified,
      isAnonymous: firebaseUser.isAnonymous,
      phoneNumber: firebaseUser.phoneNumber || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      displayName: firebaseUser.displayName || undefined,
      disabled: false,
      metadata: {
        creationTime: firebaseUser.metadata.creationTime || undefined,
        lastSignInTime: firebaseUser.metadata.lastSignInTime || undefined,
      },
      providerData: firebaseUser.providerData.map(provider => ({
        uid: provider.uid,
        displayName: provider.displayName || undefined,
        email: provider.email || undefined,
        photoURL: provider.photoURL || undefined,
        providerId: provider.providerId,
      })),
      profile: {
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        displayName: firebaseUser.displayName || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        photoURL: firebaseUser.photoURL || '',
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      id: firebaseUser.uid,
      name: firebaseUser.displayName || '',
      phone: firebaseUser.phoneNumber || '',
      avatar: firebaseUser.photoURL || '',
    };
  }

  try {
    // Get the user's profile data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    const profileData = userDoc.exists() ? (userDoc.data() as Profile) : null;

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      emailVerified: firebaseUser.emailVerified,
      isAnonymous: firebaseUser.isAnonymous,
      phoneNumber: firebaseUser.phoneNumber || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      displayName: firebaseUser.displayName || undefined,
      disabled: false, // Not directly available in Firebase v9+
      metadata: {
        creationTime: firebaseUser.metadata.creationTime || undefined,
        lastSignInTime: firebaseUser.metadata.lastSignInTime || undefined,
      },
      providerData: firebaseUser.providerData.map(provider => ({
        uid: provider.uid,
        displayName: provider.displayName || undefined,
        email: provider.email || undefined,
        photoURL: provider.photoURL || undefined,
        providerId: provider.providerId,
      })),
      profile: profileData || {
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        displayName: firebaseUser.displayName || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        photoURL: firebaseUser.photoURL || '',
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Backward compatibility
      id: firebaseUser.uid,
      name: firebaseUser.displayName || '',
      phone: profileData?.phoneNumber || firebaseUser.phoneNumber || '',
      avatar: firebaseUser.photoURL || '',
    };
  } catch (error) {
    console.error('Error mapping Firebase user:', error);
    return null;
  }
};

/**
 * Get action code settings for email verification and password reset
 * This configures where users are redirected after clicking email links
 */
const getActionCodeSettings = (): ActionCodeSettings | undefined => {
  try {
    // For web, use the current URL or a default
    if (Platform.OS === 'web') {
      // Type-safe check for window in web environment
      const hasWindow = typeof globalThis !== 'undefined' && 'location' in globalThis;
      const url = hasWindow
        ? (globalThis as any).location.origin
        : 'http://localhost:8081';
      return {
        url: url,
        handleCodeInApp: true,
      };
    }

    // For mobile, we don't set actionCodeSettings to avoid domain allowlist issues
    // Firebase will send a basic email with a web link that works on any device
    return undefined;
  } catch (error) {
    console.warn('Could not generate action code settings:', error);
    return undefined;
  }
};

export const [FirebaseProvider, useFirebase] = createContextHook((): FirebaseContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not initialized, set loading to false immediately
    if (!firebaseInitialized || !auth) {
      console.warn('⚠️ Firebase not initialized - auth features disabled');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      try {
        const mappedUser = firebaseUser ? await mapFirebaseUser(firebaseUser) : null;

        if (isMounted) {
          setUser(mappedUser);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error mapping Firebase user:', error);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, profileData: Partial<Profile> = {}) => {
    if (!firebaseInitialized || !auth || !db) {
      return {
        data: null,
        error: {
          code: 'firebase/not-initialized',
          message: 'Firebase is not configured. Please check your environment variables.'
        }
      };
    }

    if (!email?.trim() || !password?.trim()) {
      return {
        data: null,
        error: {
          code: 'auth/missing-credentials',
          message: 'Email and password are required'
        }
      };
    }

    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Create user profile in Firestore
      const userProfile: Profile = {
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        displayName: profileData.displayName || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || email.split('@')[0],
        phoneNumber: profileData.phoneNumber || '',
        photoURL: profileData.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...profileData,
      };

      // Update Firebase auth profile
      await updateProfile(firebaseUser, {
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || undefined,
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userProfile,
        email: firebaseUser.email?.toLowerCase() || email.trim().toLowerCase(), // Normalize email to lowercase
        uid: firebaseUser.uid, // Store uid for reference
      });

      // Map the Firebase user to our User type
      const user = await mapFirebaseUser(firebaseUser);

      // Explicitly set user state to ensure immediate update with correct profile
      if (user) {
        setUser(user);
      }

      // Send verification email
      try {
        const actionCodeSettings = getActionCodeSettings();
        if (actionCodeSettings) {
          await sendEmailVerification(firebaseUser, actionCodeSettings);
        } else {
          // Fallback if no settings generated (e.g. mobile)
          await sendEmailVerification(firebaseUser);
        }
      } catch (e: any) {
        console.warn('⚠️ Failed to send verification email with settings, trying fallback...');
        console.warn('   Error:', e?.code, e?.message);

        try {
          // Fallback: Try sending without actionCodeSettings
          await sendEmailVerification(firebaseUser);
        } catch (fallbackError: any) {
          console.error('❌ Failed to send verification email (fallback failed)');
          console.error('   Error code:', fallbackError?.code);
          console.error('   Error message:', fallbackError?.message);
          // Don't fail signup if verification email fails, but log it clearly
        }
      }

      return { data: user, error: null };
    } catch (err: any) {
      console.error('❌ Sign up error:', err.code, err.message);
      let errorMessage = err.message || 'Network error. Check your connection.';

      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/Password registration is not enabled. Please enable it in Firebase Console under Authentication > Sign-in method.';
          console.error('⚠️  FIREBASE SETUP REQUIRED: Enable Email/Password authentication in Firebase Console');
          console.error('   Go to: https://console.firebase.google.com/project/uabll-d1bdc/authentication/providers');
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
      }

      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseInitialized || !auth) {
      return {
        data: null,
        error: {
          code: 'firebase/not-initialized',
          message: 'Firebase is not configured. Please check your environment variables.'
        }
      };
    }

    if (!email?.trim() || !password?.trim()) {
      return {
        data: null,
        error: {
          code: 'auth/missing-credentials',
          message: 'Email and password are required'
        }
      };
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      const mappedUser = await mapFirebaseUser(user);

      // Explicitly set user state
      if (mappedUser) {
        setUser(mappedUser);
      }

      return { data: mappedUser, error: null };
    } catch (error: any) {
      console.error('❌ Sign in error:', error.code, error.message);
      let message = 'Failed to sign in. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/invalid-credential':
        case 'auth/invalid-email':
          message = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/Password sign-in is not enabled. Please enable it in Firebase Console under Authentication > Sign-in method.';
          console.error('⚠️  FIREBASE SETUP REQUIRED: Enable Email/Password authentication in Firebase Console');
          console.error('   Go to: https://console.firebase.google.com/project/uabll-d1bdc/authentication/providers');
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
      }

      return {
        data: null,
        error: {
          ...error,
          message
        }
      };
    }
  }, []);


  const signOut = useCallback(async () => {
    if (!firebaseInitialized || !auth) {
      return { data: null, error: { message: 'Firebase is not configured' } };
    }
    try {
      await firebaseSignOut(auth);
      return { data: null, error: null };
    } catch (error: any) {
      console.error('Error signing out:', error);
      return { data: null, error };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!firebaseInitialized || !auth) {
      return { data: null, error: { message: 'Firebase is not configured' } };
    }
    if (!email?.trim()) {
      return { data: null, error: { message: 'Email is required' } };
    }

    try {
      const actionCodeSettings = getActionCodeSettings();

      if (actionCodeSettings) {
        try {
          await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
          return { data: null, error: null };
        } catch (primaryError: any) {
          console.warn('⚠️ Failed to send reset email with settings, trying fallback...', primaryError.code);
          throw primaryError; // Throw to catch block below for fallback
        }
      } else {
        // No settings (mobile), send basic
        await sendPasswordResetEmail(auth, email.trim());
        return { data: null, error: null };
      }
    } catch (err: any) {
      // If the error was from the primary attempt, try fallback
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { data: null, error: null };
      } catch (fallbackErr: any) {
        console.error('❌ Failed to send password reset email (both attempts)');
        console.error('   Error code:', fallbackErr?.code);
        console.error('   Error message:', fallbackErr?.message);

        let errorMessage = fallbackErr.message || 'Failed to send reset email';

        switch (fallbackErr.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/missing-continue-uri':
          case 'auth/invalid-continue-uri':
          case 'auth/unauthorized-continue-uri':
            console.warn('⚠️ Continue URI issue - check Firebase Console authorized domains');
            errorMessage = 'Email configuration error. Please contact support.';
            break;
        }

        return { data: null, error: { message: errorMessage } };
      }
    }
  }, []);

  const confirmPasswordReset = useCallback(async (oobCode: string, newPassword: string) => {
    if (!firebaseInitialized || !auth) {
      return { success: false, error: 'Firebase is not configured' };
    }
    try {
      await firebaseConfirmPasswordReset(auth, oobCode, newPassword);
      return { success: true };
    } catch (error: any) {
      console.error('Error confirming password reset:', error);
      let errorMessage = error.message || 'Failed to reset password';

      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'The password reset link has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'The password reset link is invalid. It may have already been used.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }

      return { success: false, error: errorMessage };
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!firebaseInitialized || !auth) {
      return { data: null, error: { message: 'Firebase is not configured' } };
    }
    try {
      if (!auth.currentUser) return { data: null, error: { message: 'No user logged in' } };

      // Send verification email
      const actionCodeSettings = getActionCodeSettings();

      try {
        if (actionCodeSettings) {
          await sendEmailVerification(auth.currentUser, actionCodeSettings);
        } else {
          await sendEmailVerification(auth.currentUser);
        }
        return { data: null, error: null };
      } catch (primaryError: any) {
        console.warn('⚠️ Failed to resend with settings, trying fallback...', primaryError.code);

        // Fallback attempt
        try {
          await sendEmailVerification(auth.currentUser);
          return { data: null, error: null };
        } catch (fallbackErr: any) {
          throw fallbackErr; // Throw to outer catch for error formatting
        }
      }
    } catch (err: any) {
      console.error('❌ Resend verification failed');
      console.error('   Error code:', err?.code);
      console.error('   Error message:', err?.message);

      let errorMessage = err.message || 'Failed to send verification email';

      // Handle specific error codes
      if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/invalid-continue-uri' || err.code === 'auth/unauthorized-continue-uri' || err.code === 'auth/missing-continue-uri') {
        console.warn('⚠️ Continue URI issue - check Firebase Console authorized domains');
        errorMessage = 'Email verification configuration error. Please contact support.';
      }

      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const reloadCurrentUser = useCallback(async () => {
    if (!firebaseInitialized || !auth) {
      return { data: null, error: { message: 'Firebase is not configured' } };
    }
    try {
      if (!auth.currentUser) {
        return { data: null, error: { message: 'No user logged in' } };
      }

      await reload(auth.currentUser);
      const mappedUser = await mapFirebaseUser(auth.currentUser);
      setUser(mappedUser);

      return { data: mappedUser, error: null };
    } catch (error: any) {
      console.error('Error reloading user:', error);
      return { data: null, error };
    }
  }, []);

  // Update user profile in Firestore
  const updateUserProfileData = useCallback(async (userId: string, updates: Partial<Profile>) => {
    if (!firebaseInitialized || !db) {
      return { success: false, error: 'Firebase is not configured' };
    }
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      // Update local user state
      setUser(prev => ({
        ...prev!,
        profile: {
          ...prev?.profile!,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Get user profile from Firestore
  const getUserProfile = useCallback(async (userId: string) => {
    if (!firebaseInitialized || !db) {
      return { data: null, error: 'Firebase is not configured' };
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { data: userDoc.data() as Profile, error: null };
      }
      return { data: null, error: 'Profile not found' };
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      return { data: null, error: error.message };
    }
  }, []);

  // Update user profile (both auth and Firestore)
  const updateUserProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!firebaseInitialized || !auth || !db) {
      return { data: null, error: { message: 'Firebase is not configured' } };
    }
    if (!auth.currentUser || !user) {
      return { data: null, error: { message: 'No user logged in' } };
    }

    try {
      // Update Firebase auth profile - filter out empty values
      const authUpdates: { displayName?: string; photoURL?: string } = {};

      if (updates.displayName && updates.displayName.trim()) {
        authUpdates.displayName = updates.displayName;
      }
      if (updates.photoURL && updates.photoURL.trim()) {
        authUpdates.photoURL = updates.photoURL;
      }

      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }

      // Update Firestore profile
      await updateUserProfileData(user.uid, updates);

      // Sync updates to businesses where user is a member
      try {
        const businessesRef = collection(db, 'businesses');
        const q = query(businessesRef, where('memberIds', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const batch = writeBatch(db);
          let batchCount = 0;

          querySnapshot.forEach((docSnapshot) => {
            const businessData = docSnapshot.data();
            const members = businessData.members || [];
            const memberIndex = members.findIndex((m: any) => m.userId === user.uid);

            if (memberIndex !== -1) {
              const updatedMembers = [...members];

              // Construct the updated user object for the member
              // We need to be careful to preserve existing fields and only update what changed
              const currentUserInMember = updatedMembers[memberIndex].user || {};

              updatedMembers[memberIndex] = {
                ...updatedMembers[memberIndex],
                user: {
                  ...currentUserInMember,
                  ...updates,
                  // Ensure specific fields are updated if present in updates
                  displayName: updates.displayName || currentUserInMember.displayName || currentUserInMember.name,
                  photoURL: updates.photoURL !== undefined ? updates.photoURL : currentUserInMember.photoURL,
                  // Also update flattened fields if they exist on the user object (backward compatibility)
                  name: updates.displayName || currentUserInMember.name || currentUserInMember.displayName,
                  avatar: updates.photoURL !== undefined ? updates.photoURL : currentUserInMember.avatar,
                }
              };

              batch.update(docSnapshot.ref, { members: updatedMembers });
              batchCount++;
            }
          });

          if (batchCount > 0) {
            await batch.commit();
            console.log(`✅ Synced profile updates to ${batchCount} businesses`);
          }
        }
      } catch (syncError) {
        console.error('⚠️ Failed to sync profile updates to businesses:', syncError);
        // We don't throw here because the primary profile update succeeded
      }

      // Force a reload to update the user object
      const result = await reloadCurrentUser();

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  }, [user, reloadCurrentUser, updateUserProfileData]);

  const updateEmail = useCallback(async (newEmail: string) => {
    if (!firebaseInitialized || !auth) {
      return { data: null, error: 'Firebase is not configured' };
    }
    if (!auth.currentUser) {
      return { data: null, error: 'No user is signed in' };
    }

    if (!newEmail?.trim()) {
      return { data: null, error: 'Email is required' };
    }

    try {
      await firebaseUpdateEmail(auth.currentUser, newEmail.trim());

      // Reload to get updated user
      const result = await reloadCurrentUser();

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error updating email:', error);
      let message = 'Failed to update email';

      if (error.code === 'auth/requires-recent-login') {
        message = 'Please re-authenticate to update your email';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already in use by another account';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address';
      }

      return {
        data: null,
        error: message
      };
    }
  }, [reloadCurrentUser]);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!firebaseInitialized || !auth) {
      return { data: null, error: 'Firebase is not configured' };
    }
    if (!auth.currentUser) {
      return { data: null, error: 'No user is signed in' };
    }

    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      return { data: user, error: null };
    } catch (error: any) {
      console.error('Error updating password:', error);
      return {
        data: null,
        error: error.message || 'Failed to update password'
      };
    }
  }, [user]);

  const reauthenticate = useCallback(async (password: string) => {
    if (!firebaseInitialized || !auth) {
      return { data: false, error: 'Firebase is not configured' };
    }
    if (!auth.currentUser || !auth.currentUser.email) {
      return { data: false, error: 'No user is signed in' };
    }

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return { data: true, error: null };
    } catch (error: any) {
      console.error('Error reauthenticating:', error);
      return {
        data: false,
        error: error.message || 'Authentication failed. Please check your password.'
      };
    }
  }, []);

  const deleteUser = useCallback(async () => {
    if (!firebaseInitialized || !auth || !db) {
      return { data: false, error: 'Firebase is not configured' };
    }
    if (!auth.currentUser) {
      return { data: false, error: 'No user is signed in' };
    }

    const userId = auth.currentUser.uid;

    try {
      // 1. Remove user from all businesses
      const businessesRef = collection(db, 'businesses');
      const q = query(businessesRef, where('memberIds', 'array-contains', userId));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      let batchCount = 0;

      querySnapshot.forEach((docSnapshot) => {
        const businessData = docSnapshot.data();
        const members = businessData.members || [];
        const updatedMembers = members.filter((m: any) => m.userId !== userId);

        // Also remove from memberIds
        const memberIds = businessData.memberIds || [];
        const updatedMemberIds = memberIds.filter((id: string) => id !== userId);

        batch.update(docSnapshot.ref, {
          members: updatedMembers,
          memberIds: updatedMemberIds
        });
        batchCount++;
      });

      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Removed user from ${batchCount} businesses`);
      }

      // 2. Delete user document
      await deleteDoc(doc(db, 'users', userId));
      console.log('✅ Deleted user profile document');

      // 3. Delete Auth user
      await firebaseDeleteUser(auth.currentUser);
      console.log('✅ Deleted Firebase Auth user');

      return { data: true, error: null };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return {
        data: false,
        error: error.message || 'Failed to delete account'
      };
    }
  }, []);

  const getCurrentUser = useCallback(() => user, [user]);

  return useMemo(() => ({
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    confirmPasswordReset,
    resendVerificationEmail,
    reloadCurrentUser,
    updateUserProfile,
    updateEmail,
    updatePassword,
    reauthenticate,
    deleteUser,
    getCurrentUser,
    updateUserProfileData,
    getUserProfile,
    updateProfile: updateUserProfile, // Alias for backward compatibility
  }), [
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    confirmPasswordReset,
    resendVerificationEmail,
    reloadCurrentUser,
    updateUserProfile,
    updateEmail,
    updatePassword,
    reauthenticate,
    deleteUser,
    getCurrentUser,
    updateUserProfileData,
    getUserProfile,
  ]);
});
