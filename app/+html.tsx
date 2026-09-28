import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Poker Chips — Local Poker Tracker</title>
        <meta name="description" content="Track poker chips, bets, blinds and side pots with a free pass-and-play scoreboard that saves locally." />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
