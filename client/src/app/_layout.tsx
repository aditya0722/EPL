import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Keep the splash screen visible while bootstrapping
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize cross-platform push notifications
  usePushNotifications(isAuthenticated);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    // Route guard logic
    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in -> Redirect to Login
      router.replace('/(auth)/login');
      SplashScreen.hideAsync().catch(() => {});
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but trying to access auth screens -> Redirect to Home
      router.replace('/(tabs)');
      SplashScreen.hideAsync().catch(() => {});
    } else {
      // Hide splash once layout is ready
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="apply"
        options={{
          headerShown: true,
          title: 'Apply for Loan',
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F9FAFB' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#1F2937' },
        }}
      />
      <Stack.Screen
        name="loan/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NavigationGuard />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
