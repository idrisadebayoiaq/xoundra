import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function NotificationsScreen() {
  const { notes, markNotesRead, notifyEnabled } = useApp();

  useFocusEffect(useCallback(() => {
    markNotesRead();
  }, [markNotesRead]));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Notifications" back />
      {!notifyEnabled ? (
        <Text style={styles.note}>Notifications are off in Settings. These stay on the list until you clear them.</Text>
      ) : null}
      <View style={styles.list}>
        {notes.length === 0 ? (
          <Text style={styles.note}>Nothing new. Notes from Xoundra will gather here.</Text>
        ) : notes.map((item) => (
          <View key={item.id} style={styles.card}>
            <Image source={require('../assets/icon.png')} style={styles.icon} />
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  note: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  list: { paddingHorizontal: 20, gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  body: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
