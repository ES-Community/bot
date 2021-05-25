import path from 'path';

import * as Dotenv from 'dotenv';

import { Bot } from './framework';

Dotenv.config();

const bot = new Bot({
  token: process.env.DISCORD_TOKEN,
  crons: path.join(__dirname, 'crons'),
  formatCheckers: path.join(__dirname, 'format-checkers'),
});

bot.start().then(() => {
  bot.logger.info('Bot started');
});
