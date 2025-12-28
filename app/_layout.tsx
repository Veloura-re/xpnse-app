import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, useRouter, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { BusinessProvider } from "@/providers/business-provider";
import { StorageProvider } from "@/providers/storage-provider";
import { FirebaseProvider } from "@/providers/firebase-provider";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFonts, AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { Monoton_400Regular } from '@expo-google-fonts/monoton';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat';
import { Lato_400Regular } from '@expo-google-fonts/lato';
import { Oswald_400Regular } from '@expo-google-fonts/oswald';
import { Raleway_400Regular } from '@expo-google-fonts/raleway';
import { Merriweather_400Regular } from '@expo-google-fonts/merriweather';
import { Cinzel_400Regular } from '@expo-google-fonts/cinzel';
import { Prata_400Regular } from '@expo-google-fonts/prata';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

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

    if (user && !user.emailVerified) {
      // If user is logged in but not verified, go to verify-email
      const isVerifyScreen = segments.length > 1 && (segments as string[])[1] === "verify-email";
      if (!isVerifyScreen) {
        router.replace("/(auth)/verify-email");
      }
    } else if (user && user.emailVerified) {
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
  }, [user, isLoading, params.mode, params.oobCode]);

  if (isLoading) {
    return <LoadingScreen isDark={isDark} />;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="business-switcher" options={{
          presentation: "modal",
          title: "Switch Business"
        }} />
        <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function AppContent({ onLayoutRootView }: { onLayoutRootView: () => Promise<void> }) {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#ffffff' }]} onLayout={onLayoutRootView}>
      <FirebaseProvider>
        <AuthProvider>
          <BusinessProvider>
            <NotificationProvider>
              <RootLayoutNav />
            </NotificationProvider>
          </BusinessProvider>
        </AuthProvider>
      </FirebaseProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    AbrilFatface_400Regular,
    PlayfairDisplay_700Bold,
    BebasNeue_400Regular,
    Righteous_400Regular,
    Monoton_400Regular,
    Montserrat_400Regular,
    Lato_400Regular,
    Oswald_400Regular,
    Raleway_400Regular,
    Merriweather_400Regular,
    Cinzel_400Regular,
    Prata_400Regular,
    Pacifico_400Regular,
    DancingScript_400Regular,
    PermanentMarker_400Regular,
    Inter_400Regular,
    Inter_700Bold,
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
