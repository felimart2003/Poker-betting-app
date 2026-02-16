import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/theme';
import { useGame } from '../src/GameContext';
import { PlayerCard } from '../src/components/PlayerCard';
import { BettingControls } from '../src/components/BettingControls';
import { PotDisplay } from '../src/components/PotDisplay';
import { HandHistory } from '../src/components/HandHistory';
import { isGameOver, getWinner, formatChips } from '../src/gameState';

export default function GameScreen() {
  const router = useRouter();
  const { game, dealNewHand, doAction, awardToWinners, nextDealer, resetGame, history } = useGame();
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No game in progress</Text>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.goBackText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const gameOver = isGameOver(game);
  const winner = getWinner(game);
  const isShowdown = game.round === 'showdown' && game.isHandActive;
  const isHandDone = !game.isHandActive;
  const currentPlayer = game.players[game.currentPlayerIndex];

  const toggleWinner = (playerId: string) => {
    setSelectedWinners(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const confirmWinners = () => {
    if (selectedWinners.length === 0) {
      Alert.alert('Select Winner', 'Tap on the winning player(s) to select them.');
      return;
    }
    awardToWinners(selectedWinners);
    setSelectedWinners([]);
  };

  const handleNewHand = () => {
    nextDealer();
    setTimeout(() => {
      dealNewHand();
    }, 50);
  };

  const handleQuit = () => {
    Alert.alert('End Game', 'Are you sure you want to end this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game',
        style: 'destructive',
        onPress: () => {
          resetGame();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isShowdown
            ? '🏆 Select Winner'
            : isHandDone
            ? 'Hand Complete'
            : currentPlayer?.isTurn
            ? `${currentPlayer.name}'s Turn`
            : 'Poker Table'}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        {/* Winner Banner */}
        {gameOver && winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerEmoji}>🏆</Text>
            <Text style={styles.winnerText}>{winner.name} wins the game!</Text>
            <Text style={styles.winnerChips}>
              Final chips: {formatChips(winner.chips)}
            </Text>
            <TouchableOpacity style={styles.newGameBtn} onPress={handleQuit}>
              <Text style={styles.newGameText}>New Game</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pot Display */}
        {game.isHandActive && <PotDisplay game={game} />}

        {/* Deal First Hand */}
        {!game.isHandActive && !gameOver && game.roundNumber <= 1 && game.pot === 0 && (
          <View style={styles.dealSection}>
            <TouchableOpacity style={styles.dealBtn} onPress={dealNewHand}>
              <Text style={styles.dealBtnText}>Deal First Hand 🃏</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next Hand */}
        {isHandDone && !gameOver && game.roundNumber >= 1 && (
          <View style={styles.dealSection}>
            <TouchableOpacity style={styles.dealBtn} onPress={handleNewHand}>
              <Text style={styles.dealBtnText}>Deal Next Hand →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Showdown: Award Winners */}
        {isShowdown && (
          <View style={styles.showdownSection}>
            <Text style={styles.showdownText}>
              Tap the winner(s), then confirm
            </Text>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                selectedWinners.length === 0 && styles.confirmBtnDisabled,
              ]}
              onPress={confirmWinners}
            >
              <Text style={styles.confirmBtnText}>
                {selectedWinners.length === 0
                  ? 'Select Winner(s)'
                  : selectedWinners.length === 1
                  ? 'Award Pot to Winner'
                  : `Split Pot (${selectedWinners.length} winners)`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Players */}
        <View style={styles.playersSection}>
          {game.players.map((player, index) => (
            <PlayerCard
              key={player.id}
              player={player}
              index={index}
              isShowdown={isShowdown}
              isSelected={selectedWinners.includes(player.id)}
              onPress={
                isShowdown && !player.isFolded && player.isActive
                  ? () => toggleWinner(player.id)
                  : undefined
              }
            />
          ))}
        </View>

        {/* History */}
        <HandHistory history={history} />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Betting Controls */}
      {game.isHandActive && !isShowdown && (
        <View style={styles.controlsContainer}>
          <BettingControls game={game} onAction={doAction} />
        </View>
      )}

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuPanel}>
            <Text style={styles.menuTitle}>Game Menu</Text>

            <View style={styles.menuInfo}>
              <Text style={styles.menuInfoText}>
                Hand #{game.roundNumber} • Blinds: {game.smallBlind}/{game.bigBlind}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
              }}
            >
              <Text style={styles.menuItemText}>Resume Game</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuDanger]}
              onPress={() => {
                setShowMenu(false);
                handleQuit();
              }}
            >
              <Text style={[styles.menuItemText, styles.menuDangerText]}>
                End Game
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.lg,
    marginBottom: SPACING.lg,
  },
  goBackBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  goBackText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  menuIcon: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },

  // Winner
  winnerBanner: {
    backgroundColor: COLORS.felt,
    margin: SPACING.md,
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  winnerEmoji: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  winnerText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    textAlign: 'center',
  },
  winnerChips: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
  },
  newGameBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
  },
  newGameText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },

  // Deal
  dealSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  dealBtn: {
    backgroundColor: COLORS.felt,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.feltLight,
  },
  dealBtnText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },

  // Showdown
  showdownSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  showdownText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.surfaceHighlight,
  },
  confirmBtnText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },

  // Players
  playersSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },

  // Controls
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },

  // Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    width: '80%',
    maxWidth: 320,
  },
  menuTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  menuInfo: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  menuInfoText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  menuItemText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  menuDanger: {
    backgroundColor: COLORS.dangerDark,
  },
  menuDangerText: {
    color: COLORS.text,
  },
});
