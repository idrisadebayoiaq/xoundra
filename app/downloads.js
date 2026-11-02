import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PillButton } from '../src/components/Cards';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SoundCollection } from '../src/components/SoundCollection';
import { font } from '../src/theme';
import { useTheme } from '../src/state/ThemeState';
import { useApp } from '../src/state/AppState';

export default function DownloadsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { premium, downloads, firstName, avatarPath, avatarStamp } = useApp();
  const onWeb = Platform.OS === 'web';

  if (!premium) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Downloads" back />
        <View style={styles.block}>
          <Text style={styles.body}>
            {onWeb
              ? 'Saved sounds on the website are quick-play shortcuts, not offline files. Offline downloads are part of Premium in the Android app.'
              : 'Offline downloads are part of Premium, including sounds that are otherwise free to stream.'}
          </Text>
          <PillButton filled icon="lock-closed" label="See plans" onPress={() => router.push('/plans')} />
        </View>
      </View>
    );
  }

  return (
    <SoundCollection
      title={onWeb ? 'Saved for quick play' : 'Downloads'}
      tracks={downloads}
      ownerName={firstName || 'You'}
      ownerAvatar={avatarPath}
      ownerStamp={avatarStamp}
      onOwnerPress={() => router.navigate('/profile')}
      cover={(size) => <DownloadCover size={size} />}
      placeholder={onWeb ? 'Find saved sounds' : 'Find in downloads'}
      notice={onWeb
        ? 'On the website these are bookmarks for faster play, not offline files. Use the Android app for true offline downloads.'
        : ''}
      empty={onWeb
        ? 'Nothing is saved for quick play yet. Tap the download mark on a sound.'
        : 'Nothing is saved on this device yet. Tap the download mark on a sound.'}
    />
  );
}

function DownloadCover({ size }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.cover, { width: size, height: size }]}>
      <Ionicons name="download" size={Math.round(size * 0.34)} color="#4C9AFF" />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    block: { gap: 16, marginTop: 8, paddingHorizontal: 20 },
    body: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 15,
      lineHeight: 22,
    },
    cover: {
      borderRadius: 8,
      backgroundColor: '#173A66',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
