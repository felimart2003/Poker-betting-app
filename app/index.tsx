import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
        </View>

        <Text style={styles.version}>v1.0.0 • Made for poker nights</Text>
      </View>
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
    flex: 1,
    justifyContent: 'center',
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
