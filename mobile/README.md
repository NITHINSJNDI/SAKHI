# SAKHI Mobile

Phase 1 native Expo scaffold for SAKHI. It renders the SAKHI auth experience and tab shell, and calls the existing Next.js API routes over HTTPS. All health logic stays in `frontend/`; this app never talks to the database directly.

## Requirements

- Node.js 20+ and npm
- Expo Go installed on a phone, or an Android/iOS simulator
- The SAKHI web API running somewhere the phone can reach over HTTPS

## Run

```bash
cd mobile
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
# edit .env and set EXPO_PUBLIC_API_URL to your deployed SAKHI host
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS).

Useful commands:

```bash
npx expo start --clear   # clear the Metro cache
npm run typecheck        # tsc --noEmit
npm run doctor           # expo-doctor
npm run lint             # expo lint
```

`EXPO_PUBLIC_API_URL` is inlined at bundle time. Restart the dev server after changing it. Do not use `http://localhost` from a physical device; `localhost` points at the phone. Use your machine's LAN IP (for local backend testing) or a deployed HTTPS host.

## Folder structure

```
mobile/
  app/                    Expo Router routes
    _layout.tsx           fonts, React Query, auth provider, theme-aware stack
    index.tsx             auth-based redirect
    (auth)/               login, signup, reset
    (tabs)/               dashboard, her-mode, pregnancy, profile
  components/             shared native UI (AppText, TextField, AuthShell, ...)
  lib/                    API client, SecureStore, auth context, copy, languages
  theme/                  colors, spacing, typography ported from the web app
  types/                  shared API and auth types
  assets/images/          SAKHI icon/logo and auth preview images
```

Path alias: `@/*` maps to the `mobile/` root (see `tsconfig.json`).

## What works in Phase 1

- Expo SDK 58 + TypeScript strict + Expo Router file-based routing
- NativeWind v4 / Tailwind config, Babel preset, and Metro wiring
- Ported plum/lavender/blush theme with light and dark variants
- Login, signup, and reset screens with the web auth copy and layout direction
- Account creation through `POST /api/auth/register`
- Bearer-token API wrapper with automatic token clearing on `401`
- SecureStore session storage and a `GET /api/me` session check
- Auth-gated tab shell with Dashboard, Her Mode, Pregnancy, and Profile placeholders

## Limitations

Native email/Google sign-in is stubbed because the current backend only issues an httpOnly NextAuth cookie. See `AUTH_NOTES.md`. Password reset and demo workspaces need new backend endpoints; see `TODO.md`.
