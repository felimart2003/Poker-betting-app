import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from '../src/GameContext';
import { COLORS } from '../src/theme';

export default function RootLayout() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="setup"
          options={{
            title: 'Game Setup',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="game"
          options={{
            title: 'Poker Table',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </GameProvider>
  );
}
