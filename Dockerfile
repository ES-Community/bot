FROM node:16.17.0-bullseye-slim

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

ENV NODE_ENV production
RUN npm ci --only=production && npm cache clean --force

CMD [ "bash", "start.sh" ]
