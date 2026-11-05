import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ErrorState, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useProfile } from '@/lib/queries';

void SplashScreen.preventAutoHideAsync();

/**
 * Chooses the flow: login → onboarding (until a name is saved) → tabs.
 * Guards only steer navigation; the API enforces access on every request.
 */
function RootNavigator() {
  const { ready, tokens, load } = useAuth();
  const signedIn = tokens !== null;
  const profile = useProfile();

  useEffect(() => {
    void load();
  }, [load]);

  const resolving = !ready || (signedIn && profile.isPending);
  useEffect(() => {
    if (!resolving) void SplashScreen.hideAsync();
  }, [resolving]);

  if (resolving) return null;

  // Signed in but the profile can't be loaded (e.g. offline): offer a retry instead of a blank app.
  if (
    signedIn &&
    profile.isError &&
    !(profile.error instanceof ApiError && profile.error.status === 401)
  ) {
    return (
      <Screen>
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </Screen>
    );
  }

  const profileComplete = Boolean(profile.data?.name);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !profileComplete}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && profileComplete}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return (
    <QueryClientProvider client={client}>
      <StatusBar style="dark" />
      <RootNavigator />
    </QueryClientProvider>
  );
}
