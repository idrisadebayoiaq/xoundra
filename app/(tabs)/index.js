import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AlbumCard, PhotoTile } from '../../src/components/Cards';
import { pickSleep, pickTonight, greeting } from '../../src/data/catalogue';
import { continuePlaying, forYou, recommended, trending } from '../../src/data/shelves';
import { colors, font } from '../../src/theme';
import { useApp } from '../../src/state/AppState';

export default function HomeScreen() {
  const { play, tracks, history, track, resumeId, helped, signals, picks, downloads, online, premium, playbackNote } = useApp();
  const tonight = pickTonight(tracks);
  const forSleep = pickSleep(tracks);
  const current = track || tracks.find((item) => item.id === resumeId) || null;
  const shelves = [
    ['Continue playing', continuePlaying(history, current)],
    ['Recommended', recommended(tracks, history, helped, signals, picks)],
    ['Trending', trending(tracks)],
    ['For you', forYou(tracks)],
  ];
  if (!online && premium && downloads.length) shelves.unshift(['Downloaded', downloads]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader title={greeting()} />
      {!online ? <Text style={styles.offline}>You're offline. Downloaded sounds still play. The guide needs a connection.</Text> : null}
      {playbackNote ? <Text style={styles.offline}>{playbackNote}</Text> : null}
      {shelves.map(([title, list]) => (
        <Shelf key={title} title={title} list={list} onPlay={play} />
      ))}
      <Text style={styles.section}>Tonight</Text>
      <View style={styles.grid}>
        {tonight.map((item) => (
          <PhotoTile
            key={item.id}
            track={item}
            onPress={() => play(item, tonight)}
          />
        ))}
      </View>
      <Text style={styles.section}>For sleep</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {forSleep.map((item) => (
          <AlbumCard key={item.id} track={item} onPress={() => play(item, forSleep)} />
        ))}
      </ScrollView>
      <Pressable style={styles.voice} onPress={() => router.push('/ai')}>
        <View style={styles.orb} />
        <View style={styles.voiceCopy}>
          <Text style={styles.voiceTitle}>Talk with Xoundra</Text>
          <Text style={styles.voiceBody}>{online ? 'Voice or typing. The guide answers out loud.' : 'The guide needs a connection.'}</Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

function Shelf({ title, list, onPlay }) {
  if (!list.length) return null;
  return (
    <View>
      <Text style={styles.section}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map((item) => (
          <AlbumCard key={`${title}-${item.id}`} track={item} onPress={() => onPlay(item, list)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 28,
  },
  offline: {
    color: colors.amber,
    fontFamily: font.regular,
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  section: {
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 6,
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 22,
  },
  row: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  voice: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  orb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lavender,
    borderWidth: 6,
    borderColor: colors.mint,
  },
  voiceCopy: {
    flex: 1,
    gap: 2,
  },
  voiceTitle: {
    color: colors.text,
    fontFamily: font.semibold,
    fontSize: 16,
  },
  voiceBody: {
    color: colors.muted,
    fontFamily: font.regular,
    fontSize: 13,
  },
});
