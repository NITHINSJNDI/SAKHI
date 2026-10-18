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

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### 2. Install Dependencies & Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

### 3. (Optional) Run ML Service
If you are running the AI service locally:
```bash
cd ai-health-app/ml-service
pip install -r requirements.txt
python main.py # (or whatever the entrypoint is)
```

## 🌐 Deployment
This project is configured for easy deployment on **Vercel**.
Ensure that all environment variables (especially `NEXTAUTH_URL` and `NEXTAUTH_SECRET`) are properly configured in your Vercel project settings.

---
*Built by NextGen Creators*
