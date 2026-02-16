# Poker Chips 🃏

A mobile poker chip tracking app for Android & iOS — no physical chips needed. Built with React Native + Expo.

## Features

- **2-8+ Players** — Add players at setup or mid-game
- **Chip Tracking** — Full chip count management per player
- **Betting Actions** — Fold, Check, Call, Bet, Raise, All-In
- **Pot Management** — Automatic pot tracking with split pot support
- **Blind System** — Configurable small/big blinds
- **Dealer Rotation** — Automatic dealer button advancement
- **Betting Presets** — Quick bet buttons (½ pot, ¾ pot, pot, min, max)
- **Hand History** — Action log with round labels (pre-flop/flop/turn/river)
- **Pass & Play** — One device, pass it around the table
- **Online Room Mode** — Server-hosted room for multiple phones
- **Turn Timer** — Optional decision countdown per player
- **Undo + Admin Tools** — Undo last action, edit chip stacks, add players mid-game
- **Hand Rankings Button** — In-game quick reference for all poker hands

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

### Online Room Server (optional)

Run this if you want everyone to connect with their own phone:

```bash
# in project root
npm run server
```

Default server URL is `http://<your-lan-ip>:4000`.
All phones must be on the same network unless you deploy this server publicly.

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
- Local state + optional Socket.IO room sync

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