import { router } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { LikedCover } from '../src/components/LikedCover';
import { SoundCollection } from '../src/components/SoundCollection';

export default function LikedScreen() {
  const { likes, firstName, avatarPath, avatarStamp } = useApp();
  return (
    <SoundCollection
      title="Liked sounds"
      tracks={likes}
      ownerName={firstName || 'You'}
      ownerAvatar={avatarPath}
      ownerStamp={avatarStamp}
      onOwnerPress={() => router.navigate('/profile')}
      cover={(size) => <LikedCover size={size} />}
      placeholder="Find in liked sounds"
      empty="Tap the heart on a sound. Liked sounds stay in this library."
    />
  );
}
