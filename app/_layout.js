import { Image, Platform, Pressable, Text, View } from 'react-native';
import { Redirect, router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../src/state/AppState';
import { ShellProvider, useShell } from '../src/state/ShellState';
import { MiniPlayer } from '../src/components/MiniPlayer';
import { NotificationBridge } from '../src/components/NotificationBridge';
import { colors } from '../src/theme';
import { AppFrame } from '../src/components/AppFrame';
import { WebDeck } from '../src/components/DesktopShell';
import { OfflineNotice } from '../src/components/OfflineNotice';

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
  const [fontsGaveUp, setFontsGaveUp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFontsGaveUp(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded || error || fontsGaveUp) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error, fontsGaveUp]);

  if (!loaded && !error && !fontsGaveUp) return null;

  return (
    <AppProvider>
      <ShellProvider>
        <StatusBar style="light" />
        <Frame>
          <NotificationBridge />
          <Gate />
        </Frame>
      </ShellProvider>
    </AppProvider>
  );
}

function Frame({ children }) {
  const { desktop } = useShell();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = '#000000';
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    const root = document.getElementById('root');
    if (root) {
      root.style.height = '100%';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
    }
  }, []);
  if (desktop) return <View style={{ flex: 1, backgroundColor: '#000000' }}>{children}</View>;
  return <AppFrame>{children}</AppFrame>;
}

function Gate() {
  const { ready, userId, emailConfirmed, onboardingDone, online, onlineKnown } = useApp();
  const { desktop } = useShell();
  const path = usePathname();
  const onAuth = path === '/welcome' || path === '/sign-in' || path === '/sign-up';
  const confirming = path === '/confirm-email';
  const onboardingPath = path === '/listen-tip' || path === '/sound-picks';
  const offlineHere = ready && onlineKnown && !online && userId && emailConfirmed && path !== '/downloads' && !onAuth && !confirming;

  return (
    <WebDeck>
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
      {ready && userId && emailConfirmed && online && !onboardingDone && !confirming && !onboardingPath ? <Redirect href="/listen-tip" /> : null}
      {ready && userId && emailConfirmed && onboardingDone && (onAuth || confirming) ? <Redirect href="/" /> : null}
      {offlineHere ? <OfflineNotice /> : null}
      {ready && !desktop && !offlineHere ? <OutsideTabsPlayer /> : null}
      {ready ? null : (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../assets/icon.png')} style={{ width: 168, height: 168 }} resizeMode="contain" />
        </View>
      )}
    </View>
    </WebDeck>
  );
}

function OutsideTabsPlayer() {
  const path = usePathname();
  const onTab = path === '/' || path === '/explore' || path === '/studio' || path === '/guide' || path === '/library' || path === '/profile';
  if (onTab || path === '/player' || path === '/ai' || path === '/welcome' || path === '/sign-in' || path === '/sign-up' || path === '/confirm-email' || path === '/listen-tip' || path === '/sound-picks') return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}>
      <MiniPlayer />
    </View>
  );
}
