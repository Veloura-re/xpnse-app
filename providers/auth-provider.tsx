import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Profile } from '@/types';
import { useFirebase } from './firebase-provider';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  // Backward-compatible high-level auth actions used by screens
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    profileData?: Partial<Profile>
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  // Low-level actions (kept for internal/advanced use)
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  reauthenticate: (password: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    user: firebaseUser,
    isLoading: firebaseLoading,
    signIn,
    signUp,
    signOut: firebaseSignOut,
    resetPassword: firebaseResetPassword,
    updateEmail: firebaseUpdateEmail,
    updatePassword,
    reauthenticate: firebaseReauthenticate,
    deleteUser: firebaseDeleteUser,
    updateUserProfile: firebaseUpdateProfile,
    updateUserProfileData,
    reloadCurrentUser,
  } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(firebaseLoading);

    if (firebaseUser) {
      // Convert Firebase user to our User type
      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        emailVerified: firebaseUser.emailVerified,
        isAnonymous: firebaseUser.isAnonymous,
        disabled: false,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        displayName: firebaseUser.displayName || undefined,
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
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          phoneNumber: firebaseUser.phoneNumber || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          updatedAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
        },
        // Backward compatibility
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        phone: firebaseUser.phoneNumber || '',
        avatar: firebaseUser.photoURL || '',
      };
      setUser(appUser);
    } else {
      setUser(null);
    }
  }, [firebaseUser, firebaseLoading]);

  const login = useCallback(async (email: string, password: string) => {
    if (!email?.trim() || !password?.trim()) {
      return { success: false, error: 'Email and password are required' };
    }
    const { error } = await signIn(email.trim(), password);
    if (error) {
      return { success: false, error: error.message };
    }
    // Allow login regardless of email verification status; verification can be completed later
    return { success: true };
  }, [signIn]);

  const register = useCallback(async (
    email: string,
    password: string,
    profileData: Partial<Profile> = {
      firstName: '',
      lastName: '',
      displayName: email.split('@')[0] || 'User',
      phoneNumber: '',
      photoURL: '',
    }
  ) => {
    if (!email?.trim() || !password?.trim()) {
      return { success: false, error: 'Email and password are required' };
    }

    const { error } = await signUp(email.trim(), password, {
      ...profileData,
      displayName: profileData.displayName || email.split('@')[0],
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      // Normalize duplicate email errors from Firebase
      if (msg.includes('email-already-in-use') || msg.includes('already exists')) {
        return { success: false, error: 'An account with this email already exists.' };
      }
      if (msg.includes('weak-password')) {
        return { success: false, error: 'Password should be at least 8 characters.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  }, [signUp]);

  const logout = useCallback(async () => {
    await firebaseSignOut();
  }, [firebaseSignOut]);

  // Expose a void-returning signOut wrapper for low-level API compatibility
  const signOut = useCallback(async () => {
    await firebaseSignOut();
  }, [firebaseSignOut]);

  const resetPasswordHandler = useCallback(async (email: string) => {
    if (!email?.trim()) {
      return { success: false, error: 'Email is required' };
    }
    const { error } = await firebaseResetPassword(email.trim());
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, [firebaseResetPassword]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) {
      return { success: false, error: 'No user is signed in' };
    }

    try {
      const profileUpdates: Partial<Profile> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Update Firebase auth profile if display name or photo URL changed
      if (updates.displayName || updates.photoURL) {
        await firebaseUpdateProfile({
          displayName: updates.displayName || user.displayName || user.profile?.displayName,
          photoURL: updates.photoURL || user.photoURL || user.profile?.photoURL,
        });
      }

      // Update Firestore profile using the Firebase provider function
      await updateUserProfileData(user.uid, profileUpdates);

      // Update local state
      setUser(prev => ({
        ...prev!,
        displayName: updates.displayName || prev?.displayName,
        photoURL: updates.photoURL || prev?.photoURL,
        phoneNumber: updates.phoneNumber || prev?.phoneNumber,
        // Backward compatibility fields
        phone: updates.phoneNumber || prev?.phone,
        name: updates.displayName || updates.firstName && updates.lastName
          ? `${updates.firstName} ${updates.lastName}`.trim()
          : prev?.name,
        profile: {
          ...prev?.profile!,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  }, [firebaseUpdateProfile, updateUserProfileData, user]);

  const updateEmailHandler = useCallback(async (newEmail: string) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const result = await firebaseUpdateEmail(newEmail);

      if (result.error) {
        return {
          success: false,
          error: typeof result.error === 'string' ? result.error : result.error.message
        };
      }

      // Update local state
      setUser(prev => ({
        ...prev!,
        email: newEmail,
        emailVerified: false, // Email verification status might change
        profile: {
          ...prev?.profile!,
          updatedAt: new Date().toISOString()
        }
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error updating email:', error);
      return {
        success: false,
        error: error.message || 'Failed to update email',
        code: error.code
      };
    }
  }, [user, firebaseUpdateEmail]);

  const updatePasswordHandler = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // First reauthenticate
      const reauthResult = await firebaseReauthenticate(currentPassword);
      if (reauthResult.error) {
        return { success: false, error: reauthResult.error };
      }

      // Then update password
      const result = await updatePassword(newPassword);
      if (result.error) {
        return { success: false, error: typeof result.error === 'string' ? result.error : result.error.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error updating password:', error);
      return {
        success: false,
        error: error.message || 'Failed to update password'
      };
    }
  }, [user, firebaseReauthenticate, updatePassword]);

  const reauthenticate = useCallback(async (password: string) => {
    if (!user?.email) {
      return { success: false, error: 'No user is signed in' };
    }

    try {
      const result = await firebaseReauthenticate(password);
      if (!result.error) {
        // Update last sign-in time
        setUser(prev => ({
          ...prev!,
          metadata: {
            ...prev?.metadata!,
            lastSignInTime: new Date().toISOString(),
          },
        }));
      }
      return { success: !result.error, error: result.error ? (typeof result.error === 'string' ? result.error : result.error.message) : undefined };
    } catch (error: any) {
      console.error('Reauthentication failed:', error);
      return { success: false, error: error.message || 'Reauthentication failed' };
    }
  }, [user, firebaseReauthenticate]);

  const deleteAccount = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'No user is signed in' };
    }

    try {
      const result = await firebaseDeleteUser();
      if (!result.error && result.data) {
        // Clear local state
        setUser(null);
      }
      return { success: !result.error && !!result.data, error: result.error ? (typeof result.error === 'string' ? result.error : result.error.message) : undefined };
    } catch (error: any) {
      console.error('Error deleting account:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    }
  }, [user, firebaseDeleteUser]);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    try {
      await reloadCurrentUser();
      // After reload, the firebaseUser useEffect dependency should trigger and update the user state state
    } catch (error: any) {
      console.error('Error refreshing user:', error);
    }
  }, [firebaseUser, reloadCurrentUser]);

  const value = useMemo(() => ({
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    signIn,
    signUp,
    signOut,
    resetPassword: resetPasswordHandler,
    updateProfile,
    updateEmail: updateEmailHandler,
    updatePassword: updatePasswordHandler,
    reauthenticate,
    deleteAccount,
    refreshUser,
  }), [
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    signIn,
    signUp,
    signOut,
    resetPasswordHandler,
    updateProfile,
    updateEmailHandler,
    updatePasswordHandler,
    reauthenticate,
    deleteAccount,
    refreshUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
