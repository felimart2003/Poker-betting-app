# Poker Chips 🃏

A mobile poker chip tracking app for Android & iOS — no physical chips needed. Built with React Native + Expo.

## Features

- **2-8 Players** — Add your friends by name
- **Chip Tracking** — Full chip count management per player
- **Betting Actions** — Fold, Check, Call, Bet, Raise, All-In
- **Pot Management** — Automatic pot tracking with split pot support
- **Blind System** — Configurable small/big blinds
- **Dealer Rotation** — Automatic dealer button advancement
- **Betting Presets** — Quick bet buttons (½ pot, ¾ pot, pot, min, max)
- **Hand History** — See a log of all actions
- **Pass & Play** — One device, pass it around the table

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Expo Go app on your phone (for testing)

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

Then scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

### Build for Production

```bash
# Android APK
npx eas build --platform android --profile preview

# iOS (requires Apple Developer account)
npx eas build --platform ios --profile preview
```

## How to Play

1. **New Game** → Set player names, starting chips, and blinds
2. **Deal Hand** → Blinds are posted automatically
3. **Take Turns** → Pass the phone to the active player
4. **Bet/Fold/Call** → Use the action buttons at the bottom
5. **Showdown** → Tap the winner(s) to award the pot
6. **Next Hand** → Dealer rotates and a new hand begins

## Tech Stack

- **React Native** + **Expo** (SDK 52)
- **Expo Router** (file-based navigation)
- **TypeScript**
- Pure local state — no backend required

## Project Structure

```
├── app/
│   ├── _layout.tsx        # Root layout + GameProvider
│   ├── index.tsx           # Home screen
│   ├── setup.tsx           # Game setup screen
│   └── game.tsx            # Main game table
├── src/
│   ├── types.ts            # TypeScript types
│   ├── theme.ts            # Colors, spacing, fonts
│   ├── gameState.ts        # Core game logic
│   ├── GameContext.tsx      # React context for state
│   └── components/
│       ├── PlayerCard.tsx   # Player display card
│       ├── BettingControls.tsx  # Bet/fold/call UI
│       ├── PotDisplay.tsx   # Pot & round info
│       └── HandHistory.tsx  # Action log
```

## License

MIT
