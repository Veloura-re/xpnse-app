import { Stack, Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/providers/auth-provider';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
