import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassBackdropProps {
  isDark: boolean;
  onPress?: () => void;
  intensity?: number;
}

/**
 * High-performance GlassBackdrop providing instant 60fps frosted backdrop.
 * On Web: uses direct CSS hardware-accelerated backdrop-filter (0ms lag, crisp 8px blur).
 * On iOS/Android: uses lightweight BlurView paired with rich dark/light translucent tint.
 */
export function GlassBackdrop({ isDark, onPress, intensity = 8 }: GlassBackdropProps) {
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.35)',
            // @ts-ignore
            backdropFilter: 'blur(8px)',
            // @ts-ignore
            WebkitBackdropFilter: 'blur(8px)',
            // @ts-ignore
            willChange: 'backdrop-filter, background-color',
            // @ts-ignore
            transform: 'translateZ(0)',
            // @ts-ignore
            animationDuration: '0s',
          },
        ]}
        activeOpacity={1}
        onPress={onPress}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <BlurView
        intensity={Platform.OS === 'ios' ? intensity : 8}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.3)',
          },
        ]}
        activeOpacity={1}
        onPress={onPress}
      />
    </View>
  );
}
