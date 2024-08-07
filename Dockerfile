FROM node:22.5.1-bookworm-slim as builder

WORKDIR /app

COPY . .
RUN npm ci && npm run build

FROM node:22.5.1-bookworm-slim as prod

ENV NODE_ENV production

USER node
WORKDIR /app

# Create data dir as node user so Docker volume inherits ownership.
RUN mkdir data

COPY --chown=node:node package*.json knexfile.js start.sh ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node migrations ./migrations
COPY --chown=node:node --from=builder /app/build ./build

CMD [ "bash", "start.sh" ]
