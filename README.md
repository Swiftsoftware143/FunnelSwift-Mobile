# FunnelSwift Mobile

**Capture leads on the go.** Connects to your FunnelSwift account. Every lead instantly syncs to the web dashboard.

## Features

- Manual lead capture with dynamic Add Field dropdown
- Business card scanner with OCR
- NFC tap capture
- QR code lead capture
- Tag and tag group support (system + custom)
- Multi-account switching
- Forgot password / password reset
- GPS location tagging
- Dark theme

## Quick Start

```bash
npm install
npx expo start
```

## Tech Stack

- React Native + Expo
- JWT auth via FunnelSwift API (`funnelswift.net/api/v1`)
- SecureStore for credentials
- Postgres on Miami VPS (same DB as FunnelSwift web)

## Architecture

Mobile app is a thin client. All business logic, sync, and data storage happens on the FunnelSwift Rust backend. The app sends JSON payloads to REST endpoints — no duplicate sync logic needed.

## Build

```bash
npx eas build --platform android --profile preview
```

Requires an Expo account + project set up at expo.dev.

## Repository

https://github.com/swiftsoftware204/FunnelSwift-Mobile
