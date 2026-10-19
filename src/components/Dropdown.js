import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../theme';

export function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const current = options.find((item) => item.value === value);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable onPress={() => setOpen(true)} accessibilityLabel={label || 'Choose'} style={styles.field}>
        <Text style={styles.value} numberOfLines={1}>{current?.label || 'Choose'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.dismiss} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label || 'Choose'}</Text>
            <ScrollView style={styles.list}>
              {options.map((item) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityLabel={item.label}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={styles.option}
                  >
                    <Text style={[styles.optionText, selected && styles.optionOn]}>{item.label}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.mint} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    color: colors.muted,
    fontFamily: font.medium,
    fontSize: 13,
  },
  field: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: {
    flex: 1,
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,8,13,0.72)',
    justifyContent: 'flex-end',
  },
  dismiss: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 18,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  list: { flexGrow: 0 },
  option: {
    marginHorizontal: 12,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
  optionOn: { color: colors.mint },
});
