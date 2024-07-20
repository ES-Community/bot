// Must be imported first, so it runs before other files.
import './setup-environment.js';

import { Bot } from './framework/index.js';

const bot = new Bot({
  token: process.env.DISCORD_TOKEN,
  crons: new URL('crons', import.meta.url),
  formatCheckers: new URL('format-checkers', import.meta.url),
});

await bot.start();

bot.logger.info('Bot started');
