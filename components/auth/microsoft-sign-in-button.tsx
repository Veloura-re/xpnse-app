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
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/theme-provider';
import { authenticateWithMicrosoft } from '@/services/oauth-service';

WebBrowser.maybeCompleteAuthSession();

export function MicrosoftLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21">
      <Rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <Rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <Rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <Rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </Svg>
  );
}

interface MicrosoftSignInButtonProps {
  mode?: 'login' | 'register';
  onError?: (error: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MicrosoftSignInButton({
  mode = 'login',
  onError,
  onSuccess,
  disabled = false,
  style,
}: MicrosoftSignInButtonProps) {
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
      const result = await authenticateWithMicrosoft();

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
      onError?.(err?.message || 'Microsoft authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = mode === 'register' ? 'Sign up with Microsoft' : 'Continue with Microsoft';
  const textColor = isDark ? '#FFFFFF' : '#0F172A';

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
          <MicrosoftLogo size={18} />
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
