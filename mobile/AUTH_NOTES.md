# Native auth notes

## What the web backend currently does

- `frontend/lib/auth.ts` configures NextAuth v4 with Google + Credentials providers and `session.strategy = "jwt"`.
- Successful login returns an **httpOnly session cookie**. There is no endpoint that returns a bearer/access token.
- API routes read the session with `getServerSession(authOptions)` (for example `frontend/app/api/me/route.ts`).
- `POST /api/auth/register` creates an account and returns the user JSON, but it does **not** create a session.
- There is no password-reset endpoint under `frontend/app/api`.

React Native `fetch` does not share a browser cookie jar with a web login, and httpOnly cookies cannot be read from JavaScript. Therefore Phase 1 cannot implement a real native email login without a backend change.

## What this app does now

- `lib/api.ts` is a typed fetch wrapper. If a token exists in SecureStore, it sends `Authorization: Bearer <token>`. On `401` it clears the token and notifies the auth provider, which signs the user out.
- `lib/auth.tsx` stores the token in SecureStore and validates it with `GET /api/me`.
- `components/auth/AuthForm.tsx`:
  - **Sign up** calls `POST /api/auth/register` with `{ name, email, password, language }` and shows the real API response.
  - **Sign in** validates the fields, then shows an explicit TODO message instead of pretending to authenticate.
  - **Google** and **demo mode** show TODO messages; the web versions rely on NextAuth redirects and cookies.

The token plumbing is intentionally ready for Phase 2. Nothing writes a token yet.

## Native email sign-in (done)

- `POST /api/auth/native/login` { email, password } returns `{ token, expiresAt, user }` (30-day NextAuth-compatible JWT, rate limited 10/min).
- `frontend/lib/sessionUser.ts` `getSessionUser()` accepts the web cookie OR `Authorization: Bearer <token>`; `getOwner()` and the cycle-logs, profile, triage and reset-data routes use it, so every store-backed API works from the app.
- Signup signs the new user in automatically.

## Still to do

- Google: expo-auth-session + a backend route that verifies the Google ID token and calls `issueNativeToken`.
- Demo mode, password reset, token revocation/refresh.

## Session storage

`expo-secure-store` holds the token under `sakhi_access_token` (`lib/secure-store.ts`). Web-only `localStorage`, `useSession`, `signIn`, `window.location`, and NextAuth redirect-query handling were deliberately skipped in the React Native port.
