import { useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';

export const androidApkUrl = 'https://expo.dev/artifacts/eas/kll7-xTyrEXGMLDNY7SpI5PgX-VK5V8f0hbtiEKOf04.apk';

export function openAndroidApp() {
  Linking.openURL(androidApkUrl);
}

export function DownloadAppButton({ compact = false }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return null;
  const iconOnly = compact && width < 420;
  return (
    <Pressable
      onPress={openAndroidApp}
      accessibilityLabel="Download the Android app"
      style={iconOnly ? styles.icon : compact ? styles.compact : styles.button}
    >
      {iconOnly ? (
        <Ionicons name="download-outline" size={18} color={colors.mint} />
      ) : (
        <Text style={compact ? styles.compactText : styles.buttonText}>Download app</Text>
      )}
    </Pressable>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
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
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
}
