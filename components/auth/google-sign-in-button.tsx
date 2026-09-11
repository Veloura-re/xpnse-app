import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

// Complete web auth sessions when redirecting back
WebBrowser.maybeCompleteAuthSession();

export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

interface GoogleSignInButtonProps {
  mode?: 'login' | 'register';
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onLoadingChange?: (loading: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GoogleSignInButton({
  mode = 'login',
  onError,
  onSuccess,
  onLoadingChange,
  disabled = false,
  style,
}: GoogleSignInButtonProps) {
  const { signInWithGoogle, setOAuthAuthenticating, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const setButtonLoading = (loading: boolean) => {
    setIsLoading(loading);
    onLoadingChange?.(loading);
    if (loading) {
      setOAuthAuthenticating(true, 'Google');
    }
  };

  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '572518473431-okpgc73pdpr29hpd8dp6qpde1gp5fv3q.apps.googleusercontent.com';
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    '572518473431-3flq50ijubfav2ora252olcdlb46fcnu.apps.googleusercontent.com';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || webClientId;

  const isConfiguredForNative = true;

  // Provide fallback strings to prevent invariantClientId exceptions at render time
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    webClientId: webClientId,
    iosClientId: iosClientId,
    androidClientId: androidClientId,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        setOAuthAuthenticating(true, 'Google');
        setButtonLoading(true);
        handleNativeGoogleExchange(idToken);
      } else {
        setOAuthAuthenticating(false);
        setButtonLoading(false);
        onError?.('Authentication token was not returned by Google.');
      }
    } else if (response.type === 'error') {
      setOAuthAuthenticating(false);
      setButtonLoading(false);
      onError?.(response.error?.message || 'Google authentication encountered an error.');
    } else if (response.type === 'cancel') {
      setOAuthAuthenticating(false);
      setButtonLoading(false);
    } else if (response.type === 'dismiss') {
      // Grace period for token exchange before resetting
      const timer = setTimeout(() => {
        if (!user) {
          setOAuthAuthenticating(false);
          setButtonLoading(false);
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [response, user]);

  const handleNativeGoogleExchange = async (idToken: string) => {
    try {
      setOAuthAuthenticating(true, 'Google');
      setButtonLoading(true);
      const result = await signInWithGoogle(idToken);
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
        }
        if (onSuccess) {
          onSuccess();
        } else {
          router.replace('/(tabs)');
        }
        // Keep loading state active during screen transition to prevent flashing login page
        return;
      } else if (result.error) {
        setOAuthAuthenticating(false);
        setButtonLoading(false);
        onError?.(result.error);
      }
    } catch (err: any) {
      setOAuthAuthenticating(false);
      setButtonLoading(false);
      onError?.(err?.message || 'An unexpected error occurred during Google sign-in.');
    }
  };

  const handlePress = async () => {
    if (disabled || isLoading) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    // Immediately trigger loading overlay so user sees "Signing in with Google..."
    setOAuthAuthenticating(true, 'Google');
    setButtonLoading(true);

    try {
      if (Platform.OS === 'web') {
        const result = await signInWithGoogle();
        if (result.success) {
          if (onSuccess) {
            onSuccess();
          } else {
            router.replace('/(tabs)');
          }
          return;
        } else if (result.error) {
          setOAuthAuthenticating(false);
          setButtonLoading(false);
          onError?.(result.error);
        }
      } else {
        if (!isConfiguredForNative) {
          setOAuthAuthenticating(false);
          setButtonLoading(false);
          onError?.(
            'Google Sign-In on mobile requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to be configured in your environment.'
          );
          return;
        }
        const res = await promptAsync();
        if (res.type === 'success' && res.params?.id_token) {
          await handleNativeGoogleExchange(res.params.id_token);
        } else if (res.type === 'cancel') {
          setOAuthAuthenticating(false);
          setButtonLoading(false);
        } else if (res.type === 'dismiss') {
          // On mobile Android/iOS, dismiss can be triggered when the browser closes after redirecting.
          // Do NOT immediately turn off global loading; allow response hook or safety timeout to finalize.
          setTimeout(() => {
            if (!user) {
              setOAuthAuthenticating(false);
              setButtonLoading(false);
            }
          }, 3500);
        } else if (res.type === 'error') {
          setOAuthAuthenticating(false);
          setButtonLoading(false);
          onError?.(res.error?.message || 'Google sign-in was cancelled or encountered an error.');
        }
      }
    } catch (err: any) {
      setOAuthAuthenticating(false);
      setButtonLoading(false);
      onError?.(err?.message || 'Google authentication could not be completed.');
    }
  };

  const buttonLabel = mode === 'register' ? 'Sign up with Google' : 'Continue with Google';

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.82}
      style={[
        styles.button,
        {
          backgroundColor: isDark ? '#1F1F23' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.2 : 0.03,
          shadowRadius: 6,
          elevation: isDark ? 2 : 1,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isDark ? '#FFFFFF' : '#1F2937'}
          style={styles.indicator}
        />
      ) : (
        <View style={styles.contentRow}>
          <GoogleLogo size={18} />
          <Text style={[styles.label, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
            {buttonLabel}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  indicator: {
    marginVertical: 2,
  },
});
