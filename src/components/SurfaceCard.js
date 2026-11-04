import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../state/ThemeState';

/** Shared calm card — use where interaction or ownership needs a container. */
export function SurfaceCard({ children, onPress, style, accessibilityLabel, raised = false }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const cardStyle = [styles.card, raised && styles.raised, style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} style={cardStyle}>
      {children}
    </Pressable>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
    },
    raised: {
      backgroundColor: colors.cardRaised,
    },
  });
}
