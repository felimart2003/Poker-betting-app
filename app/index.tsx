import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/theme';
import { useGame } from '../src/GameContext';

export default function HomeScreen() {
  const router = useRouter();
  const { connectToRoom, setMode, disconnectRoom, serverUrl, setServerUrl } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);

  const handleCreate = async () => {
    if (isConnecting) return;
    const name = playerName.trim() || 'Host';
    setIsConnecting(true);
    const res = await connectToRoom({ playerName: name, create: true });
    setIsConnecting(false);
    if (!res.ok) {
      Alert.alert('Connection failed', res.error || 'Could not create room.');
      return;
    }
    // Room code is now in the context (room.roomCode) — navigate to setup
    router.push('/setup');
  };

  const handleJoin = async () => {
    if (isConnecting) return;
    const name = playerName.trim() || 'Player';
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Enter Room Code', 'Type the room code shared by the host.');
      return;
    }
    setIsConnecting(true);
    const res = await connectToRoom({ playerName: name, roomCode: code, create: false });
    setIsConnecting(false);
    if (!res.ok) {
      Alert.alert('Join failed', res.error || 'Could not join room.');
      return;
    }
    router.push('/game');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>🃏</Text>
          <Text style={styles.title}>Poker Chips</Text>
          <Text style={styles.subtitle}>
            No chips? No problem.{'\n'}Track bets with your phone.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="👥" text="2-8 players" />
          <FeatureItem icon="🪙" text="Track chips & bets" />
          <FeatureItem icon="🔄" text="Auto blinds & dealer" />
          <FeatureItem icon="🌐" text="Online multiplayer" />
        </View>

        {/* Name Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Create Room */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create a Room</Text>
          <Text style={styles.cardDesc}>Start a new game. A room code will be generated for you to share.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, isConnecting && styles.disabledBtn]}
            disabled={isConnecting}
            onPress={handleCreate}
          >
            <Text style={styles.primaryBtnText}>{isConnecting ? 'Connecting...' : 'Create Room'}</Text>
          </TouchableOpacity>
        </View>

        {/* Join Room */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join a Room</Text>
          <Text style={styles.cardDesc}>Enter the code shared by the host.</Text>
          <TextInput
            style={styles.input}
            value={joinCode}
            onChangeText={text => setJoinCode(text.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Room Code (e.g. XK4TG)"
            placeholderTextColor={COLORS.textMuted}
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.joinBtn, isConnecting && styles.disabledBtn]}
            disabled={isConnecting}
            onPress={handleJoin}
          >
            <Text style={styles.joinBtnText}>{isConnecting ? 'Connecting...' : 'Join Room'}</Text>
          </TouchableOpacity>
        </View>

        {/* Offline */}
        <TouchableOpacity
          style={styles.offlineBtn}
          onPress={() => {
            disconnectRoom();
            setMode('local');
            router.push('/setup');
          }}
        >
          <Text style={styles.offlineBtnText}>Offline Pass & Play</Text>
        </TouchableOpacity>

        {/* Server Settings (collapsible) */}
        <TouchableOpacity
          style={styles.settingsToggle}
          onPress={() => setShowServerSettings(prev => !prev)}
        >
          <Text style={styles.settingsToggleText}>
            ⚙ Server Settings {showServerSettings ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        {showServerSettings && (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://your-server:4000"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.settingsHint}>
              For local play, use your computer's IP (e.g. http://192.168.0.10:4000).{'\n'}
              For remote play, use your deployed server URL.
            </Text>
          </View>
        )}

        {/* Quick Rules */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Quick Poker Rules</Text>
          <Text style={styles.rulesText}>• Each hand has 4 betting rounds: pre-flop, flop, turn, river.</Text>
          <Text style={styles.rulesText}>• On your turn: fold, check, call, bet, raise, or go all-in.</Text>
          <Text style={styles.rulesText}>• Best 5-card hand at showdown wins the pot.</Text>
          <TouchableOpacity
            style={styles.rulesLinkBtn}
            onPress={() => Linking.openURL('https://www.wsop.com/poker-hands/')}
          >
            <Text style={styles.rulesLinkText}>Full poker rules</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>v1.0.0 • Made for poker nights</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.md,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoEmoji: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.display,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
  },
  featureIcon: {
    fontSize: 16,
  },
  featureText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  cardDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.surfaceHighlight,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
  },
  joinBtn: {
    backgroundColor: COLORS.felt,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  joinBtnText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  offlineBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceHighlight,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  offlineBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  settingsToggle: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  settingsToggleText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  settingsLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  settingsHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
  },
  rulesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  rulesTitle: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  rulesText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
  rulesLinkBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  rulesLinkText: {
    color: COLORS.info,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.md,
  },
});
