import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/theme';
import { useGame } from '../src/GameContext';
import { BettingControls } from '../src/components/BettingControls';
import { HandHistory } from '../src/components/HandHistory';
import { PlayerCard } from '../src/components/PlayerCard';
import { PotDisplay } from '../src/components/PotDisplay';
import { formatChips, getCallAmount, getWinner, isGameOver } from '../src/gameState';

type HandInfo = {
  title: string;
  description: string;
  example: string;
};

const HAND_RANKINGS: HandInfo[] = [
  { title: 'Royal Flush', description: 'A, K, Q, J, 10 all same suit.', example: 'A♦ K♦ Q♦ J♦ 10♦' },
  { title: 'Straight Flush', description: 'Five consecutive cards, same suit.', example: '9♠ 8♠ 7♠ 6♠ 5♠' },
  { title: 'Four of a Kind', description: 'Four cards of same rank.', example: 'K♣ K♦ K♥ K♠ 4♦' },
  { title: 'Full House', description: 'Three of one rank + two of another.', example: 'Q♣ Q♦ Q♠ 9♥ 9♣' },
  { title: 'Flush', description: 'Five cards same suit, not consecutive.', example: '10♦ K♦ 2♦ 5♦ J♦' },
  { title: 'Straight', description: 'Five consecutive cards, mixed suits.', example: '8♣ 7♦ 6♠ 5♥ 4♣' },
  { title: 'Three of a Kind', description: 'Three cards of same rank.', example: 'A♣ A♦ A♠ 7♥ 2♣' },
  { title: 'Two Pair', description: 'Two pairs of different ranks.', example: 'J♣ J♥ 4♦ 4♠ 9♣' },
  { title: 'One Pair', description: 'One pair plus three kickers.', example: '10♣ 10♥ K♦ 7♠ 3♣' },
  { title: 'High Card', description: 'No made hand; highest card wins.', example: 'A♣ J♦ 8♠ 5♥ 2♣' },
];

