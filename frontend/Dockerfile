# ---------- Stage 1: build the Vite bundle ----------
FROM node:22-alpine AS build
WORKDIR /app

# Vite inlines env at BUILD time. Single-origin deploy: the API is served from the SAME
# host as the SPA (nginx proxies /api + /oauth2/authorization to the backend), so these
# are RELATIVE paths — no CORS, and they work behind any domain the tunnel points at.
ARG VITE_API_URL=/api
ARG VITE_API_URL_FOR_GOOGLE=/oauth2/authorization/google
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_URL_FOR_GOOGLE=$VITE_API_URL_FOR_GOOGLE

COPY package*.json ./
RUN npm ci
COPY . .
# Deploy build = `vite build` only (esbuild transpile), NOT `npm run build` (which is
# `tsc -b && vite build`). We deploy each branch's code AS-IS to compare versions faithfully;
# a stray unused-var/type error must not block a deploy. Type-checking is a pre-commit/CI gate,
# not the deploy image's job — the runtime bundle is identical either way.
RUN npx vite build

# ---------- Stage 2: serve static + reverse-proxy ----------
FROM nginx:1.27-alpine
# Template: the nginx entrypoint runs envsubst and writes /etc/nginx/conf.d/default.conf,
# filling in ${BACKEND_HOST} (set per container). Lets ONE image serve both versions.
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
