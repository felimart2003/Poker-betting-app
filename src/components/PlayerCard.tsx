import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { Player } from '../types';
import { formatChips } from '../gameState';

interface PlayerCardProps {
  player: Player;
  index: number;
  isShowdown?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
}

export function PlayerCard({ player, index, isShowdown, isSelected, onPress }: PlayerCardProps) {
  const color = COLORS.playerColors[index % COLORS.playerColors.length];
  const isOut = player.chips <= 0 && !player.isAllIn;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        player.isTurn && styles.activeTurn,
        player.isFolded && styles.folded,
        isOut && styles.eliminated,
        isSelected && styles.selected,
        { borderLeftColor: color, borderLeftWidth: 4 },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, player.isFolded && styles.foldedText]} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={styles.badges}>
            {player.isDealer && (
              <View style={styles.dealerBadge}>
                <Text style={styles.dealerText}>D</Text>
              </View>
            )}
            {player.isTurn && (
              <View style={styles.turnBadge}>
                <Text style={styles.turnBadgeText}>●</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.chips, player.isFolded && styles.foldedText]}>
          🪙 {formatChips(player.chips)}
        </Text>
      </View>

      <View style={styles.footer}>
        {player.isFolded ? (
          <Text style={styles.statusFolded}>FOLDED</Text>
        ) : player.isAllIn ? (
          <Text style={styles.statusAllIn}>ALL IN</Text>
        ) : isOut ? (
          <Text style={styles.statusOut}>OUT</Text>
        ) : player.currentBet > 0 ? (
          <Text style={styles.currentBet}>Bet: {formatChips(player.currentBet)}</Text>
        ) : null}

        {isShowdown && !player.isFolded && (
          <View style={[styles.selectIndicator, isSelected && styles.selectActive]}>
            <Text style={styles.selectText}>{isSelected ? '✓ Winner' : 'Tap to select'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  activeTurn: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  folded: {
    opacity: 0.5,
  },
  eliminated: {
    opacity: 0.3,
  },
  selected: {
    borderColor: COLORS.success,
    borderWidth: 2,
    backgroundColor: '#1a2e1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginRight: SPACING.sm,
  },
  foldedText: {
    color: COLORS.textMuted,
  },
  badges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  dealerBadge: {
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealerText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
  },
  turnBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnBadgeText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.md,
  },
  chips: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  statusFolded: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusAllIn: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusOut: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  currentBet: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  selectIndicator: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  selectActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  selectText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
  },
});
