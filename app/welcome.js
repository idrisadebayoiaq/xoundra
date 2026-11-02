import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { DownloadAppButton } from '../src/components/DownloadAppButton';
import { useApp } from '../src/state/AppState';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { tracks, play } = useApp();
  const sample = tracks.find((item) => item.access !== 'premium') || tracks[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
      <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>Xoundra</Text>
      <Text style={styles.line}>Find your quiet.</Text>
      <View style={styles.actions}>
        {sample ? (
          <Pressable
            style={styles.sample}
            onPress={() => play(sample)}
            accessibilityLabel={`Listen to ${sample.title}`}
          >
            <Text style={styles.sampleText}>Listen to {sample.title}</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.primary} onPress={() => router.push('/sign-up')}>
          <Text style={styles.primaryText}>Create account</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push('/sign-in')}>
          <Text style={styles.secondaryText}>Sign in</Text>
        </Pressable>
        <DownloadAppButton />
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    alignSelf: 'center',
  },
  brand: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 36,
    textAlign: 'center',
    marginTop: 18,
  },
  line: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  actions: {
    marginTop: 48,
    gap: 12,
  },
  sample: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleText: {
    color: colors.mint,
    fontFamily: font.medium,
    fontSize: 15,
  },
  primary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  secondary: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  });
}