function initials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function GameScreen() {
  const router = useRouter();
  const {
    game,
    settings,
    mode,
    room,
    canUndo,
    history,
    chatMessages,
    timerPaused,
    dealNewHand,
    doAction,
    awardToWinners,
    nextDealer,
    resetGame,
    undoLastAction,
    addPlayerMidgame,
    updatePlayerChips,
    sendChatMessage,
    toggleTimerPaused,
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
  const [chatInput, setChatInput] = useState('');

  const gameOver = game ? isGameOver(game) : false;
  const winner = game ? getWinner(game) : null;
  const isShowdown = !!game && game.round === 'showdown' && game.isHandActive;
  const isHandDone = !!game && !game.isHandActive;
  const currentPlayer = game ? game.players[game.currentPlayerIndex] : null;
  const hasDecisionTimer = settings.decisionTimerSeconds > 0;
  const shouldRunTimer = !!game && settings.decisionTimerSeconds > 0 && game.isHandActive && !isShowdown && !timerPaused;

  useEffect(() => {
    if (!game || !shouldRunTimer) {
      setTimeLeft(timerPaused ? Math.max(0, settings.decisionTimerSeconds) : 0);
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
    game?.currentPlayerIndex,
    game?.round,
    game?.roundNumber,
    game?.isHandActive,
    settings.decisionTimerSeconds,
    shouldRunTimer,
    timerPaused,
    doAction,
  ]);

  const tableSeatWidth = Dimensions.get('window').width - SPACING.md * 2;
  const tableSeatHeight = 340;
  const seatPositions = useMemo(() => {
    if (!game) return [];
    const centerX = tableSeatWidth / 2;
    const centerY = tableSeatHeight / 2;
    const radiusX = Math.max(90, tableSeatWidth / 2 - 82);
    const radiusY = Math.max(95, tableSeatHeight / 2 - 86);

    return game.players.map((_, index) => {
      const angle = (-Math.PI / 2) + (2 * Math.PI * index) / Math.max(game.players.length, 2);
      return {
        left: centerX + radiusX * Math.cos(angle) - 42,
        top: centerY + radiusY * Math.sin(angle) - 42,
      };
    });
  }, [game, tableSeatHeight, tableSeatWidth]);

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

  const toggleWinner = (playerId: string) => {
    setSelectedWinners(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  const confirmWinners = () => {
    if (selectedWinners.length === 0) {
      Alert.alert('Select Winner', 'Tap winner seat(s), then confirm.');
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

  const submitAddPlayer = () => {
    const safeName = newPlayerName.trim();
    if (!safeName) {
      Alert.alert('Name required', 'Enter a player name.');
      return;
    }
    addPlayerMidgame(safeName, Math.max(0, parseInt(newPlayerChips, 10) || 0));
    setNewPlayerName('');
    setNewPlayerChips('1000');
  };

  const applyChipEdit = () => {
    if (!editPlayerId) return;
    updatePlayerChips(editPlayerId, Math.max(0, parseInt(editChips, 10) || 0));
    setEditChips('');
    setEditPlayerId('');
  };

  const submitChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    sendChatMessage(text);
    setChatInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowMenu(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isShowdown ? '🏆 Select Winner' : isHandDone ? 'Hand Complete' : `${currentPlayer?.name || 'Player'}\'s Turn`}
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

        {hasDecisionTimer && timerPaused && (
          <View style={styles.pausedBanner}>
            <Text style={styles.pausedText}>⏸ Timer paused by admin</Text>
          </View>
        )}

        {shouldRunTimer && (
          <View style={styles.timerBar}>
            <Text style={styles.timerText}>⏱ {timeLeft}s</Text>
          </View>
        )}

        <View style={styles.tableWrap}>
          <View style={styles.tableOuter}>
            <View style={styles.tableInner} />
            {game.players.map((player, index) => {
              const pos = seatPositions[index];
              const isSelected = selectedWinners.includes(player.id);
              const isSB = index === game.smallBlindIndex;
              const isBB = index === game.bigBlindIndex;

              return (
                <TouchableOpacity
                  key={player.id}
                  activeOpacity={0.85}
                  onPress={isShowdown && !player.isFolded && player.isActive ? () => toggleWinner(player.id) : undefined}
                  style={[
                    styles.seat,
                    { left: pos?.left ?? 0, top: pos?.top ?? 0 },
                    player.isTurn && styles.seatTurn,
                    isSelected && styles.seatSelected,
                    player.isFolded && styles.seatFolded,
                  ]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(player.name)}</Text>
                  </View>
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
            <TouchableOpacity style={[styles.confirmBtn, selectedWinners.length === 0 && styles.confirmBtnDisabled]} onPress={confirmWinners}>
              <Text style={styles.confirmBtnText}>{selectedWinners.length <= 1 ? 'Award Pot' : `Split Pot (${selectedWinners.length})`}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.playersSection}>
          {game.players.map((player, index) => (
            <PlayerCard key={player.id} player={player} index={index} />
          ))}
        </View>

        <HandHistory history={history} />

        {mode === 'online' && (
          <View style={styles.chatContainer}>
            <Text style={styles.chatTitle}>Table Chat</Text>
            <View style={styles.chatList}>
              {chatMessages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet.</Text>
              ) : (
                chatMessages.slice(0, 20).map(message => (
                  <View key={message.id} style={styles.chatItem}>
                    <Text style={styles.chatSender}>{message.sender}</Text>
                    <Text style={styles.chatText}>{message.text}</Text>
                  </View>
                ))
              )}
            </View>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message"
                placeholderTextColor={COLORS.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={submitChat}
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={submitChat}>
                <Text style={styles.chatSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowAdmin(true); }}>
              <Text style={styles.menuItemText}>Admin Tools</Text>
            </TouchableOpacity>
            {hasDecisionTimer && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); toggleTimerPaused(); }}>
                <Text style={styles.menuItemText}>{timerPaused ? 'Resume Timer' : 'Pause Timer'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuItem, !canUndo && styles.menuItemDisabled]} disabled={!canUndo} onPress={() => { setShowMenu(false); undoLastAction(); }}>
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
          <ScrollView contentContainerStyle={styles.handsPanel}>
            <Text style={styles.menuTitle}>Poker Hand Rankings</Text>
            {HAND_RANKINGS.map((rank, idx) => (
              <View key={rank.title} style={styles.handCard}>
                <Text style={styles.handTitle}>{idx + 1}. {rank.title}</Text>
                <Text style={styles.handDescription}>{rank.description}</Text>
                <Text style={styles.handExample}>Example: {rank.example}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowHands(false)}>
              <Text style={styles.menuItemText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
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

            {!!editPlayerId && (
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
            )}

            {hasDecisionTimer && (
              <TouchableOpacity style={styles.menuItem} onPress={() => toggleTimerPaused()}>
                <Text style={styles.menuItemText}>{timerPaused ? 'Resume Timer' : 'Pause Timer'}</Text>
              </TouchableOpacity>
            )}

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

  pausedBanner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight,
  },
  pausedText: { color: COLORS.warning, fontWeight: '800' },

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
  tableOuter: {
    height: 340,
    borderRadius: 200,
    backgroundColor: COLORS.feltLight,
    borderWidth: 3,
    borderColor: COLORS.feltDark,
    position: 'relative',
    overflow: 'hidden',
  },
  tableInner: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 38,
    bottom: 38,
    borderRadius: 170,
    backgroundColor: COLORS.felt,
    borderWidth: 2,
    borderColor: COLORS.feltLight,
  },
  seat: {
    position: 'absolute',
    width: 84,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
    alignItems: 'center',
  },
  seatTurn: { borderColor: COLORS.success, borderWidth: 2 },
  seatSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  seatFolded: { opacity: 0.5 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatarText: { color: COLORS.text, fontSize: FONT_SIZES.xs, fontWeight: '800' },
  seatName: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZES.xs },
  seatChips: { color: COLORS.primaryLight, fontSize: 10, marginTop: 1 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 4 },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  badgeText: { color: COLORS.text, fontSize: 9, fontWeight: '700' },

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

  chatContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  chatTitle: { color: COLORS.text, fontWeight: '800', marginBottom: SPACING.sm },
  chatList: {
    maxHeight: 140,
    marginBottom: SPACING.sm,
  },
  chatEmpty: { color: COLORS.textMuted, fontSize: FONT_SIZES.sm },
  chatItem: { marginBottom: SPACING.xs },
  chatSender: { color: COLORS.primaryLight, fontSize: FONT_SIZES.xs, fontWeight: '700' },
  chatText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  chatInputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderColor: COLORS.surfaceHighlight,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  chatSendBtn: {
    backgroundColor: COLORS.felt,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  chatSendText: { color: COLORS.text, fontWeight: '700' },

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
    backgroundColor: COLORS.background,
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
    width: '92%',
    maxWidth: 520,
    gap: SPACING.sm,
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

  handCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  handTitle: { color: COLORS.primaryLight, fontWeight: '800', marginBottom: 2 },
  handDescription: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  handExample: { color: COLORS.text, fontSize: FONT_SIZES.sm, marginTop: 4 },

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
