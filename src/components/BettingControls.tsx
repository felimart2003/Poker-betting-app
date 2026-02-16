import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { getAvailableActions, getCallAmount, getMinRaise, formatChips } from '../gameState';
import { GameState } from '../types';

interface BettingControlsProps {
  game: GameState;
  onAction: (action: string, amount?: number) => void;
}

export function BettingControls({ game, onAction }: BettingControlsProps) {
  const actions = getAvailableActions(game);
  const player = game.players[game.currentPlayerIndex];
  const callAmount = getCallAmount(game);
  const minRaise = Math.max(1, getMinRaise(game));
  const [raiseAmount, setRaiseAmount] = useState(minRaise.toString());
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  if (!player || actions.length === 0) return null;

  const maxBet = player.chips + player.currentBet;
  const parsedRaise = Number.parseInt(raiseAmount, 10);
  const currentRaise = Number.isFinite(parsedRaise) ? parsedRaise : minRaise;
  const clampedRaise = Math.max(minRaise, Math.min(currentRaise, maxBet));

  const handleRaise = () => {
    if (showRaiseSlider) {
      const amt = clampedRaise;
      onAction(game.currentBet === 0 ? 'bet' : 'raise', amt);
      setShowRaiseSlider(false);
    } else {
      setRaiseAmount(minRaise.toString());
      setShowRaiseSlider(true);
    }
  };

  const adjustRaise = (delta: number) => {
    const newAmt = Math.max(minRaise, Math.min(clampedRaise + delta, maxBet));
    setRaiseAmount(newAmt.toString());
  };

  const presetBet = (fraction: number) => {
    const amt = Math.min(Math.floor(game.pot * fraction + game.currentBet), maxBet);
    setRaiseAmount(Math.max(amt, minRaise).toString());
  };

  return (
    <View style={styles.container}>
      {showRaiseSlider && (
        <View style={styles.raisePanel}>
          <Text style={styles.raiseLabel}>
            {game.currentBet === 0 ? 'Bet' : 'Raise'} Amount
          </Text>
          <View style={styles.raiseInputRow}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustRaise(-game.bigBlind)}
            >
              <Text style={styles.adjustText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.raiseInput}
              value={raiseAmount}
              onChangeText={setRaiseAmount}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustRaise(game.bigBlind)}
            >
              <Text style={styles.adjustText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setRaiseAmount(minRaise.toString())}>
              <Text style={styles.presetText}>Min</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => presetBet(0.5)}>
              <Text style={styles.presetText}>½ Pot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => presetBet(0.75)}>
              <Text style={styles.presetText}>¾ Pot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => presetBet(1)}>
              <Text style={styles.presetText}>Pot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setRaiseAmount(maxBet.toString())}>
              <Text style={styles.presetText}>Max</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.actionRow}>
        {actions.includes('fold') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.foldBtn]}
            onPress={() => {
              setShowRaiseSlider(false);
              onAction('fold');
            }}
          >
            <Text style={styles.foldText}>Fold</Text>
          </TouchableOpacity>
        )}

        {actions.includes('check') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.checkBtn]}
            onPress={() => {
              setShowRaiseSlider(false);
              onAction('check');
            }}
          >
            <Text style={styles.checkText}>Check</Text>
          </TouchableOpacity>
        )}

        {actions.includes('call') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={() => {
              setShowRaiseSlider(false);
              onAction('call');
            }}
          >
            <Text style={styles.callText}>Call</Text>
            <Text style={styles.callAmount}>{formatChips(callAmount)}</Text>
          </TouchableOpacity>
        )}

        {(actions.includes('bet') || actions.includes('raise')) && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.raiseBtn, showRaiseSlider && styles.raiseBtnActive]}
            onPress={handleRaise}
          >
            <Text style={styles.raiseText}>
              {showRaiseSlider
                ? `${game.currentBet === 0 ? 'Bet' : 'Raise'} ${formatChips(clampedRaise)}`
                : game.currentBet === 0
                ? 'Bet'
                : 'Raise'}
            </Text>
          </TouchableOpacity>
        )}

        {actions.includes('all-in') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.allInBtn]}
            onPress={() => {
              setShowRaiseSlider(false);
              onAction('all-in');
            }}
          >
            <Text style={styles.allInText}>All In</Text>
            <Text style={styles.allInAmount}>{formatChips(player.chips)}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  raisePanel: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  raiseLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  raiseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  adjustButton: {
    backgroundColor: COLORS.surfaceHighlight,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
  },
  raiseInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.primary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceHighlight,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  foldBtn: {
    backgroundColor: COLORS.dangerDark,
  },
  foldText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  checkBtn: {
    backgroundColor: COLORS.surfaceHighlight,
  },
  checkText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  callBtn: {
    backgroundColor: COLORS.feltDark,
  },
  callText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  callAmount: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  raiseBtn: {
    backgroundColor: COLORS.feltLight,
  },
  raiseBtnActive: {
    backgroundColor: COLORS.felt,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  raiseText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  allInBtn: {
    backgroundColor: COLORS.primaryDark,
  },
  allInText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  allInAmount: {
    color: COLORS.background,
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
    opacity: 0.8,
  },
});
