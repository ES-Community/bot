import path from 'path';

import * as Dotenv from 'dotenv';
import { cleanEnv, str, url } from 'envalid';

import { Bot } from './framework';

Dotenv.config();

const env = cleanEnv(process.env, {
  DISCORD_TOKEN: str(),
  DATABASE_URL: url(),
});

const bot = new Bot({
  token: env.DISCORD_TOKEN,
  databaseUrl: env.DATABASE_URL,
  crons: path.join(__dirname, 'crons'),
  formatCheckers: path.join(__dirname, 'format-checkers'),
});

bot.start().then(() => {
  bot.logger.info('Bot started');
});
