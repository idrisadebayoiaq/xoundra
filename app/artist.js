import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Avatar } from '../src/components/Avatar';
import { TrackRow } from '../src/components/Cards';
import { avatarUrl, supabase } from '../src/lib/supabase';
import { colors, font } from '../src/theme';
import { useApp } from '../src/state/AppState';

const fallback = [
  ['rain', 'Rain'],
  ['ocean', 'Ocean'],
  ['forest', 'Forest'],
  ['nature', 'Nature'],
  ['ambient', 'Ambient'],
  ['focus', 'Focus'],
  ['meditation', 'Meditation'],
  ['sleep', 'Sleep'],
];

function noteLine(track) {
  const notes = track.comments === 1 ? '1 note' : `${track.comments} notes`;
  return `${track.category} · ${notes}`;
}

export default function ArtistScreen() {
  const app = useApp();
  const choices = app.categories.length
    ? app.categories.map((item) => [item.slug, item.title])
    : fallback;
  const [name, setName] = useState(app.artistName || app.firstName || '');
  const [bio, setBio] = useState(app.artistBio || '');
  const [location, setLocation] = useState(app.artistLocation || '');
  const [banner, setBanner] = useState(app.artistBanner || '');
  const [sounds, setSounds] = useState([]);
  const [followers, setFollowers] = useState(0);
  const [listeners, setListeners] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(choices[0]?.[0] || 'rain');
  const [minutes, setMinutes] = useState('3');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!app.userId || !app.isArtist) return;
    const [{ data: card }, { data: rows }] = await Promise.all([
      supabase.from('artists').select('followers, monthly_listeners, artist_name, artist_bio, artist_location, artist_banner_path').eq('id', app.userId).maybeSingle(),
      supabase.from('tracks').select('id, title, category, artwork_path, track_stats(plays, likes, favorites)').eq('artist_id', app.userId).eq('status', 'published'),
    ]);
    const list = rows || [];
    const ids = list.map((row) => row.id);
    const notes = ids.length
      ? (await supabase.from('track_comment_counts').select('track_id, comments').in('track_id', ids)).data || []
      : [];
    const noteMap = new Map(notes.map((row) => [row.track_id, row.comments]));
    setFollowers(card?.followers || 0);
    setListeners(card?.monthly_listeners || 0);
    if (card) {
      setName(card.artist_name || '');
      setBio(card.artist_bio || '');
      setLocation(card.artist_location || '');
      setBanner(card.artist_banner_path || '');
    }
    setSounds(list.map((row) => {
      const stats = Array.isArray(row.track_stats) ? row.track_stats[0] : row.track_stats;
      const artwork = String(row.artwork_path || 'rain.jpg').replace(/\.jpg$/i, '');
      return {
        id: row.id,
        title: row.title,
        category: String(row.category || '').replace(/^./, (letter) => letter.toUpperCase()),
        artwork,
        plays: Number(stats?.plays) || 0,
        likes: Number(stats?.likes) || 0,
        favorites: Number(stats?.favorites) || 0,
        comments: Number(noteMap.get(row.id)) || 0,
      };
    }));
  }, [app.userId, app.isArtist]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const totals = sounds.reduce((sum, track) => ({
    plays: sum.plays + track.plays,
    likes: sum.likes + track.likes,
    favorites: sum.favorites + track.favorites,
    comments: sum.comments + track.comments,
  }), { plays: 0, likes: 0, favorites: 0, comments: 0 });

  async function become() {
    const artist = name.trim();
    if (artist.length < 2) {
      setNotice('Add the name listeners should see.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('become_artist', { p_name: artist });
    setBusy(false);
    if (error) {
      setNotice('That artist name could not be saved.');
      return;
    }
    await app.refreshAccount();
    setNotice('Your dashboard is ready. Add a bio and a cover, then upload a sound.');
  }

  async function saveProfile() {
    if (name.trim().length < 2) {
      setNotice('Add the name listeners should see.');
      return;
    }
    setBusy(true);
    setNotice('');
    const { error } = await supabase.rpc('save_artist_profile', {
      p_name: name.trim(),
      p_bio: bio.trim(),
      p_location: location.trim(),
      p_banner_path: null,
      p_set_banner: false,
    });
    setBusy(false);
    if (error) {
      setNotice('Those details could not be saved.');
      return;
    }
    await app.refreshAccount();
    setNotice('Saved.');
  }

  async function chooseBanner() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice('Allow photo access to add a cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    setNotice('');
    try {
      const asset = result.assets[0];
      const bytes = await fetch(asset.uri).then((response) => response.arrayBuffer());
      const path = `${app.userId}/banner.jpg`;
      const uploaded = await supabase.storage.from('avatars').upload(path, bytes, {
        upsert: true,
        contentType: asset.mimeType || 'image/jpeg',
      });
      if (uploaded.error) throw uploaded.error;
      const saved = await supabase.rpc('save_artist_profile', {
        p_name: (name.trim() || app.artistName || 'Artist'),
        p_bio: bio.trim(),
        p_location: location.trim(),
        p_banner_path: path,
        p_set_banner: true,
      });
      if (saved.error) throw saved.error;
      setBanner(path);
      await app.refreshAccount();
      setNotice('Cover updated.');
    } catch {
      setNotice('The cover could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function pickAudio() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['audio/mpeg', 'audio/mp3', 'audio/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setFile(asset);
    setFileName(asset.name || 'sound.mp3');
  }

  async function upload() {
    if (!app.userId || !file) {
      setNotice('Choose an mp3 first.');
      return;
    }
    if (title.trim().length < 2) {
      setNotice('Add a title.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const bytes = await fetch(file.uri).then((response) => response.arrayBuffer());
      const path = `${app.userId}/${Date.now()}.mp3`;
      const uploaded = await supabase.storage.from('track-audio').upload(path, bytes, {
        contentType: 'audio/mpeg',
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;
      const seconds = Math.max(1, Math.round((Number(minutes) || 3) * 60));
      const published = await supabase.rpc('publish_artist_track', {
        p_title: title.trim(),
        p_category: category,
        p_duration: seconds,
        p_audio_path: path,
      });
      if (published.error) throw published.error;
      setTitle('');
      setFile(null);
      setFileName('');
      setNotice('Your sound is in the catalogue. Plays, likes, favorites, and notes count here.');
      app.refreshCatalogue();
      load();
    } catch {
      setNotice('The sound could not be uploaded.');
    } finally {
      setBusy(false);
    }
  }

  if (!app.isArtist) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Become an artist" back />
        <View style={styles.block}>
          <Text style={styles.lead}>Choose the name listeners should see. You can upload straight away. Earning opens later, after a separate check.</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Artist name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            accessibilityLabel="Artist name"
          />
          <Pressable onPress={become} disabled={busy} accessibilityLabel="Become an artist" style={styles.button}>
            <Text style={styles.buttonText}>{busy ? 'Saving' : 'Become an artist'}</Text>
          </Pressable>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>
      </ScrollView>
    );
  }

  const bannerUri = banner ? `${avatarUrl(banner)}?v=${app.avatarStamp}` : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Artist" back />
      <Pressable onPress={chooseBanner} accessibilityLabel="Change cover" style={styles.banner}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} resizeMode="cover" style={styles.bannerPhoto} />
        ) : (
          <Text style={styles.bannerText}>Add a cover</Text>
        )}
      </Pressable>
      <View style={styles.identity}>
        <Avatar path={app.avatarPath} stamp={app.avatarStamp} size={72} />
        <View style={styles.who}>
          <Text style={styles.name}>{app.artistName || 'Artist'}</Text>
          <Text style={styles.meta}>{followers === 1 ? '1 follower' : `${followers} followers`}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat label="Sounds" value={sounds.length} />
        <Stat label="Plays" value={totals.plays} />
        <Stat label="Likes" value={totals.likes} />
        <Stat label="Favorites" value={totals.favorites} />
        <Stat label="Notes" value={totals.comments} />
        <Stat label="Monthly listeners" value={listeners} />
        <Stat label="Followers" value={followers} />
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>Your page</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Artist name" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Artist name" />
        <TextInput value={location} onChangeText={setLocation} placeholder="City or country" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Location" />
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="A short bio"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.bio]}
          multiline
          accessibilityLabel="Bio"
        />
        <Pressable onPress={saveProfile} disabled={busy} accessibilityLabel="Save artist details" style={styles.button}>
          <Text style={styles.buttonText}>{busy ? 'Saving' : 'Save details'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/artist-page', params: { id: app.userId } })} accessibilityLabel="Preview public page">
          <Text style={styles.link}>Preview how listeners see you</Text>
        </Pressable>
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>Your sounds</Text>
        {sounds.length === 0 ? (
          <Text style={styles.lead}>Nothing published yet. An upload shows up here with its plays, likes, favorites, and notes.</Text>
        ) : (
          sounds.map((track) => (
            <TrackRow
              key={track.id}
              track={{ ...track, artwork: track.artwork }}
              subtitle={noteLine(track)}
              onPress={() => {
                const full = app.tracks.find((item) => item.id === track.id);
                if (full) app.play(full, app.tracks.filter((item) => item.artistId === app.userId), { collection: true });
              }}
            />
          ))
        )}
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>Upload</Text>
        <Text style={styles.lead}>No extra check is needed to publish. Listeners can follow you, like the sound, and save it.</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Sound title" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Sound title" />
        <TextInput value={minutes} onChangeText={setMinutes} placeholder="Length in minutes" placeholderTextColor={colors.muted} keyboardType="number-pad" style={styles.input} accessibilityLabel="Length in minutes" />
        <View style={styles.chips}>
          {choices.map(([slug, label]) => (
            <Pressable key={slug} onPress={() => setCategory(slug)} accessibilityLabel={label} style={[styles.chip, category === slug && styles.chipOn]}>
              <Text style={[styles.chipText, category === slug && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={pickAudio} accessibilityLabel="Choose audio" style={styles.button}>
          <Text style={styles.buttonText}>{fileName || 'Choose an mp3'}</Text>
        </Pressable>
        <Pressable onPress={upload} disabled={busy} accessibilityLabel="Upload sound" style={styles.button}>
          <Text style={styles.buttonText}>{busy ? 'Uploading' : 'Upload sound'}</Text>
        </Pressable>
      </View>
      <Text style={styles.later}>Earning comes later. It will ask for a few criteria and a verification. Uploading and this dashboard stay open before that.</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  banner: {
    marginHorizontal: 20,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPhoto: { width: '100%', height: 150 },
  bannerText: { color: colors.mint, fontFamily: font.medium, fontSize: 15 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: -28,
  },
  who: { flex: 1, paddingTop: 28 },
  name: { color: colors.text, fontFamily: font.bold, fontSize: 24 },
  meta: { color: colors.muted, fontFamily: font.regular, fontSize: 14, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 18,
  },
  stat: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statValue: { color: colors.text, fontFamily: font.bold, fontSize: 20 },
  statLabel: { color: colors.muted, fontFamily: font.regular, fontSize: 12, marginTop: 2 },
  block: { marginHorizontal: 20, marginTop: 22, gap: 12 },
  section: { color: colors.text, fontFamily: font.semibold, fontSize: 18 },
  lead: { color: colors.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bio: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 13 },
  chipTextOn: { color: colors.mintInk },
  button: { alignSelf: 'flex-start', backgroundColor: colors.text, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: colors.mintInk, fontFamily: font.semibold, fontSize: 15 },
  link: { color: colors.mint, fontFamily: font.medium, fontSize: 14 },
  later: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    marginHorizontal: 20,
    marginTop: 22,
  },
  notice: { color: colors.amber, fontFamily: font.regular, fontSize: 14, marginHorizontal: 20, marginTop: 16 },
});
