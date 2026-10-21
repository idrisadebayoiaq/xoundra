import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, font } from '../theme';

export function OfflineNotice() {
  return (
    <View style={styles.fill}>
      <Text style={styles.title}>You're offline</Text>
      <Text style={styles.copy}>Downloaded sounds are still on this device.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/downloads')} accessibilityLabel="You're offline, Go to download">
        <Text style={styles.buttonText}>You're offline, Go to download</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    zIndex: 20,
  },
  title: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 28,
    textAlign: 'center',
  },
  copy: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  button: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.mint,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.mintInk,
    fontFamily: font.semibold,
    fontSize: 16,
  },
});
