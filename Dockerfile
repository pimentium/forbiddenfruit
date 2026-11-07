# syntax=docker/dockerfile:1

# --- build the client ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY client client
# URL prefix the app is served under, e.g. /forbiddenfruit/ behind a reverse proxy that strips it (default: root).
ARG BASE_PATH=/
ENV BASE_PATH=$BASE_PATH
# Optional Google Analytics 4 measurement ID (G-XXXXXXXXXX), baked into the client. Empty: no analytics code.
ARG VITE_GA_MEASUREMENT_ID=
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID
RUN npm run build

# --- run: API + built client ----------------------------------------------------------------------
FROM node:22-alpine
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server server
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/api/countries || exit 1
CMD ["node_modules/.bin/tsx", "server/index.ts"]
