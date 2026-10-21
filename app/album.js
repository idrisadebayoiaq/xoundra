import { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { SoundCollection } from '../src/components/SoundCollection';
import { coverSource } from '../src/data/artwork';
import { supabase, trackAudioUrl } from '../src/lib/supabase';
import { colors } from '../src/theme';
import { useApp } from '../src/state/AppState';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const albumId = Array.isArray(id) ? id[0] : id;
  const { tracks, userId } = useApp();
  const [album, setAlbum] = useState(null);
  const [ordered, setOrdered] = useState([]);

  const load = useCallback(async () => {
    if (!albumId) return;
    const [{ data: card }, { data: rows }, { data: artist }] = await Promise.all([
      supabase.from('albums').select('id, title, artwork_path, artist_id').eq('id', albumId).maybeSingle(),
      supabase.from('tracks').select('id, title, category, artwork_path, audio_path, duration_seconds, artist_id, artist_name, album_position').eq('album_id', albumId).eq('status', 'published').order('album_position'),
      supabase.from('albums').select('artist_id').eq('id', albumId).maybeSingle(),
    ]);
    const owner = card?.artist_id || artist?.artist_id || '';
    const { data: profile } = owner
      ? await supabase.from('artists').select('artist_name, avatar_path').eq('id', owner).maybeSingle()
      : { data: null };
    setAlbum({ ...(card || {}), artistName: profile?.artist_name || '', avatar: profile?.avatar_path || '' });
    setOrdered((rows || []).map((row) => tracks.find((item) => item.id === row.id) || {
      id: row.id,
      title: row.title,
      category: row.category,
      artwork: row.artwork_path,
      audioUrl: trackAudioUrl(row.audio_path),
      duration: Number(row.duration_seconds) || 0,
      artistId: row.artist_id,
      artistName: row.artist_name || profile?.artist_name || '',
      access: 'free',
    }));
  }, [albumId, tracks]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  if (!album?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Album" back />
      </View>
    );
  }

  const mine = album.artist_id === userId;

  return (
    <SoundCollection
      title={album.title || 'Album'}
      tracks={ordered}
      ownerName={mine ? 'You' : (album.artistName || 'Artist')}
      ownerAvatar={album.avatar}
      onOwnerPress={mine ? () => router.navigate('/profile') : () => router.push({ pathname: '/artist-page', params: { id: album.artist_id } })}
      cover={(size) => <Image source={coverSource(album.artwork_path)} style={{ width: size, height: size, borderRadius: 8 }} />}
      placeholder="Find in album"
      empty="Nothing in this album yet."
    />
  );
}
