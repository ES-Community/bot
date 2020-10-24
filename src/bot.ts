import path from 'path';

import 'make-promises-safe';
import * as Dotenv from 'dotenv';

import { Bot } from './framework';

Dotenv.config();

const bot = new Bot({
  token: process.env.DISCORD_TOKEN,
  crons: path.join(__dirname, 'crons'),
});

bot.start().then(() => {
  bot.logger.info('Bot started');
});
