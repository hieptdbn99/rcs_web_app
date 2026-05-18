# syntax=docker/dockerfile:1.6

# ─── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── Stage 2: build Next.js (standalone) ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Use next directly to bypass the npm "postbuild" hook (which runs build_usb.py)
RUN npx next build

# ─── Stage 3: runtime image ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV HTTPS_PORT=3443
ENV TARGET_PORT=3000

# openssl is used by the entrypoint to auto-generate a self-signed cert.
# tini gives us proper signal handling for `docker stop`.
RUN apk add --no-cache openssl tini

# Next standalone output ships a minimal server.js + only the node_modules it needs.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Runtime helpers
COPY docker/https-proxy.js ./https-proxy.js
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Persist auto-generated certificates across container restarts when a volume is mounted.
VOLUME ["/app/certificates"]

# 3000 = HTTP (Next standalone), 3443 = HTTPS (proxy, needed for phone camera QR)
EXPOSE 3000 3443

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
