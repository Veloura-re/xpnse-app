import React from 'react';
import { Text, TextStyle, StyleProp, StyleSheet, Platform, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

export interface LogoProps {
  text?: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  withGlow?: boolean;
  withDot?: boolean;
}

export const PACIFICO_FONT = Platform.select({
  web: "'Pacifico', 'Pacifico_400Regular', cursive",
  default: 'Pacifico_400Regular',
});

/**
 * Wordmark logo component rendered in Pacifico cursive script.
 */
export function Logo({
  text = 'spndy',
  size = 32,
  color,
  style,
  withGlow = false,
  withDot = false,
}: LogoProps) {
  const { colors } = useTheme();
  const primaryColor = color || colors.primary || '#10b981';

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.logoText,
          {
            fontSize: size,
            color: primaryColor,
            fontFamily: PACIFICO_FONT,
            lineHeight: Math.round(size * 1.3),
            textShadowColor: withGlow ? `${primaryColor}40` : undefined,
            textShadowOffset: withGlow ? { width: 0, height: 2 } : undefined,
            textShadowRadius: withGlow ? 12 : undefined,
          },
          style,
        ]}
        accessibilityRole="header"
        accessibilityLabel={text}
        {...(Platform.OS === 'web'
          ? ({ 'data-font': 'pacifico', className: 'pacifico-font font-logo' } as any)
          : {})}
      >
        {text}
      </Text>
      {withDot && (
        <View
          style={[
            styles.accentDot,
            {
              width: Math.max(4, Math.round(size * 0.15)),
              height: Math.max(4, Math.round(size * 0.15)),
              borderRadius: Math.max(2, Math.round(size * 0.08)),
              backgroundColor: primaryColor,
              marginBottom: Math.round(size * 0.18),
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * Inline version for embedding seamlessly inside existing Text elements.
 */
export function InlineLogo({
  text = 'spndy',
  size,
  color,
  style,
}: {
  text?: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const primaryColor = color || colors.primary || '#10b981';

  return (
    <Text
      style={[
        styles.inlineText,
        {
          color: primaryColor,
          fontFamily: PACIFICO_FONT,
          fontSize: size,
        },
        style,
      ]}
      {...(Platform.OS === 'web'
        ? ({ 'data-font': 'pacifico', className: 'pacifico-font font-logo' } as any)
        : {})}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: PACIFICO_FONT,
    fontWeight: 'normal',
    letterSpacing: 0,
    includeFontPadding: false,
  },
  inlineText: {
    fontFamily: PACIFICO_FONT,
    fontWeight: 'normal',
    letterSpacing: 0,
    includeFontPadding: false,
  },
  accentDot: {
    marginLeft: 2,
  },
});

export default Logo;
