import { Image, Pressable, Text, View } from 'react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppProvider, useApp } from '../src/state/AppState';
import { MiniPlayer } from '../src/components/MiniPlayer';
import { NotificationBridge } from '../src/components/NotificationBridge';
import { colors } from '../src/theme';
import { AppFrame } from '../src/components/AppFrame';

SplashScreen.preventAutoHideAsync().catch(() => {});

export function ErrorBoundary({ error, retry }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#07080D', alignItems: 'flex-start', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#F3F6F8', fontSize: 24, fontWeight: '700' }}>Something interrupted Xoundra.</Text>
      <Text style={{ color: '#8E98A3', fontSize: 15, marginTop: 10 }}>{error?.message || 'Open the app again.'}</Text>
      <Pressable onPress={retry} style={{ marginTop: 18 }}>
        <Text style={{ color: '#8BE1CF', fontSize: 16 }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AppProvider>
      <StatusBar style="light" />
      <AppFrame>
        <NotificationBridge />
        <Gate />
      </AppFrame>
    </AppProvider>
  );
}

function Gate() {
  const { ready, userId, emailConfirmed, onboardingDone } = useApp();
  const path = usePathname();
  const onAuth = path === '/welcome' || path === '/sign-in' || path === '/sign-up';
  const confirming = path === '/confirm-email';
  const onboardingPath = path === '/listen-tip' || path === '/sound-picks';

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="confirm-email" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ai" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      {ready && !userId && !onAuth && !confirming ? <Redirect href="/welcome" /> : null}
      {ready && userId && !emailConfirmed && !confirming ? <Redirect href="/confirm-email" /> : null}
      {ready && userId && emailConfirmed && !onboardingDone && !confirming && !onboardingPath ? <Redirect href="/listen-tip" /> : null}
      {ready && userId && emailConfirmed && onboardingDone && (onAuth || confirming) ? <Redirect href="/" /> : null}
      {ready ? <OutsideTabsPlayer /> : null}
      {ready ? null : (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../assets/icon.png')} style={{ width: 168, height: 168 }} resizeMode="contain" />
        </View>
      )}
    </View>
  );
}

function OutsideTabsPlayer() {
  const path = usePathname();
  const onTab = path === '/' || path === '/explore' || path === '/studio' || path === '/library' || path === '/profile';
  if (onTab || path === '/player' || path === '/ai' || path === '/welcome' || path === '/sign-in' || path === '/sign-up' || path === '/confirm-email' || path === '/listen-tip' || path === '/sound-picks') return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}>
      <MiniPlayer />
    </View>
  );
}
