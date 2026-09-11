import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';

export default function OAuthRedirectHandler() {
  const { user, setOAuthAuthenticating } = useAuth();

  useEffect(() => {
    setOAuthAuthenticating(true, 'Google');
    try {
      WebBrowser.maybeCompleteAuthSession();
    } catch (e) {
      console.warn('[OAuthRedirectHandler] Completion notice:', e);
    }

    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, setOAuthAuthenticating]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/(auth)/login');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.title}>Signing you in...</Text>
      <Text style={styles.subtitle}>Verifying credentials and preparing your workspace...</Text>
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
