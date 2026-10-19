import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font } from '../theme';
import { useApp } from '../state/AppState';

const messages = {
  wifi: 'Waiting for Wi-Fi. This download will not start on mobile data.',
  offline: 'Connect to the internet, then try again.',
  missing: 'This sound is not available to download.',
  saved: 'Saved on this device.',
};

export function SoundMenuButton({ track, color = colors.text }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const { play, isLiked, toggleLike, isFavourite, toggleFavourite, addLayer, saveDownload, removeDownload, isDownloaded } = useApp();
  if (!track) return null;
  const liked = isLiked(track.id);
  const favourite = isFavourite(track.id);
  const saved = isDownloaded(track.id);

  function close() {
    setNotice('');
    setOpen(false);
  }

  async function download() {
    if (saved) {
      await removeDownload(track);
      close();
      return;
    }
    const result = await saveDownload(track);
    if (result === 'premium') {
      close();
      return;
    }
    setNotice(messages[result] || '');
    if (result === 'saved') close();
  }

  const actions = [
    { label: 'Play', icon: 'play', onPress: () => { play(track); close(); } },
    { label: liked ? 'Unlike' : 'Like', icon: liked ? 'heart' : 'heart-outline', onPress: () => { toggleLike(track); close(); } },
    { label: favourite ? 'Remove from favorite' : 'Add to favorite', icon: favourite ? 'bookmark' : 'bookmark-outline', onPress: () => { toggleFavourite(track); close(); } },
    { label: 'Add to playlist', icon: 'add-circle-outline', onPress: () => { close(); router.push({ pathname: '/save-playlist', params: { trackId: track.id } }); } },
    { label: 'Add to Studio', icon: 'layers-outline', onPress: () => { addLayer(track); close(); } },
    { label: saved ? 'Remove download' : 'Download', icon: saved ? 'trash-outline' : 'download-outline', onPress: download },
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel={`Options for ${track.title}`}
        style={styles.hit}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={color} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            {actions.map((action) => (
              <Pressable key={action.label} style={styles.action} onPress={action.onPress} accessibilityLabel={action.label}>
                <Ionicons name={action.icon} size={20} color={colors.text} />
                <Text style={styles.actionText}>{action.label}</Text>
              </Pressable>
            ))}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#101725',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  title: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 18,
    marginBottom: 8,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  actionText: {
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 16,
  },
  notice: {
    color: colors.amber,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
