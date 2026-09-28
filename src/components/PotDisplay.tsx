import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { formatChips } from '../gameState';
import { GameState, BettingRound } from '../types';

interface PotDisplayProps {
  game: GameState;
}

const ROUND_LABELS: Record<BettingRound, string> = {
  'pre-flop': 'Pre-Flop',
  'flop': 'Flop',
  'turn': 'Turn',
  'river': 'River',
  'showdown': 'Showdown',
};

export function PotDisplay({ game }: PotDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.potSection}>
        <Text style={styles.potLabel}>POT</Text>
        <Text style={styles.potAmount}>🪙 {formatChips(game.pot)}</Text>
      </View>
      <View style={styles.infoSection}>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Round</Text>
          <Text style={styles.infoValue}>{ROUND_LABELS[game.round]}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Hand</Text>
          <Text style={styles.infoValue}>#{game.roundNumber}</Text>
        </View>
        {game.currentBet > 0 && (
          <View style={styles.infoPill}>
            <Text style={styles.infoLabel}>Table Bet</Text>
            <Text style={styles.infoValue}>{formatChips(game.currentBet)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.felt,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.feltDark,
  },
  potSection: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  potLabel: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.8,
  },
  potAmount: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '800',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  infoPill: {
    backgroundColor: COLORS.feltDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
  },
  infoValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
