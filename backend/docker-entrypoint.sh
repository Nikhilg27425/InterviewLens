#!/bin/sh
# Container start: migrate, seed the starter problems, then serve.
set -e

echo "→ Applying database migrations…"
python -m app.db.init_db

echo "→ Seeding problem bank…"
python -m app.db.seed

# One worker: live-session WebSocket rooms are held in process memory
echo "→ Starting server on port ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" \
  --proxy-headers --forwarded-allow-ips '*'
