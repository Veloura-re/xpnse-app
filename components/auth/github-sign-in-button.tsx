import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  StyleProp,
  ViewStyle,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';
import { authenticateWithGitHub } from '@/services/oauth-service';

WebBrowser.maybeCompleteAuthSession();

export function GitHubLogo({ size = 19, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 98 96">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.34 0-1.144-.043-4.177-.064-8.197-13.587 2.966-16.457-6.602-16.457-6.602-2.222-5.688-5.424-7.2-5.424-7.2-4.436-3.055.336-2.99.336-2.99 4.908.349 7.493 5.074 7.493 5.074 4.364 7.531 11.442 5.356 14.233 4.095.441-3.185 1.706-5.357 3.106-6.589-10.846-1.242-22.25-5.461-22.25-24.316 0-5.372 1.905-9.764 5.034-13.203-.5-1.243-2.181-6.249.48-13.02 0 0 4.103-1.323 13.443 5.042 3.903-1.096 8.088-1.644 12.247-1.663 4.159.019 8.344.567 12.257 1.663 9.33-6.365 13.423-5.042 13.423-5.042 2.671 6.771.99 11.777.49 13.02 3.138 3.439 5.024 7.831 5.024 13.203 0 18.905-11.424 23.06-22.314 24.279 1.758 1.528 3.337 4.542 3.337 9.155 0 6.608-.063 11.94-.063 13.565 0 1.293.878 2.85 3.337 2.339C84.032 89.37 98 70.963 98 49.217 98 22 76.151 0 48.854 0z"
        fill={color}
      />
    </Svg>
  );
}

interface GitHubSignInButtonProps {
  mode?: 'login' | 'register';
  onError?: (error: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GitHubSignInButton({
  mode = 'login',
  onError,
  onSuccess,
  disabled = false,
  style,
}: GitHubSignInButtonProps) {
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (disabled || isLoading) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    setIsLoading(true);

    try {
      const result = await authenticateWithGitHub();

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
      onError?.(err?.message || 'GitHub authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = mode === 'register' ? 'Sign up with GitHub' : 'Continue with GitHub';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';
  const logoColor = isDark ? '#FFFFFF' : '#0F172A';

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
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          <GitHubLogo size={19} color={logoColor} />
          <Text style={[styles.label, { color: textColor }]}>{buttonLabel}</Text>
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
});
