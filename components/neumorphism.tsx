import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

interface NeumorphViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  inset?: boolean;
}

export function NeumorphView({ children, style, borderRadius = 20, inset = false }: NeumorphViewProps) {
  const { colors, isDark } = useTheme();

  // Neumorphism works best with slightly off-white or slightly off-black colors.
  // We'll use colors.background or colors.card as the base, and derive shadows.
  const baseColor = isDark ? '#1a1a1c' : '#eff2f5'; 
  const lightShadow = isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff';
  const darkShadow = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(163, 177, 198, 0.6)';

  return (
    <View style={[styles.outerContainer, style, { borderRadius }]}>
      {/* Dark Shadow (Bottom Right) */}
      <View
        style={[
          styles.shadowLayer,
          {
            borderRadius,
            shadowColor: darkShadow,
            shadowOffset: { width: inset ? -4 : 6, height: inset ? -4 : 6 },
            shadowOpacity: 1,
            shadowRadius: 10,
            elevation: inset ? 0 : 8, // Android fallback
          },
        ]}
      >
        {/* Light Shadow (Top Left) */}
        <View
          style={[
            styles.innerContainer,
            {
              backgroundColor: baseColor,
              borderRadius,
              shadowColor: lightShadow,
              shadowOffset: { width: inset ? 4 : -6, height: inset ? 4 : -6 },
              shadowOpacity: 1,
              shadowRadius: 10,
              elevation: 0,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'transparent',
  },
  shadowLayer: {
    backgroundColor: 'transparent',
  },
  innerContainer: {
    overflow: 'hidden',
  },
});
