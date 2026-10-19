import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { MiniPlayer } from './MiniPlayer';
import { useApp } from '../state/AppState';
import { Avatar } from './Avatar';

const items = {
  index: { label: 'Home', icon: 'home', href: '/' },
  explore: { label: 'Explore', icon: 'compass', href: '/explore' },
  studio: { label: 'Studio', icon: 'layers', href: '/studio' },
  library: { label: 'Library', icon: 'albums', href: '/library' },
  profile: { label: 'Profile', icon: 'person', href: '/profile' },
};

export function AppTabBar({ state }) {
  const insets = useSafeAreaInsets();
  const { avatarPath, avatarStamp } = useApp();
  return (
    <View style={{ backgroundColor: colors.bg }}>
      <MiniPlayer />
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {state.routes.map((route, index) => {
          const active = state.index === index;
          const item = items[route.name] || { label: route.name, icon: 'ellipse', href: '/' };
          const color = active ? colors.mint : colors.muted;
          const icon = active ? item.icon : `${item.icon}-outline`;
          return (
            <Pressable
              key={route.key}
              style={styles.item}
              onPress={() => {
                if (!active) router.navigate(item.href);
              }}
            >
              {route.name === 'profile' && avatarPath ? (
                <Avatar path={avatarPath} stamp={avatarStamp} size={22} />
              ) : (
                <Ionicons name={icon} size={22} color={color} />
              )}
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
    backgroundColor: colors.bg,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 11,
  },
});
