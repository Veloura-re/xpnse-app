import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useTheme } from '@/providers/theme-provider';

export default function IndexScreen() {
  const { user, isLoading, isOAuthAuthenticating } = useAuth();
  const { isDark } = useTheme();

  if (isLoading || isOAuthAuthenticating) {
    return <LoadingScreen isDark={isDark} />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
