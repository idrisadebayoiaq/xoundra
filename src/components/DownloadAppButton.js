import { Linking, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { colors, font } from '../theme';

export const androidApkUrl = 'https://expo.dev/artifacts/eas/gdwB7FB-K5aQ174l0T1g1woLfYeyysiiDoLRLu9_2x4.apk';

export function openAndroidApp() {
  Linking.openURL(androidApkUrl);
}

export function DownloadAppButton({ compact = false }) {
  if (Platform.OS !== 'web') return null;
  return (
    <Pressable
      onPress={openAndroidApp}
      accessibilityLabel="Download the Android app"
      style={compact ? styles.compact : styles.button}
    >
      <Text style={compact ? styles.compactText : styles.buttonText}>Download app</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.mint,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  compact: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.mint,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactText: {
    color: colors.mint,
    fontFamily: font.semibold,
    fontSize: 12,
  },
});
