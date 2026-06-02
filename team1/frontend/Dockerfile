# syntax=docker/dockerfile:1
# Multi-stage build for the CRA/craco frontend, served by nginx.

# ---- build the static bundle ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# REACT_APP_* values are baked in at build time. Override with --build-arg.
ARG REACT_APP_API_BASE=http://localhost:5000
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
# CI=false so CRA does not treat lint warnings as build-breaking errors.
ENV CI=false
RUN npm run build

# ---- serve with nginx ----
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
