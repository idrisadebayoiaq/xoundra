import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useMoments } from '../state/MomentsState';

const KIND = {
  claim: { icon: 'leaf', emoji: '', label: 'Claimed' },
  streak: { icon: 'flame', emoji: '', label: 'Streak' },
  verified: { icon: 'checkmark-circle', emoji: '', label: 'Verified' },
  premium: { icon: 'star', emoji: '', label: 'Premium' },
  unlock: { icon: 'color-wand', emoji: '', label: 'Unlocked' },
  publish: { icon: 'musical-notes', emoji: '', label: 'Published' },
  playful: { icon: '', emoji: '😄', label: 'Nice' },
};

/** Full-screen calm celebration — one shot, then gone. */
export function MomentOverlay() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { moment, clearMoment } = useMoments();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moment) return undefined;
    scale.setValue(0.7);
    opacity.setValue(0);
    float.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(float, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return undefined;
  }, [moment, scale, opacity, float]);

  if (!moment) return null;
  const meta = KIND[moment.kind] || KIND.claim;
  const rise = {
    opacity,
    transform: [
      { scale },
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [18, -8] }) },
    ],
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={clearMoment}>
      <Pressable style={styles.scrim} onPress={clearMoment} accessibilityLabel="Dismiss">
        <Animated.View style={[styles.card, rise]}>
          <View style={styles.orb}>
            {meta.emoji ? (
              <Text style={styles.emoji}>{meta.emoji}</Text>
            ) : (
              <Ionicons name={meta.icon || 'leaf'} size={36} color={colors.mintInk} />
            )}
          </View>
          <Text style={styles.title}>{moment.title || meta.label}</Text>
          {moment.body ? <Text style={styles.body}>{moment.body}</Text> : null}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      minWidth: 220,
      maxWidth: 320,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 28,
      paddingVertical: 28,
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 10,
    },
    orb: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.mint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emoji: { fontSize: 34 },
    title: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 22,
      textAlign: 'center',
    },
    body: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
