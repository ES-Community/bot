FROM node:26.13.0-bookworm AS builder

WORKDIR /app

COPY . .
RUN npm ci && npm run build

FROM node:26.13.0-bookworm AS deps

WORKDIR /app

COPY . .
RUN npm ci --omit=dev && npm cache clean --force

FROM node:26.13.0-bookworm-slim AS prod

ENV NODE_ENV production

USER node
WORKDIR /app

# Create data dir as node user so Docker volume inherits ownership.
RUN mkdir data

COPY --chown=node:node package*.json knexfile.js start.sh ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

COPY --chown=node:node migrations ./migrations
COPY --chown=node:node --from=builder /app/build ./build

CMD [ "bash", "start.sh" ]
