// Must be imported first so it runs before other files.
import './setup-env.js';

import { Bot } from './framework/index.js';

const bot = new Bot(process.env.DISCORD_TOKEN);

await bot.start({
  commands: new URL('commands/', import.meta.url),
  crons: new URL('crons/', import.meta.url),
  formatCheckers: new URL('format-checkers/', import.meta.url),
});

bot.logger.info('Bot started');
