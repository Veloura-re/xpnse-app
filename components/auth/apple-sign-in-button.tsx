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
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';

export function AppleLogo({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 170 170">
      <Path
        d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.77-7.93-12.24-14.54-6.08-8.87-10.87-19.14-14.37-30.82-3.5-11.68-5.25-22.9-5.25-33.68 0-14.77 3.65-27.1 10.95-37 7.3-9.9 16.63-14.98 27.99-15.24 4.58 0 9.87 1.25 15.87 3.75 6 2.5 10.14 3.82 12.43 3.97 2.07-.15 6.43-1.55 13.08-4.22 6.65-2.67 12.19-3.88 16.62-3.63 12.63.76 22.84 5.37 30.63 13.84-11.01 6.67-16.36 15.93-16.06 27.79.31 9.4 3.99 17.29 11.05 23.66 4.7 4.25 10.02 7.15 15.96 8.71-2.28 6.84-5.05 14.15-8.31 21.94zM119.22 33.64c0-7.39 2.65-14.28 7.95-20.67 5.3-6.39 11.96-10.45 19.98-12.18.66 2.45.99 4.88.99 7.3 0 7.39-2.8 14.39-8.4 20.99-5.6 6.6-12.42 10.47-20.46 11.61-.04-2.35-.06-4.7-.06-7.05z"
        fill={color}
      />
    </Svg>
  );
}

interface AppleSignInButtonProps {
  mode?: 'login' | 'register';
  onError?: (error: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppleSignInButton({
  mode = 'login',
  onError,
  onSuccess,
  disabled = false,
  style,
}: AppleSignInButtonProps) {
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
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Apple Sign-In',
          'Apple ID authentication is configured for iOS production builds with the Apple Developer entitlement.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Apple Sign-In',
          'Sign in with Apple is primarily supported on Apple devices. Please use Google Sign-In or Email on this device.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      onError?.(err?.message || 'Apple authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = mode === 'register' ? 'Sign up with Apple' : 'Continue with Apple';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const logoColor = isDark ? '#FFFFFF' : '#000000';

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
          <AppleLogo size={18} color={logoColor} />
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
