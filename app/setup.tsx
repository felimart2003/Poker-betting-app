import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/theme';
import { notify } from '../src/alerts';
import { useGame } from '../src/GameContext';

const CHIP_PRESETS = [500, 1000, 2000, 5000, 10000];
const BLIND_PRESETS = [
  { small: 5, big: 10 },
  { small: 10, big: 20 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 100, big: 200 },
];

export default function SetupScreen() {
  const router = useRouter();
  const { settings, updateSettings, initGame, mode, room } = useGame();
  const [playerNames, setPlayerNames] = useState<string[]>(
    settings.playerNames.length >= 2
      ? [...settings.playerNames]
      : ['Player 1', 'Player 2']
  );

  const addPlayer = () => {
    if (playerNames.length >= 8) {
      notify('Max Players', 'Maximum 8 players allowed.');
      return;
    }
    setPlayerNames([...playerNames, `Player ${playerNames.length + 1}`]);
  };

  const removePlayer = (index: number) => {
    if (playerNames.length <= 2) {
      notify('Min Players', 'Need at least 2 players.');
      return;
    }
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  };

  const updatePlayerName = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const startGame = () => {
    const validNames = playerNames.map((n, i) => n.trim() || `Player ${i + 1}`);
    try {
      initGame({ playerNames: validNames });
      router.replace('/game');
    } catch (error) { notify('Check your settings', error instanceof Error ? error.message : 'Invalid settings.'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Room Code Banner (online mode) */}
          {mode === 'online' && room?.roomCode && (
            <TouchableOpacity
              style={styles.roomCodeBanner}
              onPress={() => {
                Clipboard.setStringAsync(room.roomCode);
                notify('Copied!', `Room code ${room.roomCode} copied to clipboard.`);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.roomCodeLabel}>Room Code (tap to copy)</Text>
              <Text style={styles.roomCodeValue}>{room.roomCode}</Text>
              <Text style={styles.roomCodeHint}>Share this code with other players to join</Text>
              {room.connectedUsers && room.connectedUsers.length > 0 && (
                <Text style={styles.roomCodeUsers}>
                  {room.connectedUsers.length} player{room.connectedUsers.length !== 1 ? 's' : ''} connected
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Players Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Players</Text>
            <Text style={styles.sectionDesc}>
              {playerNames.length}/8 players
            </Text>

            {playerNames.map((name, index) => (
              <View key={index} style={styles.playerRow}>
                <View
                  style={[
                    styles.playerDot,
                    { backgroundColor: COLORS.playerColors[index % COLORS.playerColors.length] },
                  ]}
                />
                <TextInput
                  style={styles.playerInput}
                  value={name}
                  onChangeText={(text) => updatePlayerName(index, text)}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor={COLORS.textMuted}
                  selectTextOnFocus
                />
                {playerNames.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePlayer(index)}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {playerNames.length < 8 && (
              <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
                <Text style={styles.addBtnText}>+ Add Player</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Starting Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starting Chips</Text>
            <View style={styles.presetRow}>
              {CHIP_PRESETS.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.presetChip,
                    settings.startingChips === amount && styles.presetActive,
                  ]}
                  onPress={() => updateSettings({ startingChips: amount })}
                >
                  <Text
                    style={[
                      styles.presetText,
                      settings.startingChips === amount && styles.presetTextActive,
                    ]}
                  >
                    {amount >= 1000 ? `${amount / 1000}K` : amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customRow}>
              <Text style={styles.customLabel}>Custom:</Text>
              <TextInput
                style={styles.customInput}
                value={settings.startingChips.toString()}
                onChangeText={t => updateSettings({ startingChips: parseInt(t) || 1000 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.sliderWrap}>
              <Slider
                minimumValue={100}
                maximumValue={20000}
                step={100}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.surfaceHighlight}
                thumbTintColor={COLORS.primaryLight}
                value={settings.startingChips}
                onValueChange={(value: number) => updateSettings({ startingChips: value })}
              />
              <Text style={styles.sliderLabel}>🪙 {settings.startingChips.toLocaleString()}</Text>
            </View>
          </View>

          {/* Blinds */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blinds</Text>
            <View style={styles.presetRow}>
              {BLIND_PRESETS.map((blind, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.presetChip,
                    settings.smallBlind === blind.small && styles.presetActive,
                  ]}
                  onPress={() =>
                    updateSettings({ smallBlind: blind.small, bigBlind: blind.big })
                  }
                >
                  <Text
                    style={[
                      styles.presetText,
                      settings.smallBlind === blind.small && styles.presetTextActive,
                    ]}
                  >
                    {blind.small}/{blind.big}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.blindInputRow}>
              <View style={styles.blindInputGroup}>
                <Text style={styles.customLabel}>Small:</Text>
                <TextInput
                  style={styles.customInput}
                  value={settings.smallBlind.toString()}
                  onChangeText={t =>
                    updateSettings({
                      smallBlind: parseInt(t) || 10,
                      bigBlind: (parseInt(t) || 10) * 2,
                    })
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.blindInputGroup}>
                <Text style={styles.customLabel}>Big:</Text>
                <TextInput
                  style={styles.customInput}
                  value={settings.bigBlind.toString()}
                  onChangeText={t => updateSettings({ bigBlind: parseInt(t) || 20 })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Turn Timer (optional)</Text>
            <Text style={styles.sectionDesc}>Set seconds per decision. 0 disables timer.</Text>
            <View style={styles.customRow}>
              <Text style={styles.customLabel}>Seconds:</Text>
              <TextInput
                style={styles.customInput}
                value={settings.decisionTimerSeconds.toString()}
                onChangeText={t => updateSettings({ decisionTimerSeconds: Math.max(0, parseInt(t) || 0) })}
                keyboardType="numeric"
              />
            </View>
          </View>

          {mode === 'online' && room && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Room: {room.roomCode}</Text>
              <Text style={styles.sectionDesc}>Connected players: {room.connectedUsers.length}</Text>
              {room.connectedUsers.map((user: { socketId: string; playerName: string }) => (
                <View key={user.socketId} style={styles.playerRow}>
                  <View style={styles.playerDot} />
                  <Text style={styles.playerInput}>{user.playerName}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Start Game */}
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>Start Game 🃏</Text>
          </TouchableOpacity>

          <View style={{ height: SPACING.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: SPACING.lg,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  sectionDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  playerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  playerInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.xs,
  },
  removeBtn: {
    padding: SPACING.xs,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  addBtn: {
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  presetActive: {
    backgroundColor: COLORS.felt,
    borderColor: COLORS.primary,
  },
  presetText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  presetTextActive: {
    color: COLORS.primary,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  customLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  customInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
  },
  sliderWrap: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  sliderLabel: {
    textAlign: 'center',
    color: COLORS.primaryLight,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  blindInputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  blindInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  startBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  roomCodeBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  roomCodeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  roomCodeValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 6,
  },
  roomCodeHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  roomCodeUsers: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
});
