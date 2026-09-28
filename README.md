# Poker Chips

A responsive poker chip tracker for games played with a physical deck. Track bets, blinds, side pots and player stacks on one shared device, without signing in.

**[Open the live demo](https://felimart2003.github.io/Poker-betting-app/)** · [Source](https://github.com/felimart2003/Poker-betting-app)

![Poker table](docs/table.png)

## Features

- Set up 2–8 players, starting stacks, blinds and an optional turn timer.
- Fold, check, call, raise and go all-in, with legal-action validation.
- Heads-up and multiway dealer/blind rotation; automatic betting-round progression.
- Contribution-based side pots, eligible winners and split payouts that preserve every chip.
- Undo recent actions, view hand history, and add players between hands.
- Local autosave and resume across browser reloads.
- Optional Socket.IO rooms: one trusted host controls the scoreboard while guests watch and chat.

This is a scoreboard, not an online poker casino. It does not deal or evaluate cards, process payments, or manage real money. Players determine winners using their physical cards.

## Run locally

Use Node.js 22.13+ (or Node 24) and npm.

```sh
npm ci
npm run web
```

Open the URL printed by Expo. For native development, run `npm start` with a compatible Expo Go/development client; Android/iOS release binaries are not included or verified.

```sh
npm run typecheck
npm test
npm run build
```

The build exports a static web application to `dist/`. GitHub Actions runs type checks, engine and socket integration tests, builds with the repository URL prefix, then deploys to GitHub Pages. Pushes to `main` update the demo. Pages must use **GitHub Actions** as its source.

## Architecture

- **React Native + React Native Web**, **Expo SDK 57**, **Expo Router**, **TypeScript**.
- `src/gameState.ts`: immutable betting engine, chip accounting, side pots and legal actions.
- `src/GameContext.tsx`: orchestration, bounded undo/history, local AsyncStorage persistence and optional room synchronization.
- `app/`: home, setup and table screens; reusable controls live in `src/components/`.
- `server/index.js`: optional Express/Socket.IO room relay with input limits, origin allowlisting, membership checks, host-only state mutation and server-derived chat identities.
- `tools/test.cjs`: 12 engine checks, including 100 generated hands for chip conservation and termination.
- `server/server.test.cjs`: real socket integration coverage for membership, authorization, validation, host transfer, cleanup and origin rejection.

## Optional local room server

The public demo is fully usable in local pass-and-play mode. **No public room backend is deployed.** Rooms need a separately running server:

```sh
npm run server
```

Copy `.env.example` to `.env` for Expo's optional public server URL. Configure `PORT` and `ALLOWED_ORIGINS` in the server process environment; Node does not automatically load this file for `npm run server`. The default relay port is 4000. Enter its URL under the home screen's optional room settings. For LAN use, use your computer's LAN address and allow the exact browser origin. For a public HTTPS frontend, any separately hosted backend must also use HTTPS.

Rooms are ephemeral and disappear when their last member leaves or the server restarts. Room codes are shared access codes; there are no user accounts. The host is trusted to manage scores and host authority transfers on disconnect. This relay is intended for friends on a trusted network, not adversarial or real-money play. Do not expose it as a production multiplayer service without authentication, per-IP limits and persistent storage.

## Privacy and security

The local demo stores table state in your browser only. Anyone sharing that browser profile can see the saved table; clearing site storage removes it. No private credentials belong in `EXPO_PUBLIC_*` variables: those values are bundled publicly. `.env`, generated builds, dependencies and tool output are ignored by Git.

The dependency lockfile is committed. Security overrides pin patched transitive packages, including the URI decoder used by Expo Router; `npm audit` reported zero known vulnerabilities when verified. Continue to run audits as advisories change.
