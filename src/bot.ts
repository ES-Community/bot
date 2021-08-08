// Must be imported first so it runs before other files.
import './setup-env';

import path from 'path';

import { Bot } from './framework';

const bot = new Bot({
  token: process.env.DISCORD_TOKEN,
  crons: path.join(__dirname, 'crons'),
  formatCheckers: path.join(__dirname, 'format-checkers'),
});

bot.start().then(() => {
  bot.logger.info('Bot started');
});
