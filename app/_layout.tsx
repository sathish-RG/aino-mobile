import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/useAuthStore';
import type { UserRole } from '@/src/stores/useAuthStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function roleRoute(role: UserRole): string {
  if (role === 'Admin') return '/(admin)/dashboard';
  if (role === 'Agent') return '/(agent)/dashboard';
  return '/(owner)/dashboard';
}

function AuthGate() {
  const { user, isLoaded, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const seg = segments as string[];
    const inAuth   = seg[0] === '(auth)';
    const inPublic = seg[0] === 'book';
    const inAdmin  = seg[0] === '(admin)';
    const inAgent  = seg[0] === '(agent)';
    const inOwner  = seg[0] === '(owner)';

    if (!user && !inAuth && !inPublic) {
      router.replace('/(auth)/login' as any);
    } else if (user && inAuth) {
      router.replace(roleRoute(user.role) as any);
    } else if (user) {
      // Enforce role-based section access — prevent Agent/Owner reaching admin screens, etc.
      const wrongSection =
        (inAdmin && user.role !== 'Admin') ||
        (inAgent && user.role !== 'Agent') ||
        (inOwner && user.role !== 'Owner');
      if (wrongSection) router.replace(roleRoute(user.role) as any);
    }
  }, [user, isLoaded, segments]);

  useEffect(() => {
    if (isLoaded) SplashScreen.hideAsync();
  }, [isLoaded]);

  // Show branded splash while auth state is being restored from storage.
  if (!isLoaded) {
    return (
      <View style={splash.screen}>
        <Image
          source={require('@/assets/images/aino-logo.png')}
          style={splash.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGate />
    </QueryClientProvider>
  );
}

const splash = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1e3c6e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 220, height: 220 },
});
