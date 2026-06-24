#!/bin/bash
echo "╔══════════════════════════════════════════╗"
echo "║        ESGVision — Startup Script        ║"
echo "╚══════════════════════════════════════════╝"

# Check for Mistral API Key
if [ -z "$MISTRAL_API_KEY" ]; then
  echo ""
  echo "⚠️  WARNING: MISTRAL_API_KEY is not set."
  echo "   Set it with: export MISTRAL_API_KEY=your_key_here"
  echo "   Get your key at: https://console.mistral.ai"
  echo ""
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start Backend
echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
cd "$ROOT_DIR/backend"
MISTRAL_API_KEY=$MISTRAL_API_KEY python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

sleep 2

# Start Frontend
echo "🌐 Starting Vite frontend on http://localhost:3000 ..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Both services started!"
echo "   → Dashboard:  http://localhost:3000"
echo "   → API Docs:   http://localhost:8000/docs"
echo ""
echo "   Press Ctrl+C to stop all services."

# Cleanup on exit
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
