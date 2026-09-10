import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, useRouter, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useCallback } from "react";

// Complete OAuth web authentication sessions immediately upon arrival
WebBrowser.maybeCompleteAuthSession();
import { StyleSheet, View, Text, TextInput, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { BusinessProvider } from "@/providers/business-provider";
import { StorageProvider } from "@/providers/storage-provider";
import { FirebaseProvider } from "@/providers/firebase-provider";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";
import { NotificationProvider, useNotifications } from "@/providers/notification-provider";
import { DynamicIslandNotification } from "@/components/dynamic-island-notification";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFonts } from 'expo-font';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';

// Global default font family for all Text and TextInput components
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.style = [{ fontFamily: 'SpaceGrotesk_400Regular' }, (Text as any).defaultProps.style];

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.style = [{ fontFamily: 'SpaceGrotesk_400Regular' }, (TextInput as any).defaultProps.style];

// Global Web Font injection to guarantee all little texts, numbers, and inputs use Space Grotesk
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const existingStyle = document.getElementById('spndy-global-font-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Pacifico&family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'spndy-global-font-style';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

      * {
        font-family: 'Space Grotesk', 'SpaceGrotesk_500Medium', 'SpaceGrotesk_600SemiBold', 'SpaceGrotesk_700Bold', 'SpaceGrotesk_400Regular', system-ui, -apple-system, sans-serif;
      }
      input, textarea, button, select {
        font-family: 'Space Grotesk', 'SpaceGrotesk_500Medium', 'SpaceGrotesk_600SemiBold', 'SpaceGrotesk_700Bold', 'SpaceGrotesk_400Regular', system-ui, -apple-system, sans-serif !important;
      }
      input::placeholder, textarea::placeholder {
        font-family: 'Space Grotesk', 'SpaceGrotesk_500Medium', 'SpaceGrotesk_600SemiBold', 'SpaceGrotesk_700Bold', 'SpaceGrotesk_400Regular', system-ui, -apple-system, sans-serif !important;
        opacity: 0.75;
      }
      .pacifico-font, [data-font="pacifico"], .font-logo {
        font-family: 'Pacifico_400Regular', 'Pacifico', cursive !important;
      }
    `;
    document.head.appendChild(style);
  } catch (e) {
    // Ignore in SSR
  }
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const params = useGlobalSearchParams();
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    // Handle password reset deep link
    if (params.mode === 'resetPassword' && params.oobCode) {
      // Allow navigation to reset password screen even if not logged in
      router.replace({
        pathname: "/(auth)/reset-password",
        params: { oobCode: params.oobCode as string }
      });
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    const isOAuthUser = Boolean(
      (user as any)?.profile?.provider && (user as any).profile.provider !== 'password'
    ) || Boolean(user?.providerData?.some(p => p.providerId && p.providerId !== 'password'));

    if (user && !user.emailVerified && !isOAuthUser) {
      // If user is logged in but not verified, go to verify-email
      const isVerifyScreen = segments.length > 1 && (segments as string[])[1] === "verify-email";
      if (!isVerifyScreen) {
        router.replace("/(auth)/verify-email");
      }
    } else if (user && (user.emailVerified || isOAuthUser)) {
      // If user is verified and in auth group, go to tabs
      if (inAuthGroup) {
        router.replace("/(tabs)");
      }
    } else if (!user) {
      // If not logged in and in tabs, go to login
      if (inTabsGroup) {
        router.replace("/(auth)/login");
      }
    }
  }, [user, isLoading, params.mode, params.oobCode, segments]);

  if (isLoading) {
    return <LoadingScreen isDark={isDark} />;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recurring" options={{ headerShown: false }} />
        <Stack.Screen name="donate" options={{ headerShown: false }} />
        <Stack.Screen name="business-switcher" options={{
          presentation: "modal",
          headerShown: false,
        }} />
        <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="account-settings" options={{ headerShown: false }} />
        <Stack.Screen name="business-settings" options={{ headerShown: false }} />
        <Stack.Screen name="security" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="savings-activity" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

// Renders the Dynamic Island banner on top of all screens
function DynamicIslandOverlay() {
  const { toastNotification, clearToast } = useNotifications();
  return (
    <DynamicIslandNotification
      notification={toastNotification}
      onDismiss={clearToast}
    />
  );
}

function AppContent({ onLayoutRootView }: { onLayoutRootView: () => Promise<void> }) {
  const { isDark } = useTheme();

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#ffffff' }]} onLayout={onLayoutRootView}>
      <FirebaseProvider>
        <AuthProvider>
          <BusinessProvider>
            <NotificationProvider>
              <RootLayoutNav />
              {/* Dynamic Island sits above everything */}
              <DynamicIslandOverlay />
            </NotificationProvider>
          </BusinessProvider>
        </AuthProvider>
      </FirebaseProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    Pacifico_400Regular,
    Pacifico: Pacifico_400Regular,
    'Pacifico-Regular': Pacifico_400Regular,
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    'SpaceGrotesk-Light': SpaceGrotesk_300Light,
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'SpaceGrotesk': SpaceGrotesk_400Regular,
    'Space Grotesk': SpaceGrotesk_400Regular,
  });

  useEffect(() => {
    if (error) {
      console.error("Error loading fonts:", error);
    }
  }, [error]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || error) {
      // Hide splash screen once fonts are loaded or if there was an error
      await SplashScreen.hideAsync().catch((error) => {
        console.warn('Failed to hide splash screen:', error);
      });
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StorageProvider>
        <ThemeProvider>
          <AppContent onLayoutRootView={onLayoutRootView} />
        </ThemeProvider>
      </StorageProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
