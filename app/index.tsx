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
  const { connectToRoom } = useGame();
  const [roomCode, setRoomCode] = useState('POKER1');
  const [playerName, setPlayerName] = useState('Player');
  const [serverUrl, setServerUrl] = useState('http://192.168.0.11:4000');

  const handleOnline = async (create: boolean) => {
    const res = await connectToRoom({
      roomCode,
      playerName,
      serverUrl,
      create,
    });
    if (!res.ok) {
      Alert.alert('Connection failed', res.error || 'Could not connect to room.');
      return;
    }
    router.push(create ? '/setup' : '/game');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo area */}
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
          <FeatureItem icon="📱" text="Pass & play" />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/setup')}
          >
            <Text style={styles.primaryBtnText}>New Game</Text>
          </TouchableOpacity>

          <View style={styles.onlineCard}>
            <Text style={styles.onlineTitle}>Online Room (server-hosted)</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              placeholder="Server URL"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={styles.input}
              value={roomCode}
              onChangeText={text => setRoomCode(text.toUpperCase())}
              autoCapitalize="characters"
              placeholder="Room Code"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Your Name"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.onlineButtons}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleOnline(true)}>
                <Text style={styles.secondaryBtnText}>Create Room</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleOnline(false)}>
                <Text style={styles.secondaryBtnText}>Join Room</Text>
              </TouchableOpacity>
            </View>
          </View>

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
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
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
    marginBottom: SPACING.xxxl,
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
  actions: {
    gap: SPACING.md,
  },
  onlineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  onlineTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.surfaceHighlight,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  onlineButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.felt,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontWeight: '700',
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
  primaryBtn: {
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
  primaryBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xxl,
  },
});
