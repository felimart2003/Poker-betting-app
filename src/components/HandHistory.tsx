import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';

interface HandHistoryProps {
  history: string[];
}

export function HandHistory({ history }: HandHistoryProps) {
  if (history.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={history}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => {
          const isHeader = item.startsWith('---');
          return (
            <Text style={[styles.entry, isHeader && styles.headerEntry]}>
              {item}
            </Text>
          );
        }}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    maxHeight: 160,
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
  },
  entry: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    paddingVertical: 2,
  },
  headerEntry: {
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
});
