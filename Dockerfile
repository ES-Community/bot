FROM node:16.17.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV production
RUN npm ci --omit=dev && npm cache clean --force

CMD [ "bash", "start.sh" ]
