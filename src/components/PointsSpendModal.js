import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '../theme';
import { useTheme } from '../state/ThemeState';
import { useRewards } from '../state/RewardsState';

export function PointsSpendModal({ open, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    points,
    downloadCredits,
    costs,
    earn,
    dailyClaimed,
    claimDailySignIn,
    buyDownloadCredit,
    spendStudio24h,
  } = useRewards();

  function claimToday() {
    claimDailySignIn();
  }

  function buyDownload() {
    if (!buyDownloadCredit()) return;
    onClose?.();
  }

  function buyStudio() {
    if (!spendStudio24h()) return;
    onClose?.();
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation?.()}>
          <Text style={styles.title}>Quiet points</Text>
          <Text style={styles.lead}>
            {points} pts{downloadCredits ? ` · ${downloadCredits} credit${downloadCredits === 1 ? '' : 's'}` : ''}
          </Text>

          <Text style={styles.section}>Earn</Text>
          {dailyClaimed ? (
            <View style={styles.claimDone}>
              <Text style={styles.claimDoneTitle}>Today's check-in claimed</Text>
              <Text style={styles.claimDoneHint}>Come back tomorrow for +{earn.dailySignIn}.</Text>
            </View>
          ) : (
            <Pressable
              style={styles.claim}
              onPress={claimToday}
              accessibilityLabel={`Claim today's ${earn.dailySignIn} Quiet points`}
            >
              <View style={styles.copy}>
                <Text style={styles.claimTitle}>Daily check-in</Text>
                <Text style={styles.rowHint}>Claim once per day.</Text>
              </View>
              <Text style={styles.claimCost}>+{earn.dailySignIn}</Text>
            </Pressable>
          )}

          <Text style={styles.section}>Spend</Text>
          <Pressable
            style={[styles.row, points < costs.download && styles.rowDisabled]}
            onPress={buyDownload}
            disabled={points < costs.download}
            accessibilityLabel="Spend points for a download credit"
          >
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>Download credit</Text>
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
      marginBottom: 8,
    },
    section: {
      color: colors.muted,
      fontFamily: font.semibold,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginTop: 10,
      marginBottom: 4,
    },
    claim: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.bg,
      borderWidth: 1.5,
      borderColor: colors.mint,
      marginBottom: 4,
    },
    claimDone: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.bg,
      marginBottom: 4,
    },
    claimTitle: {
      color: colors.text,
      fontFamily: font.semibold,
      fontSize: 16,
    },
    claimDoneTitle: {
      color: colors.text,
      fontFamily: font.medium,
      fontSize: 15,
    },
    claimDoneHint: {
      color: colors.muted,
      fontFamily: font.regular,
      fontSize: 13,
      marginTop: 4,
    },
    claimCost: {
      color: colors.mint,
      fontFamily: font.bold,
      fontSize: 18,
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
