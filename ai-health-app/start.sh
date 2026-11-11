#!/bin/bash
# Starts the two SAKHI tiers: the FastAPI ML service and the Next.js frontend.
# (Next.js API routes do the orchestration; there is no separate Express backend.)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Kill any existing processes on ports 8000, 3000
echo "Cleaning up ports..."
npx --yes kill-port 8000 3000 2>/dev/null

# 1. Start FastAPI ML Service
echo "Starting FastAPI ML Service on port 8000..."
cd "$SCRIPT_DIR/ml-service" || exit 1
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
python -m uvicorn main:app --host 127.0.0.1 --port 8000 &
ML_PID=$!

# 2. Start Next.js Frontend (lives at <repo>/frontend)
echo "Starting Next.js Frontend on port 3000..."
cd "$REPO_ROOT/frontend" || exit 1
npm run dev &
FRONTEND_PID=$!

echo "All services launching. Press Ctrl+C to terminate all."
trap "kill $ML_PID $FRONTEND_PID; exit" INT TERM
wait
