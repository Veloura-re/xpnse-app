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
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GoogleSignInButton({
  mode = 'login',
  onError,
  onSuccess,
  disabled = false,
  style,
}: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const activeClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '572518473431-okpgc73pdpr29hpd8dp6qpde1gp5fv3q.apps.googleusercontent.com';
  const rawWebClientId = activeClientId;
  const rawIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || activeClientId;
  const rawAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || activeClientId;

  const isConfiguredForNative = true;

  // Provide fallback strings to prevent invariantClientId exceptions at render time
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: activeClientId,
    webClientId: activeClientId,
    iosClientId: rawIosClientId,
    androidClientId: rawAndroidClientId,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleNativeGoogleExchange(idToken);
      } else {
        setIsLoading(false);
        onError?.('Authentication token was not returned by Google.');
      }
    } else if (response.type === 'error') {
      setIsLoading(false);
      onError?.(response.error?.message || 'Google authentication encountered an error.');
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setIsLoading(false);
    }
  }, [response]);

  const handleNativeGoogleExchange = async (idToken: string) => {
    try {
      setIsLoading(true);
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
      } else if (result.error) {
        onError?.(result.error);
      }
    } catch (err: any) {
      onError?.(err?.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (disabled || isLoading) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    setIsLoading(true);

    try {
      if (Platform.OS === 'web') {
        const result = await signInWithGoogle();
        if (result.success) {
          if (onSuccess) {
            onSuccess();
          } else {
            router.replace('/(tabs)');
          }
        } else if (result.error) {
          onError?.(result.error);
        }
      } else {
        if (!isConfiguredForNative) {
          onError?.(
            'Google Sign-In on mobile requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to be configured in your environment.'
          );
          setIsLoading(false);
          return;
        }
        await promptAsync();
      }
    } catch (err: any) {
      onError?.(err?.message || 'Google authentication could not be completed.');
    } finally {
      if (Platform.OS === 'web') {
        setIsLoading(false);
      }
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
