import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/theme-provider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BackgroundDecorProps {
  pointerEvents?: 'none' | 'box-none' | 'box-only' | 'auto';
}

export function BackgroundDecor({ pointerEvents = 'none' }: BackgroundDecorProps) {
  const { isDark } = useTheme();

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents={pointerEvents}>
      {/* Top Right Ambient Green Circle */}
      <View
        style={[
          styles.orb,
          styles.topRightOrb,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.03)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(16, 185, 129, 0.14)', 'rgba(16, 185, 129, 0.02)', 'transparent']
              : ['rgba(16, 185, 129, 0.06)', 'rgba(16, 185, 129, 0.01)', 'transparent']
          }
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Center Left Subtle Mint Orb */}
      <View
        style={[
          styles.orb,
          styles.centerLeftOrb,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.02)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(16, 185, 129, 0.10)', 'rgba(16, 185, 129, 0.01)', 'transparent']
              : ['rgba(16, 185, 129, 0.05)', 'rgba(16, 185, 129, 0.01)', 'transparent']
          }
          start={{ x: 0.7, y: 0.3 }}
          end={{ x: 0.3, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Bottom Right Soft Emerald Orb */}
      <View
        style={[
          styles.orb,
          styles.bottomRightOrb,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.07)' : 'rgba(16, 185, 129, 0.02)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.02)', 'transparent']
              : ['rgba(16, 185, 129, 0.05)', 'rgba(16, 185, 129, 0.01)', 'transparent']
          }
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    zIndex: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topRightOrb: {
    width: 320,
    height: 320,
    top: -80,
    right: -100,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 50,
      },
      android: {
        elevation: 0,
      },
      web: {
        filter: 'blur(30px)',
      } as any,
    }),
  },
  centerLeftOrb: {
    width: 260,
    height: 260,
    top: SCREEN_HEIGHT * 0.35,
    left: -110,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.14,
        shadowRadius: 45,
      },
      android: {
        elevation: 0,
      },
      web: {
        filter: 'blur(25px)',
      } as any,
    }),
  },
  bottomRightOrb: {
    width: 300,
    height: 300,
    bottom: -60,
    right: -80,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 50,
      },
      android: {
        elevation: 0,
      },
      web: {
        filter: 'blur(30px)',
      } as any,
    }),
  },
});
