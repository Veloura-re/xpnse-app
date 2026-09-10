import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

export default function GoogleAuthCallback() {
  useEffect(() => {
    try {
      WebBrowser.maybeCompleteAuthSession();
    } catch (e) {
      console.warn('[GoogleAuthCallback] Auth session notice:', e);
    }

    router.replace('/(tabs)');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.title}>Verifying Google Sign-In</Text>
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
