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
import { authenticateWithDiscord } from '@/services/oauth-service';

WebBrowser.maybeCompleteAuthSession();

export function DiscordLogo({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 127.14 96.36">
      <Path
        d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z"
        fill="#5865F2"
      />
    </Svg>
  );
}

interface DiscordSignInButtonProps {
  mode?: 'login' | 'register';
  onError?: (error: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function DiscordSignInButton({
  mode = 'login',
  onError,
  onSuccess,
  disabled = false,
  style,
}: DiscordSignInButtonProps) {
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
      const result = await authenticateWithDiscord();

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
      onError?.(err?.message || 'Discord authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = mode === 'register' ? 'Sign up with Discord' : 'Continue with Discord';
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
          <DiscordLogo size={19} />
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
