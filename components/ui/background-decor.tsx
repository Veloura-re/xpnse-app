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
      {/* Top Right Luminous Emerald Glow */}
      <View style={[styles.orb, styles.topRightOrb]}>
        <LinearGradient
          colors={
            isDark
              ? [
                  'rgba(16, 185, 129, 0.28)',
                  'rgba(16, 185, 129, 0.16)',
                  'rgba(16, 185, 129, 0.07)',
                  'rgba(16, 185, 129, 0.02)',
                  'transparent',
                ]
              : [
                  'rgba(16, 185, 129, 0.15)',
                  'rgba(16, 185, 129, 0.08)',
                  'rgba(16, 185, 129, 0.03)',
                  'rgba(16, 185, 129, 0.01)',
                  'transparent',
                ]
          }
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Center Left Subtle Mint Glow */}
      <View style={[styles.orb, styles.centerLeftOrb]}>
        <LinearGradient
          colors={
            isDark
              ? [
                  'rgba(16, 185, 129, 0.22)',
                  'rgba(16, 185, 129, 0.12)',
                  'rgba(16, 185, 129, 0.05)',
                  'rgba(16, 185, 129, 0.01)',
                  'transparent',
                ]
              : [
                  'rgba(16, 185, 129, 0.12)',
                  'rgba(16, 185, 129, 0.06)',
                  'rgba(16, 185, 129, 0.02)',
                  'rgba(16, 185, 129, 0.005)',
                  'transparent',
                ]
          }
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Bottom Right Soft Emerald Glow */}
      <View style={[styles.orb, styles.bottomRightOrb]}>
        <LinearGradient
          colors={
            isDark
              ? [
                  'rgba(16, 185, 129, 0.25)',
                  'rgba(16, 185, 129, 0.14)',
                  'rgba(16, 185, 129, 0.06)',
                  'rgba(16, 185, 129, 0.01)',
                  'transparent',
                ]
              : [
                  'rgba(16, 185, 129, 0.13)',
                  'rgba(16, 185, 129, 0.07)',
                  'rgba(16, 185, 129, 0.02)',
                  'rgba(16, 185, 129, 0.005)',
                  'transparent',
                ]
          }
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
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
    overflow: 'hidden',
  },
  topRightOrb: {
    width: 360,
    height: 360,
    top: -90,
    right: -110,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.28,
        shadowRadius: 60,
      },
      web: {
        filter: 'blur(40px)',
      } as any,
    }),
  },
  centerLeftOrb: {
    width: 300,
    height: 300,
    top: SCREEN_HEIGHT * 0.35,
    left: -120,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: 50,
      },
      web: {
        filter: 'blur(35px)',
      } as any,
    }),
  },
  bottomRightOrb: {
    width: 340,
    height: 340,
    bottom: -70,
    right: -90,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 55,
      },
      web: {
        filter: 'blur(40px)',
      } as any,
    }),
  },
});
