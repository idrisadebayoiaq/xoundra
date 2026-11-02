import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { countries } from '../src/data/catalogue';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';
import { openAndroidApp } from '../src/components/DownloadAppButton';
import { readWeatherOptIn, setWeatherOptIn } from '../src/hooks/useWeatherHint';
import { promptPwaInstall } from '../src/lib/pwaInstall';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { preference, setPreference } = useTheme();
  const app = useApp();
  const current = countries.find((item) => item.code === app.country);
  const [weatherOn, setWeatherOn] = useState(false);

  useEffect(() => {
    readWeatherOptIn().then(setWeatherOn).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Settings" back />

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map((option) => {
          const on = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${option.label} appearance`}
              style={[styles.themeOption, on && styles.themeOptionOn]}
            >
              <Ionicons name={option.icon} size={20} color={on ? colors.mint : colors.muted} />
              <Text style={[styles.themeLabel, on && styles.themeLabelOn]}>{option.label}</Text>
              {on ? (
                <View style={styles.themeCheck}>
                  <Ionicons name="checkmark" size={12} color={colors.mintInk} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Account</Text>
      <Pressable onPress={() => router.push('/change-email')}>
        <Row label="Email" value={app.email} />
      </Pressable>
      <Pressable onPress={() => router.push('/change-password')}>
        <Row label="Password" value="Change" />
      </Pressable>
      <Pressable onPress={() => router.push('/country')}>
        <Row label="Country" value={current?.name} />
      </Pressable>

      <Text style={styles.section}>Subscription</Text>
      <Pressable onPress={() => router.push('/plans')}>
        <Row label="Plan" value={app.premium ? 'Premium' : 'Free'} hint="Manage subscription and billing" />
      </Pressable>

      <Text style={styles.section}>Library & downloads</Text>
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
      <Pressable onPress={app.clearHistory}><Row label="Clear listening history" /></Pressable>
      <Pressable onPress={app.clearAiChats}><Row label="Delete AI chats" /></Pressable>

      <Text style={styles.section}>Notifications</Text>
      <View style={styles.switchRow}>
        <View style={styles.copy}>
          <Text style={styles.label}>Push notifications</Text>
          <Text style={styles.hint}>Push and in-app notices on this device.</Text>
        </View>
        <Switch
          value={app.notifyEnabled}
          onValueChange={app.setNotifyEnabled}
          trackColor={{ true: colors.mint, false: colors.switchOff }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.switchRow}>
        <View style={styles.copy}>
          <Text style={styles.label}>Check-in emails</Text>
          <Text style={styles.hint}>Good morning at 7am and Good evening at 9pm in your country time.</Text>
        </View>
        <Switch
          value={app.checkInEmails}
          onValueChange={app.setCheckInEmails}
          trackColor={{ true: colors.mint, false: colors.switchOff }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Reduced motion</Text>
        <Switch
          value={app.reducedMotion}
          onValueChange={app.setReducedMotion}
          trackColor={{ true: colors.mint, false: colors.switchOff }}
          thumbColor={colors.text}
        />
      </View>
      <View style={styles.switchRow}>
        <View style={styles.copy}>
          <Text style={styles.label}>Weather hints</Text>
          <Text style={styles.hint}>Home tips from time of day.</Text>
        </View>
        <Switch
          value={weatherOn}
          onValueChange={(value) => {
            setWeatherOn(value);
            setWeatherOptIn(value);
          }}
          trackColor={{ true: colors.mint, false: colors.switchOff }}
          thumbColor={colors.text}
        />
      </View>

      {Platform.OS === 'web' ? (
        <>
          <Text style={styles.section}>Web app</Text>
          <Pressable onPress={() => promptPwaInstall()}>
            <Row label="Add to Home Screen" hint="Install as a web app." />
          </Pressable>
        </>
      ) : null}

      <Text style={styles.section}>Creator</Text>
      <Pressable onPress={() => router.push('/artist')} accessibilityLabel={app.isArtist ? 'Artist dashboard' : 'Become an artist'}>
        <Row
          label={app.isArtist ? 'Artist dashboard' : 'Become an artist'}
          value={app.isArtist ? app.artistName || 'Artist' : 'Upload sounds'}
          hint={app.isArtist ? 'Upload sounds, your catalogue, and analytics.' : 'Share sounds with listeners. No extra check to start.'}
        />
      </Pressable>

      {app.isAdmin ? (
        <>
          <Text style={styles.section}>Admin</Text>
          <Pressable onPress={() => router.push('/admin')}>
            <Row label="Admin dashboard" value="Open" hint="Announcements and overview." />
          </Pressable>
        </>
      ) : null}

      <Text style={styles.section}>Legal & support</Text>
      <Pressable onPress={() => router.push('/privacy')}>
        <Row label="Privacy policy" />
      </Pressable>
      <Pressable onPress={() => router.push('/terms')}>
        <Row label="Terms of service" />
      </Pressable>
      <Pressable onPress={() => router.push('/support')}>
        <Row label="Support" />
      </Pressable>
      <Pressable onPress={() => router.push('/delete-account')}>
        <Row label="Delete account" />
      </Pressable>

      {Platform.OS === 'web' ? (
        <Pressable onPress={openAndroidApp} accessibilityLabel="Download the Android app">
          <Row label="Download the Android app" value="APK" hint="Install the latest phone build." />
        </Pressable>
      ) : null}

      <Pressable onPress={app.signOut}><Row label="Sign out" /></Pressable>
    </ScrollView>
  );
}

function Row({ label, value, hint }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 36 },
    section: {
      color: colors.muted,
      fontFamily: font.semibold,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginHorizontal: 20,
      marginTop: 18,
      marginBottom: 10,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 8,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
    themeOptionOn: { borderColor: colors.mint },
    themeLabel: { color: colors.muted, fontFamily: font.medium, fontSize: 14 },
    themeLabelOn: { color: colors.text, fontFamily: font.semibold },
    themeCheck: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
      gap: 12,
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
      maxWidth: '42%',
      textAlign: 'right',
    },
  });
}
