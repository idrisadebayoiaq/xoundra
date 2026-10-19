import { useEffect } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';

export function frameWidth(screenWidth) {
  if (screenWidth < 560) return screenWidth;
  return 480;
}

export function AppFrame({ children }) {
  const { width } = useWindowDimensions();
  const column = frameWidth(width);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
  }, []);

  return (
    <View style={styles.canvas}>
      <View style={[styles.column, { maxWidth: column }]}>{children}</View>
    </View>
  );
}

const styles = {
  canvas: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
};
