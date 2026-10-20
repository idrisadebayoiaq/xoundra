import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PillButton } from '../src/components/Cards';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SoundCollection } from '../src/components/SoundCollection';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function DownloadsScreen() {
  const { premium, downloads, firstName, avatarPath, avatarStamp } = useApp();

  if (!premium) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Downloads" back />
        <View style={styles.block}>
          <Text style={styles.body}>
            Offline downloads are part of Premium, including sounds that are otherwise free to stream.
          </Text>
          <PillButton filled icon="lock-closed" label="See plans" onPress={() => router.push('/plans')} />
        </View>
      </View>
    );
  }

  return (
    <SoundCollection
      title="Downloads"
      tracks={downloads}
      ownerName={firstName || 'You'}
      ownerAvatar={avatarPath}
      ownerStamp={avatarStamp}
      onOwnerPress={() => router.navigate('/profile')}
      cover={(size) => <DownloadCover size={size} />}
      placeholder="Find in downloads"
      empty="Nothing is saved on this device yet. Tap the download mark on a sound."
    />
  );
}

function DownloadCover({ size }) {
  return (
    <View style={[styles.cover, { width: size, height: size }]}>
      <Ionicons name="download" size={Math.round(size * 0.34)} color="#4C9AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
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
