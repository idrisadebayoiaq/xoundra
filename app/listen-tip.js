import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../src/theme';

export default function ListenTipScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.icon}>
        <Ionicons name="headset" size={36} color={colors.mintInk} />
      </View>
      <Text style={styles.title}>Hear it up close</Text>
      <Text style={styles.body}>
        Headphones, earbuds, or a headset let the quiet details through. Xoundra is made to be heard near you, not across a noisy room.
      </Text>
      <Pressable style={styles.button} onPress={() => router.replace('/sound-picks')} accessibilityLabel="Choose sounds">
        <Text style={styles.buttonText}>Choose sounds</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  body: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  button: {
    marginTop: 28,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 16,
  },
});
