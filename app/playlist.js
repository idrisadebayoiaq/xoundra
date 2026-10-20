import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { goBack } from '../src/lib/navigation';
import { supabase } from '../src/lib/supabase';
import { sortOptions, sortTracks } from '../src/data/order';
import { useApp } from '../src/state/AppState';
import { PlaylistCover } from '../src/components/PlaylistCover';
import { SoundCollection } from '../src/components/SoundCollection';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const playlistId = Array.isArray(id) ? id[0] : id;
  const { tracks, userId, firstName, avatarPath, avatarStamp } = useApp();
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerAvatar, setOwnerAvatar] = useState('');
  const [ownerIsArtist, setOwnerIsArtist] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');
  const [sortMode, setSortMode] = useState('saved');

  const load = useCallback(async () => {
    if (!playlistId) return;
    const [{ data: playlist }, { data: items }] = await Promise.all([
      supabase.from('playlists').select('id, title, user_id, is_public').eq('id', playlistId).maybeSingle(),
      supabase.from('playlist_tracks').select('track_id, position').eq('playlist_id', playlistId).order('position'),
    ]);
    const owner = playlist?.user_id || '';
    setTitle(playlist?.title || 'Playlist');
    setDraft(playlist?.title || '');
    setOwnerId(owner);
    setIsPublic(playlist?.is_public === true);
    setRows(items || []);
    if (owner && owner === userId) {
      setOwnerName(firstName || 'You');
      setOwnerAvatar(avatarPath || '');
      setOwnerIsArtist(false);
      return;
    }
    const { data: artist } = owner
      ? await supabase.from('artists').select('id, artist_name, avatar_path').eq('id', owner).maybeSingle()
      : { data: null };
    setOwnerIsArtist(Boolean(artist?.id));
    setOwnerName(artist?.artist_name || 'Listener');
    setOwnerAvatar(artist?.avatar_path || '');
  }, [playlistId, userId, firstName, avatarPath]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const queued = rows.map((row) => tracks.find((track) => track.id === row.track_id)).filter(Boolean);
  const ordered = sortMode === 'saved' ? queued : sortTracks(queued, sortMode);
  const mine = Boolean(userId) && ownerId === userId;

  async function rename() {
    const next = draft.trim();
    if (!next || next === title) {
      setRenaming(false);
      return;
    }
    const { error } = await supabase.from('playlists').update({ title: next }).eq('id', playlistId);
    if (error) {
      setNotice('The name could not be changed.');
      return;
    }
    setTitle(next);
    setRenaming(false);
    setNotice('Name updated.');
  }

  async function applySort(mode) {
    setSortMode(mode);
    if (mode === 'saved' || !mine) {
      load();
      return;
    }
    const next = sortTracks(queued, mode);
    setRows(next.map((track, index) => ({ track_id: track.id, position: index })));
    await Promise.all(next.map((track, index) => (
      supabase.from('playlist_tracks').update({ position: index }).eq('playlist_id', playlistId).eq('track_id', track.id)
    )));
  }

  async function togglePublic() {
    const next = !isPublic;
    const { error } = await supabase.from('playlists').update({ is_public: next }).eq('id', playlistId);
    if (error) {
      setNotice('That change could not be saved.');
      return;
    }
    setIsPublic(next);
  }

  async function removeTrack(trackId) {
    await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId).eq('track_id', trackId);
    setRows((items) => items.filter((row) => row.track_id !== trackId));
  }

  async function removePlaylist() {
    await supabase.from('playlists').delete().eq('id', playlistId);
    goBack();
  }

  const menu = mine ? [
    { label: 'Rename', onPress: () => setRenaming(true) },
    { label: isPublic ? 'Make private' : 'Make public', onPress: togglePublic },
    ...sortOptions.filter((item) => item.value !== 'added').map((item) => ({
      label: item.label,
      onPress: () => applySort(item.value),
    })),
    { label: 'Saved order', onPress: () => applySort('saved') },
    { label: 'Delete playlist', danger: true, onPress: removePlaylist },
  ] : [];

  return (
    <SoundCollection
      title={title}
      tracks={ordered}
      ownerName={ownerName || 'Listener'}
      ownerAvatar={ownerAvatar}
      ownerStamp={avatarStamp}
      onOwnerPress={mine ? () => router.navigate('/profile') : ownerIsArtist ? () => router.push({ pathname: '/artist-page', params: { id: ownerId } }) : null}
      cover={(size) => <PlaylistCover tracks={queued} size={size} radius={8} />}
      placeholder="Find in playlist"
      empty={mine ? 'Add sounds with the plus button on any sound.' : 'Nothing in this playlist yet.'}
      notice={notice}
      canShare={isPublic}
      sharePath={`/playlist?id=${playlistId}`}
      menu={menu}
      rename={renaming ? { value: draft, onChange: setDraft, onSave: rename } : null}
      onRemoveTrack={mine ? (track) => removeTrack(track.id) : null}
    />
  );
}
