import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../lib/navigation';
import { Avatar } from './Avatar';
import { TrackRow } from './Cards';
import { colors, font } from '../theme';
import { useApp } from '../state/AppState';

export function SoundCollection({
  title,
  tracks,
  ownerName,
  ownerAvatar,
  ownerStamp,
  onOwnerPress,
  cover,
  placeholder,
  empty,
  notice,
  canShare,
  sharePath,
  menu = [],
  rename,
  onRemoveTrack,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { play, saveDownload, isDownloaded, premium } = useApp();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [note, setNote] = useState('');
  const lastY = useRef(0);
  const shownRef = useRef(true);
  const lockUntil = useRef(0);
  const art = Math.min(260, Math.max(180, width - 150));
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tracks.filter((track) => `${track.title} ${track.artistName || ''} ${track.category || ''}`.toLowerCase().includes(needle))
    : tracks;
  const seconds = tracks.reduce((sum, track) => sum + (Number(track.duration) || 0), 0);

  function onScroll(event) {
    const y = event.nativeEvent.contentOffset.y;
    const overflow = event.nativeEvent.contentSize.height - event.nativeEvent.layoutMeasurement.height;
    if (overflow < 64) {
      lastY.current = y;
      if (!shownRef.current) {
        shownRef.current = true;
        setShown(true);
      }
      return;
    }
    const now = Date.now();
    if (now < lockUntil.current) {
      lastY.current = y;
      return;
    }
    const delta = y - lastY.current;
    lastY.current = y;
    if (Math.abs(delta) < 10) return;
    const next = y < 24 || delta < 0;
    if (next === shownRef.current) return;
    shownRef.current = next;
    lockUntil.current = now + 320;
    setShown(next);
  }

  async function downloadAll() {
    if (!premium) {
      router.push('/plans');
      return;
    }
    const pending = tracks.filter((track) => !isDownloaded(track.id));
    if (!pending.length) {
      setNote('These sounds are already on this device.');
      return;
    }
    setNote('');
    for (const track of pending) {
      const result = await saveDownload(track);
      if (result === 'offline' || result === 'premium') break;
    }
  }

  async function share() {
    const url = `https://xoundra.vercel.app${sharePath}`;
    try {
      await Share.share(Platform.OS === 'ios' ? { url, message: title } : { message: `${title}\n${url}` });
    } catch {
      setNote('This could not be shared.');
    }
  }

  function start(list, shuffled) {
    const queue = shuffled ? shuffle(list) : list;
    if (!queue.length) return;
    play(queue[0], queue, { collection: true });
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.hero, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {shown ? (
          <View>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                accessibilityLabel={placeholder}
              />
            </View>
            <View style={styles.art}>{cover(art)}</View>
          </View>
        ) : null}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onOwnerPress} disabled={!onOwnerPress} style={styles.owner} accessibilityLabel={ownerName}>
          <Avatar path={ownerAvatar} stamp={ownerStamp} size={28} />
          <Text style={styles.ownerName} numberOfLines={1}>{ownerName}</Text>
        </Pressable>
        <Text style={styles.meta}>{lengthLabel(seconds)}</Text>
        {rename ? (
          <View style={styles.rename}>
            <TextInput value={rename.value} onChangeText={rename.onChange} style={styles.renameInput} placeholder="Playlist name" placeholderTextColor={colors.muted} />
            <Pressable onPress={rename.onSave} style={styles.renameSave}><Text style={styles.renameSaveText}>Save</Text></Pressable>
          </View>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <Pressable onPress={downloadAll} hitSlop={8} accessibilityLabel="Download">
              <Ionicons name="download-outline" size={24} color={colors.text} />
            </Pressable>
            {canShare ? (
              <Pressable onPress={share} hitSlop={8} accessibilityLabel="Share">
                <Ionicons name="share-outline" size={22} color={colors.text} />
              </Pressable>
            ) : null}
            {menu.length ? (
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} accessibilityLabel="More">
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.rightActions}>
            <Pressable onPress={() => start(visible, true)} hitSlop={8} accessibilityLabel="Shuffle" disabled={!visible.length}>
              <Ionicons name="shuffle" size={24} color={visible.length ? colors.mint : colors.muted} />
            </Pressable>
            <Pressable onPress={() => start(visible, false)} accessibilityLabel="Play" disabled={!visible.length} style={[styles.play, !visible.length && styles.playOff]}>
              <Ionicons name="play" size={28} color={colors.mintInk} />
            </Pressable>
          </View>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {note ? <Text style={styles.notice}>{note}</Text> : null}
        {visible.length === 0 ? <Text style={styles.empty}>{needle ? 'No sounds match that.' : empty}</Text> : null}
        <View style={styles.list}>
          {visible.map((track) => (
            <View key={track.id} style={styles.trackLine}>
              <View style={styles.trackMain}>
                <TrackRow track={track} onPress={() => play(track, visible, { collection: true })} />
              </View>
              {onRemoveTrack ? (
                <Pressable onPress={() => onRemoveTrack(track)} hitSlop={8} accessibilityLabel={`Remove ${track.title}`}>
                  <Ionicons name="remove-circle-outline" size={22} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet}>
            {menu.map((item) => (
              <Pressable
                key={item.label}
                style={styles.sheetRow}
                onPress={() => {
                  setMenuOpen(false);
                  item.onPress();
                }}
                accessibilityLabel={item.label}
              >
                <Text style={[styles.sheetText, item.danger && styles.danger]}>{item.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function lengthLabel(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes} min`;
  return 'Under a minute';
}

function shuffle(list) {
  const items = [...list];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    items[index] = items[swap];
    items[swap] = current;
  }
  return items;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: '#121A24',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: { width: 36, height: 36, justifyContent: 'center' },
  search: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1C2430',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 15,
    height: 40,
  },
  top: {
    backgroundColor: '#121A24',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  art: { alignItems: 'center', marginTop: 22, marginBottom: 8 },
  scroll: { flex: 1 },
  content: { paddingTop: 8 },
  title: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 28,
    letterSpacing: -0.4,
    marginHorizontal: 16,
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  ownerName: { color: colors.text, fontFamily: font.semibold, fontSize: 14, flex: 1 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 13, marginHorizontal: 16, marginTop: 8 },
  rename: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 },
  renameInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    paddingHorizontal: 12,
  },
  renameSave: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  renameSaveText: { color: colors.mint, fontFamily: font.semibold },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  playOff: { opacity: 0.4 },
  notice: { color: colors.mint, fontFamily: font.regular, fontSize: 13, marginHorizontal: 16, marginBottom: 8 },
  empty: { color: colors.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, marginHorizontal: 16, marginTop: 8 },
  list: { paddingHorizontal: 8 },
  trackLine: { flexDirection: 'row', alignItems: 'center' },
  trackMain: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#161A22',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  sheetRow: { paddingHorizontal: 20, paddingVertical: 14 },
  sheetText: { color: colors.text, fontFamily: font.medium, fontSize: 16 },
  danger: { color: colors.amber },
});
