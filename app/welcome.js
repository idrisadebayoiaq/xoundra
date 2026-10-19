import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../src/theme';
import { DownloadAppButton } from '../src/components/DownloadAppButton';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
      <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>Xoundra</Text>
      <Text style={styles.line}>Find your quiet.</Text>
      <View style={styles.actions}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
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
