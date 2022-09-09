FROM node:16.17.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

CMD [ "node", "build/src/bot.js" ]
