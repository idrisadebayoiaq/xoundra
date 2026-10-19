import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { useApp } from '../state/AppState';
import { goBack } from '../lib/navigation';
import { Avatar } from './Avatar';
import { DownloadAppButton } from './DownloadAppButton';

export function ScreenHeader({ title, back = false }) {
  const insets = useSafeAreaInsets();
  const { unread, avatarPath, avatarStamp } = useApp();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 10 }]}>
      <View style={styles.titleSide}>
        {back ? (
          <Pressable onPress={goBack} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {title}
        </Text>
      </View>
      <View style={styles.actions}>
        {Platform.OS === 'web' ? <DownloadAppButton compact /> : null}
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          style={styles.bell}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread > 0 ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/(tabs)/profile')}
          hitSlop={8}
          accessibilityLabel="Profile"
        >
          <Avatar path={avatarPath} stamp={avatarStamp} size={34} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  back: {
    marginLeft: -6,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: font.bold,
    fontSize: 32,
    letterSpacing: -0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bell: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
});
