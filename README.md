# Sakhi - AI Health App

Sakhi is a secure, personalized health tracking application powered by localized insights and AI. It allows users to log symptoms, calculate risk profiles, and maintain a secure health profile.

## 🚀 Features

- **Personalized Dashboard**: Track your age, BMI, and other vital stats securely.
- **AI-Powered Insights**: Advanced analytics and insights for health monitoring.
- **Secure Authentication**: Built with NextAuth for seamless and secure sign-ins (Google OAuth / Credentials).
- **PostgreSQL Database**: Robust and reliable data storage for user health profiles and logs.
- **Modern UI/UX**: Beautiful, responsive interface built with Next.js, Tailwind CSS, and Framer Motion.

## 💻 Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion & Anime.js
- **Authentication**: NextAuth.js
- **Icons**: Phosphor Icons

### Backend & Database
- **Database**: PostgreSQL (via Supabase/hosted Postgres)
- **ML Service**: Python (for AI health insights)

## 🛠️ Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Python 3.11 (for the ML service)
- PostgreSQL database

### 1. Setup Environment Variables
In the `frontend` directory, create a `.env.local` file and add the following keys:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_secret_key

# Google OAuth (If using Google Sign-in)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database (optional: without it data is stored in frontend/.data/)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Gemini (optional: without it chat uses the offline engine)
GEMINI_API_KEY=your_gemini_api_key

# ML service (optional: without it the TypeScript model copy is used)
ML_SERVICE_URL=http://127.0.0.1:8000
```

### 2. Install Dependencies & Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

### 3. (Optional) Run ML Service
```bash
cd ai-health-app/ml-service
pip install -r requirements.txt
uvicorn main:app --port 8000
```
Then set `ML_SERVICE_URL=http://127.0.0.1:8000` in `frontend/.env.local`. If the service is not running, the app scores with an identical TypeScript copy of the models (`frontend/lib/ml/`), so every feature still works.

## 🧠 Risk models
Models are standardized logistic regressions trained on public datasets and stored as plain JSON (`ai-health-app/ml-service/models/risk_models.json`, mirrored to `frontend/lib/ml/risk_models.json`). Each prediction returns its top drivers, clinical rule flags and a model card.

| Screen | Data / method | 5-fold CV |
|---|---|---|
| Preeclampsia / maternal risk | UCI Maternal Health Risk (452 unique rows) + ACOG BP thresholds | ROC-AUC 0.84, sensitivity 0.87 at screening cutoff |
| Gestational diabetes | Pima Indians Diabetes (768 rows) + DIPSI ≥140 mg/dL rule | ROC-AUC 0.83, sensitivity 0.85 at screening cutoff |
| PCOS | Rotterdam criteria (rule-based; no open dataset with matching inputs) | — |
| Thyroid | Symptom screen (rule-based) | — |
| Cycle | Cycle statistics (21–35 day normal range, >9 day variation flagged) | — |

Retrain: `python train_models.py` (datasets and citations in `ai-health-app/ml-service/data/README.md`).
Check that the Python and TypeScript copies agree: `python scripts/check_parity.py`.

## 💾 Data & privacy
- All user data goes through one store (`frontend/lib/store.ts`): Postgres table `user_documents` when `DATABASE_URL` is set, otherwise a local JSON file (`SAKHI_DATA_DIR`, default `frontend/.data/`), with httpOnly cookies as the last resort. Guests get their own isolated id.
- First use shows a consent screen. Declining AI processing keeps chat working with the offline engine, so no message is sent to Gemini.
- Settings → **Download my data** (`/api/export-data`) and **Delete all my data** (`/api/reset-data`).
- Chat is rate-limited, security headers are set, and `/api/*` responses are never cached. `NEXTAUTH_SECRET` is required in production.

## 🎬 Demo
See [DEMO.md](DEMO.md) for the 2-minute walkthrough. The onboarding page has one-click **Her Mode demo** / **Mom Mode demo** accounts, and **Doctor summary** produces a printable PDF.

## 🌐 Deployment
This project is configured for easy deployment on **Vercel**.
Ensure that all environment variables (especially `NEXTAUTH_URL` and `NEXTAUTH_SECRET`) are properly configured in your Vercel project settings.

---
*Built by NextGen Creators*
