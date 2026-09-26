# ── Stage 1: build the React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ── Stage 2: API + WebSocket server that also serves the built frontend ───────
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .
COPY --from=frontend /app/dist ./static

RUN useradd --create-home app && chown -R app /app
USER app

EXPOSE 8000
CMD ["sh", "./docker-entrypoint.sh"]
