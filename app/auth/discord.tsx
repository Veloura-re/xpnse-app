import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

export default function DiscordAuthCallback() {
  useEffect(() => {
    // Complete the auth session for popup or in-app browser
    try {
      WebBrowser.maybeCompleteAuthSession();
    } catch (e) {
      console.warn('[DiscordAuthCallback] Auth session completion notice:', e);
    }

    // Safety timeout: If window does not auto-close within 2.5s, redirect to app tabs
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.title}>Verifying Discord Authentication</Text>
      <Text style={styles.subtitle}>Finalizing session and synchronizing workspace...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#031711',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#94a3b8',
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
  },
});
