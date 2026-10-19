import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function LevelBar({ value, onChange, color = colors.mint, label = 'Volume' }) {
  const box = useRef({ x: 0, width: 1 });
  const onChangeRef = useRef(onChange);
  const bar = useRef(null);
  onChangeRef.current = onChange;

  function remember() {
    bar.current?.measureInWindow((x, _y, width) => {
      if (width) box.current = { x, width };
    });
  }

  function setFromPage(pageX) {
    const next = (pageX - box.current.x) / (box.current.width || 1);
    onChangeRef.current(Math.min(1, Math.max(0, next)));
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        remember();
        setFromPage(event.nativeEvent.pageX);
      },
      onPanResponderMove: (event) => setFromPage(event.nativeEvent.pageX),
    }),
  ).current;

  const amount = Math.min(1, Math.max(0, Number(value) || 0));

  return (
    <View ref={bar} accessible accessibilityRole="adjustable" accessibilityLabel={label} style={styles.track} onLayout={remember} {...pan.panHandlers}>
      <View style={styles.rail}>
        <View style={[styles.fill, { width: `${Math.round(amount * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 28,
    justifyContent: 'center',
  },
  rail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(243,246,248,0.16)',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
