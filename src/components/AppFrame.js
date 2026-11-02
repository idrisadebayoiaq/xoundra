import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../state/ThemeState';

export function frameWidth(screenWidth) {
  if (screenWidth < 560) return screenWidth;
  return 480;
}

export function AppFrame({ children }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const column = frameWidth(width);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = colors.canvas;
    document.documentElement.style.colorScheme = colors.scheme;
    document.body.style.backgroundColor = colors.canvas;
  }, [colors]);

  return (
    <View style={styles.canvas}>
      <View style={[styles.column, { maxWidth: column }]}>{children}</View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    canvas: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.canvas,
      alignItems: 'center',
    },
    column: {
      flex: 1,
      width: '100%',
      minHeight: 0,
      backgroundColor: colors.bg,
    },
  });
}
