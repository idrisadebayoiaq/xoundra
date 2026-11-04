import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardPad } from '../hooks/useKeyboardPad';
import { useTheme } from '../state/ThemeState';

/** Scroll screen that lifts content above the soft keyboard on iOS, Android, and web. */
export function KeyboardScreen({ children, contentContainerStyle, style, extraPad = 12 }) {
  const { colors } = useTheme();
  const pad = useKeyboardPad(extraPad);
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: (StyleSheet.flatten(contentContainerStyle)?.paddingBottom || 28) + pad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function KeyboardPadView({ children, style, extraPad = 12 }) {
  const pad = useKeyboardPad(extraPad);
  return <View style={[style, { paddingBottom: pad }]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
