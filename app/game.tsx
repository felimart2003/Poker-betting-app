import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/theme';
import { useGame } from '../src/GameContext';
import { PlayerCard } from '../src/components/PlayerCard';
import { BettingControls } from '../src/components/BettingControls';
import { PotDisplay } from '../src/components/PotDisplay';
import { HandHistory } from '../src/components/HandHistory';
import { isGameOver, getWinner, formatChips, getCallAmount } from '../src/gameState';

const HAND_RANKINGS = [
  'Royal Flush',
  'Straight Flush',
  'Four of a Kind',
  'Full House',
  'Flush',
  'Straight',
  'Three of a Kind',
  'Two Pair',
  'One Pair',
  'High Card',
];

export default function GameScreen() {
  const router = useRouter();
  const {
    game,
    settings,
    mode,
    room,
    canUndo,
    dealNewHand,
    doAction,
    awardToWinners,
    nextDealer,
    resetGame,
    history,
    undoLastAction,
    addPlayerMidgame,
    updatePlayerChips,
  } = useGame();

  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showHands, setShowHands] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerChips, setNewPlayerChips] = useState('1000');
  const [editPlayerId, setEditPlayerId] = useState<string>('');
  const [editChips, setEditChips] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No game in progress</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.replace('/')}>
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
  const shouldRunTimer = settings.decisionTimerSeconds > 0 && game.isHandActive && !isShowdown;

  useEffect(() => {
    if (!shouldRunTimer) {
      setTimeLeft(0);
      return;
    }
    setTimeLeft(settings.decisionTimerSeconds);
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          const callAmount = getCallAmount(game);
          doAction(callAmount > 0 ? 'fold' : 'check');
          return settings.decisionTimerSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [
    game.currentPlayerIndex,
    game.round,
    game.roundNumber,
    game.isHandActive,
    shouldRunTimer,
    settings.decisionTimerSeconds,
  ]);

  const tableSeatWidth = Dimensions.get('window').width - SPACING.md * 2;
  const tableSeatHeight = 300;
  const seatPositions = useMemo(() => {
    const centerX = tableSeatWidth / 2;
    const centerY = tableSeatHeight / 2;
    const radiusX = Math.max(60, tableSeatWidth / 2 - 72);
    const radiusY = Math.max(70, tableSeatHeight / 2 - 56);

    return game.players.map((_, index) => {
      const angle = (-Math.PI / 2) + (2 * Math.PI * index) / Math.max(game.players.length, 2);
      return {
        left: centerX + radiusX * Math.cos(angle) - 52,
        top: centerY + radiusY * Math.sin(angle) - 34,
      };
    });
  }, [game.players.length, tableSeatHeight, tableSeatWidth]);

  const toggleWinner = (playerId: string) => {
    setSelectedWinners(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const confirmWinners = () => {
    if (selectedWinners.length === 0) {
      Alert.alert('Select Winner', 'Tap on winning player(s) first.');
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

  const applyChipEdit = () => {
    if (!editPlayerId) return;
    updatePlayerChips(editPlayerId, parseInt(editChips) || 0);
    setEditChips('');
    setEditPlayerId('');
  };

  const submitAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a player name.');
      return;
    }
    addPlayerMidgame(name, parseInt(newPlayerChips) || 0);
    setNewPlayerName('');
    setNewPlayerChips('1000');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isShowdown
              ? '🏆 Select Winner'
              : isHandDone
              ? 'Hand Complete'
              : `${currentPlayer?.name || 'Player'}'s Turn`}
          </Text>
          {mode === 'online' && room && (
            <Text style={styles.roomText}>Room {room.roomCode} • {room.connectedUsers.length} online</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowHands(true)}>
          <Text style={styles.handButton}>🂡</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        {gameOver && winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerEmoji}>🏆</Text>
            <Text style={styles.winnerText}>{winner.name} wins the game!</Text>
            <Text style={styles.winnerChips}>Final chips: {formatChips(winner.chips)}</Text>
            <TouchableOpacity style={styles.newGameBtn} onPress={handleQuit}>
              <Text style={styles.newGameText}>New Game</Text>
            </TouchableOpacity>
          </View>
        )}

        {game.isHandActive && <PotDisplay game={game} />}

        {shouldRunTimer && (
          <View style={styles.timerBar}>
            <Text style={styles.timerText}>⏱ {timeLeft}s</Text>
          </View>
        )}

        <View style={styles.tableWrap}>
          <View style={styles.tableFelt}>
            {game.players.map((player, index) => {
              const pos = seatPositions[index];
              const isSelected = selectedWinners.includes(player.id);
              const isSB = index === game.smallBlindIndex;
              const isBB = index === game.bigBlindIndex;
              return (
                <TouchableOpacity
                  key={player.id}
                  activeOpacity={0.85}
                  onPress={
                    isShowdown && !player.isFolded && player.isActive
                      ? () => toggleWinner(player.id)
                      : undefined
                  }
                  style={[
                    styles.seat,
                    { left: pos.left, top: pos.top },
                    player.isTurn && styles.seatTurn,
                    isSelected && styles.seatSelected,
                    player.isFolded && styles.seatFolded,
                  ]}
                >
                  <Text style={styles.seatName} numberOfLines={1}>{player.name}</Text>
                  <Text style={styles.seatChips}>🪙 {formatChips(player.chips)}</Text>
                  <View style={styles.badgesRow}>
                    {player.isDealer && <Badge label="D" color={COLORS.primary} textColor={COLORS.background} />}
                    {isSB && <Badge label="SB" color={COLORS.info} />}
                    {isBB && <Badge label="BB" color={COLORS.warning} />}
                    {player.isTurn && <Badge label="TURN" color={COLORS.success} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {!game.isHandActive && !gameOver && game.roundNumber <= 1 && game.pot === 0 && (
          <View style={styles.dealSection}>
            <TouchableOpacity style={styles.dealBtn} onPress={dealNewHand}>
              <Text style={styles.dealBtnText}>Deal First Hand 🃏</Text>
            </TouchableOpacity>
          </View>
        )}

        {isHandDone && !gameOver && game.roundNumber >= 1 && (
          <View style={styles.dealSection}>
            <TouchableOpacity style={styles.dealBtn} onPress={handleNewHand}>
              <Text style={styles.dealBtnText}>Deal Next Hand →</Text>
            </TouchableOpacity>
          </View>
        )}

        {isShowdown && (
          <View style={styles.showdownSection}>
            <Text style={styles.showdownText}>Tap winner seat(s), then confirm</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, selectedWinners.length === 0 && styles.confirmBtnDisabled]}
              onPress={confirmWinners}
            >
              <Text style={styles.confirmBtnText}>
                {selectedWinners.length <= 1 ? 'Award Pot' : `Split Pot (${selectedWinners.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.playersSection}>
          {game.players.map((player, index) => (
            <PlayerCard key={player.id} player={player} index={index} />
          ))}
        </View>

        <HandHistory history={history} />
        <View style={{ height: 130 }} />
      </ScrollView>

      {game.isHandActive && !isShowdown && (
        <View style={styles.controlsContainer}>
          <BettingControls game={game} onAction={doAction} />
        </View>
      )}

      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPanel}>
            <Text style={styles.menuTitle}>Game Menu</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowHands(true); }}>
              <Text style={styles.menuItemText}>View Hand Rankings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowAdmin(true); }}>
              <Text style={styles.menuItemText}>Admin Tools</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, !canUndo && styles.menuItemDisabled]}
              disabled={!canUndo}
              onPress={() => { setShowMenu(false); undoLastAction(); }}
            >
              <Text style={styles.menuItemText}>Undo Last Action</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuItemText}>Resume Game</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuDanger]} onPress={() => { setShowMenu(false); handleQuit(); }}>
              <Text style={[styles.menuItemText, styles.menuDangerText]}>End Game</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showHands} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.handsPanel}>
            <Text style={styles.menuTitle}>Poker Hands (High → Low)</Text>
            {HAND_RANKINGS.map((rank, idx) => (
              <Text key={rank} style={styles.rankText}>{idx + 1}. {rank}</Text>
            ))}
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowHands(false)}>
              <Text style={styles.menuItemText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdmin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.adminPanel}>
            <Text style={styles.menuTitle}>Admin Tools</Text>
            <Text style={styles.adminLabel}>Add player mid-game</Text>
            <TextInput
              style={styles.adminInput}
              placeholder="Player name"
              placeholderTextColor={COLORS.textMuted}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
            />
            <TextInput
              style={styles.adminInput}
              placeholder="Starting chips"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newPlayerChips}
              onChangeText={setNewPlayerChips}
            />
            <TouchableOpacity style={styles.menuItem} onPress={submitAddPlayer}>
              <Text style={styles.menuItemText}>Add Player</Text>
            </TouchableOpacity>

            <Text style={styles.adminLabel}>Correct chip stack</Text>
            {game.players.map(player => (
              <TouchableOpacity
                key={player.id}
                style={[styles.menuItem, editPlayerId === player.id && styles.seatSelected]}
                onPress={() => {
                  setEditPlayerId(player.id);
                  setEditChips(String(player.chips));
                }}
              >
                <Text style={styles.menuItemText}>{player.name} • {formatChips(player.chips)}</Text>
              </TouchableOpacity>
            ))}
            {editPlayerId ? (
              <>
                <TextInput
                  style={styles.adminInput}
                  placeholder="New chip amount"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={editChips}
                  onChangeText={setEditChips}
                />
                <TouchableOpacity style={styles.menuItem} onPress={applyChipEdit}>
                  <Text style={styles.menuItemText}>Apply Chip Correction</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity style={[styles.menuItem, styles.menuDanger]} onPress={() => setShowAdmin(false)}>
              <Text style={[styles.menuItemText, styles.menuDangerText]}>Close Admin</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Badge({ label, color, textColor }: { label: string; color: string; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, textColor ? { color: textColor } : undefined]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.lg, marginBottom: SPACING.lg },
  goBackBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  goBackText: { color: COLORS.background, fontSize: FONT_SIZES.md, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerCenter: { flex: 1, paddingHorizontal: SPACING.md },
  menuIcon: { color: COLORS.text, fontSize: FONT_SIZES.xl },
  handButton: { color: COLORS.primary, fontSize: FONT_SIZES.xl },
  headerTitle: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  roomText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs },

  winnerBanner: {
    backgroundColor: COLORS.felt,
    margin: SPACING.md,
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  winnerEmoji: { fontSize: 60, marginBottom: SPACING.md },
  winnerText: { color: COLORS.primary, fontSize: FONT_SIZES.xxl, fontWeight: '900', textAlign: 'center' },
  winnerChips: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md, marginTop: SPACING.sm },
  newGameBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
  },
  newGameText: { color: COLORS.background, fontSize: FONT_SIZES.md, fontWeight: '700' },

  timerBar: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  timerText: { color: COLORS.warning, fontWeight: '700' },

  tableWrap: { marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  tableFelt: {
    height: 300,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.felt,
    borderWidth: 3,
    borderColor: COLORS.feltDark,
    position: 'relative',
  },
  seat: {
    position: 'absolute',
    width: 104,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  seatTurn: { borderColor: COLORS.success, borderWidth: 2 },
  seatSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  seatFolded: { opacity: 0.45 },
  seatName: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZES.xs },
  seatChips: { color: COLORS.primaryLight, fontSize: FONT_SIZES.xs, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  badgeText: { color: COLORS.text, fontSize: 10, fontWeight: '700' },

  dealSection: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  dealBtn: {
    backgroundColor: COLORS.felt,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.feltLight,
  },
  dealBtnText: { color: COLORS.text, fontSize: FONT_SIZES.xl, fontWeight: '700' },

  showdownSection: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
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
  confirmBtnDisabled: { backgroundColor: COLORS.surfaceHighlight },
  confirmBtnText: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '700' },

  playersSection: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    width: '86%',
    maxWidth: 360,
  },
  handsPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    width: '86%',
    maxWidth: 360,
    gap: SPACING.xs,
  },
  adminPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    width: '94%',
    maxWidth: 480,
    gap: SPACING.xs,
  },
  menuTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  menuItem: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  menuItemDisabled: { opacity: 0.45 },
  menuItemText: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '600' },
  menuDanger: { backgroundColor: COLORS.dangerDark },
  menuDangerText: { color: COLORS.text },
  rankText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md },

  adminLabel: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  adminInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.surfaceHighlight,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
});
