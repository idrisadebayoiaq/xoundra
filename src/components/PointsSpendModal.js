import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useRewards } from '../state/RewardsState';
import { useMoments } from '../state/MomentsState';

export function PointsSpendModal({ open, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { points, downloadCredits, costs, buyDownloadCredit, spendStudio24h } = useRewards();
  const { showMoment } = useMoments();

  function buyDownload() {
    if (!buyDownloadCredit()) return;
    onClose?.();
    showMoment('unlock', {
      title: 'Download credit',
      body: 'Ready to save one sound offline.',
    });
  }

  function buyStudio() {
    if (!spendStudio24h()) return;
    onClose?.();
    showMoment('unlock', {
      title: 'Studio open',
      body: 'Mix freely for the next 24 hours.',
    });
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation?.()}>
          <Text style={styles.title}>Spend Quiet points</Text>
          <Text style={styles.lead}>
            {points} pts{downloadCredits ? ` · ${downloadCredits} credit${downloadCredits === 1 ? '' : 's'}` : ''}
          </Text>
          <Text style={styles.note}>Claim daily points from the menu.</Text>

          <Pressable
            style={[styles.row, points < costs.download && styles.rowDisabled]}
            onPress={buyDownload}
            disabled={points < costs.download}
            accessibilityLabel="Spend points for a download credit"
          >
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>Download credit</Text>
              <Text style={styles.rowHint}>Save one sound without ads.</Text>
            </View>
            <Text style={styles.cost}>{costs.download}</Text>
          </Pressable>
          <Pressable
            style={[styles.row, points < costs.studio24h && styles.rowDisabled]}
            onPress={buyStudio}
            disabled={points < costs.studio24h}
            accessibilityLabel="Spend points for Studio unlock"
          >
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>Studio 24h</Text>
              <Text style={styles.rowHint}>Mix for the next day.</Text>
            </View>
            <Text style={styles.cost}>{costs.studio24h}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
      gap: 4,
    },
    title: {
      color: colors.text,
      fontFamily: font.bold,
      fontSize: 22,
    },
    lead: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 14,
      marginTop: 4,
    },
    note: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 12,
      marginBottom: 8,
      marginTop: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    rowDisabled: { opacity: 0.45 },
    copy: { flex: 1 },
    rowTitle: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    rowHint: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 13,
      marginTop: 4,
    },
    cost: {
      color: colors.mint,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    close: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
    closeText: {
      color: colors.muted,
      fontFamily: font.medium,
      fontSize: 15,
    },
  });
}
