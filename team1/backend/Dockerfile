# syntax=docker/dockerfile:1
# Multi-stage build for the MEDviz Express backend.

# ---- deps: install production dependencies only ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# wget (busybox) is used by HEALTHCHECK below.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run as the built-in unprivileged "node" user, not root.
RUN chown -R node:node /app
USER node

ENV PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["node", "server.js"]
