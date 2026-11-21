# SAKHI Mobile Implementation Status & Roadmap

## Phase 1 (Scaffold, Auth, Theme, Navigation) — DONE
- Native splash screen and theme system (`theme/`).
- Authentication scaffold (`mobile/app/(auth)/`).
- Tab navigation (`mobile/app/(tabs)/`).
- Token-based API client with automatic Bearer token attachment (`mobile/lib/api.ts`).

## Phase 2 (Onboarding, Dashboard, Her Mode, Pregnancy, Profile) — DONE
- Onboarding flow (`mobile/app/onboarding/index.tsx`) with `/api/onboarding`.
- Dashboard tab (`mobile/app/(tabs)/dashboard.tsx`) with `/api/dashboard-data`.
- Her Mode tab (`mobile/app/(tabs)/her-mode.tsx`) with `/api/daily-log`, `/api/period-start`, `/api/pain-log`, `/api/cycle-logs`, `/api/predict`.
- Pregnancy tab (`mobile/app/(tabs)/pregnancy.tsx`) with `/api/pregnancy-data`, `/api/pregnancy-log`, `/api/pregnancy-appointments`, `/api/weight`.
- Profile tab (`mobile/app/(tabs)/profile.tsx`) with `/api/profile`, `/api/update-profile`, `/api/preferences`.
- Local date handling via `mobile/lib/date.ts` (`localIso()`, `apiDateToLocal()`).

## Phase 3 (Chat, Triage, Labs, Doctor Brief, Privacy & Export) — DONE
- **Ask Sakhi Chat** (`mobile/app/chat.tsx`):
  - Accessible via chat triggers on Dashboard, Her Mode, and Pregnancy tabs.
  - Dual mode support: `/api/ask-sakhi` (Her Mode) and `/api/ask-sakhi-pregnancy` (Mom Mode).
  - Server history synchronization via `GET /api/chat-history?mode=...` and history deletion via `DELETE /api/chat-history?mode=...`.
  - Contextual prompt recommendations, engine indicator badges, optimistic UI, typing indicator.
  - Graceful 429 rate limit banner handling ("You are sending messages very quickly! Please pause a moment before asking again").
- **Symptom Triage & Pain Relief Toolkit** (`mobile/app/triage.tsx`):
  - Emergency heuristic evaluation and syndrome detection via `POST /api/triage`.
  - Urgency categorization badges (`EMERGENCY`, `SEE_DOCTOR`, `MONITOR`, `NORMAL`).
  - Actionable guidance, suspected profiles, and wellness recommendations.
  - Integrated pain relief steps from `/api/relief?severity=X` with interactive countdown timers and feedback recording (`POST /api/relief`).
  - Medical disclaimer banner exactly matching web copy:
    `Sakhi gives general guidance, not medical advice. In an emergency, call 112. Feeling low? Tele-MANAS: 14416.`
- **Lab Reports & Biomarkers** (`mobile/app/lab-report.tsx`):
  - Blood test and antenatal card photo capture via `expo-image-picker` (camera & photo gallery).
  - AI lab report reading via `POST /api/lab-report/read` using Gemini vision.
  - Manual entry, validation, clinical reference checks via `mobile/lib/labs.ts` (`checkLab`), and saving to `POST /api/lab-report`.
  - Report deletion via `DELETE /api/lab-report`.
- **Doctor Visit Summary Brief** (`mobile/app/doctor-summary.tsx`):
  - 1-page clinical summary via `/api/doctor-summary?mode=her|pregnancy&days=90`.
  - Patient stats, cycle / pregnancy overview, PCOS risk screen, anaemia screen, mood flag, latest labs, and medication adherence.
  - Shareable PDF generation using `expo-print` and native sharing via `expo-sharing`.
  - Clinical decision support disclaimer matching web copy.
- **Privacy Choices & Consent** (`mobile/app/consent.tsx`):
  - AI processing and private mode controls via `GET`, `POST`, and `PATCH /api/consent`.
  - Data protection compliance aligned with India's DPDP Act.
- **Data Portability & Deletion** (in `mobile/app/(tabs)/profile.tsx`):
  - "Export My Data": exports all documents and cycle logs via `GET /api/export-data` and shares as PDF/JSON via `expo-sharing`.
  - "Delete All My Data": 2-step destructive confirmation invoking `POST /api/reset-data` and signing out.

---

## Known Issues & Notes for Future Phases

### 1. On-Device OCR Fallback (Tesseract.js)
- **Web behavior**: The web app uses `tesseract.js` for on-device browser OCR when Gemini AI reading is disabled or unavailable.
- **Native behavior**: `tesseract.js` requires browser Web Workers, Canvas, and DOM APIs that are not available in React Native. The mobile app utilizes server-side Gemini AI vision via `POST /api/lab-report/read`, with full manual verification and editing. For future offline OCR, a native library (such as Google MLKit Text Recognition) can be integrated.

### 2. Voice Input & Speech-to-Text
- **Web behavior**: Voice recognition in the web app relies directly on the browser Web Speech API (`window.webkitSpeechRecognition`).
- **Backend support**: `frontend/app/api/voice/speak` only handles text-to-speech generation via Gemini TTS, falling back to browser `window.speechSynthesis`. There is no backend transcription/STT endpoint.
- **Mobile roadmap**: Future native implementation will integrate an on-device speech-to-text package (`@react-native-voice/voice` or `expo-audio` with a cloud transcription API).

### 3. Native Authentication & Endpoints
- [ ] `POST /api/auth/native/login` returning JWT bearer token for native clients (NextAuth web login currently relies on httpOnly cookies).
- [ ] Bearer-token verification middleware across backend routes.
- [ ] Native Google OAuth token exchange via `expo-auth-session`.
- [ ] Native password reset confirmation endpoints.
- [ ] Native push notification token registration (`expo-notifications`).
