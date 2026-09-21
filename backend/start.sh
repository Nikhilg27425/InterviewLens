#!/usr/bin/env bash
# Start the InterviewLens backend
# Usage: ./start.sh [--reload]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate venv
source .venv/bin/activate

# Create DB tables (safe to run multiple times)
echo "→ Initialising database tables..."
python -m app.db.init_db

# Seed problems
echo "→ Seeding problems..."
python -m app.db.seed

# Start server
echo "→ Starting FastAPI on http://localhost:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 ${1:-} --reload
