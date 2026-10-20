import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries } from '../src/data/catalogue';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';
import { openAndroidApp } from '../src/components/DownloadAppButton';

export default function SettingsScreen() {
  const app = useApp();
  const current = countries.find((item) => item.code === app.country);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Settings" back />
      <Pressable onPress={() => router.push('/edit-profile')}>
        <Row label="Account" value={app.firstName || 'You'} hint={app.email} />
      </Pressable>
      <Pressable onPress={() => router.push('/change-email')}>
        <Row label="Email" value={app.email} />
      </Pressable>
      <Pressable onPress={() => router.push('/change-password')}>
        <Row label="Password" value="Change" />
      </Pressable>
      <Pressable onPress={() => router.push('/country')}>
        <Row label="Country" value={current?.name} />
      </Pressable>
      <Pressable onPress={() => router.push('/plans')}>
        <Row label="Plan" value={app.premium ? 'Premium' : 'Free'} hint="Manage plan" />
      </Pressable>
      <Pressable onPress={() => router.push('/downloads')}>
        <Row label="Downloads" value={app.premium ? 'On this device' : 'Premium'} />
      </Pressable>
      <Pressable onPress={() => app.setDownloadOnWifiOnly(false)} accessibilityLabel="Wi-Fi and mobile data">
        <Row
          label="Wi-Fi and mobile data"
          value={app.downloadOnWifiOnly ? '' : 'On'}
          hint="Downloads start as soon as you ask, on either connection."
        />
      </Pressable>
      <Pressable onPress={() => app.setDownloadOnWifiOnly(true)} accessibilityLabel="Wi-Fi only">
        <Row
          label="Wi-Fi only"
          value={app.downloadOnWifiOnly ? 'On' : ''}
          hint="A download waits until the phone is on Wi-Fi. It does not start on mobile data."
        />
      </Pressable>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Notifications</Text>
        <Switch
          value={app.notifyEnabled}
          onValueChange={app.setNotifyEnabled}
          trackColor={{ true: colors.mint, false: '#2A2E36' }}
          thumbColor={colors.text}
        />
      </View>
      <Pressable onPress={app.clearHistory}><Row label="Clear listening history" /></Pressable>
      <Pressable onPress={app.clearAiChats}><Row label="Delete AI chats" /></Pressable>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Reduced motion</Text>
        <Switch
          value={app.reducedMotion}
          onValueChange={app.setReducedMotion}
          trackColor={{ true: colors.mint, false: '#2A2E36' }}
          thumbColor={colors.text}
        />
      </View>
      <Pressable onPress={() => router.push('/artist')} accessibilityLabel={app.isArtist ? 'Artist dashboard' : 'Become an artist'}>
        <Row
          label={app.isArtist ? 'Artist dashboard' : 'Become an artist'}
          value={app.isArtist ? app.artistName || 'Artist' : 'Upload sounds'}
          hint={app.isArtist ? 'Bio, cover, uploads, and listener counts.' : 'Share sounds with listeners. No extra check to start.'}
        />
      </Pressable>
      {Platform.OS === 'web' ? (
        <Pressable onPress={openAndroidApp} accessibilityLabel="Download the Android app">
          <Row label="Download the Android app" value="APK" hint="Install the latest phone build." />
        </Pressable>
      ) : null}
      <Pressable onPress={() => router.push('/support')}><Row label="Support" /></Pressable>
      <Pressable onPress={app.signOut}><Row label="Sign out" /></Pressable>
    </ScrollView>
  );
}

function Row({ label, value, hint }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  row: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchRow: {
    marginHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copy: { flex: 1 },
  label: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
  hint: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 12,
    marginTop: 2,
  },
  value: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 14,
  },
});
