import 'make-promises-safe';
import * as Dotenv from 'dotenv';

import Bot from './framework/Bot';

Dotenv.config();

const bot = new Bot({ token: process.env.DISCORD_TOKEN });

bot.start().then(() => {
  bot.logger.info('Bot started');
});
