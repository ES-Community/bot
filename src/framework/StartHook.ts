import { Base, type BaseConfig } from './Base.ts';
import { type Client, EmbedBuilder, SnowflakeUtil } from 'discord.js';
import type { Logger } from 'pino';
import type { Bot } from './Bot.ts';
import { randomUUID } from 'node:crypto';
import { findTextChannelByName } from './helpers.ts';

export type StopHookHandler = (context: StartHookContext) => Promise<void>;
export type StartHookHandler = (
  context: StartHookContext,
) => Promise<void | StopHookHandler>;

export interface StartHookConfig extends BaseConfig {
  /**
   * Cron handler. Will be called on schedule after the bot is started.
   */
  handle: StartHookHandler;
}

export interface StartHookContext {
  /**
   * discord.js Client instance.
   */
  client: Client;

  /**
   * Pino logger.
   */
  logger: Logger;
}

export class StartHook extends Base {
  #handle: StartHookHandler;
  #onStop?: StopHookHandler | void;

  constructor(config: StartHookConfig) {
    super(config);

    this.#handle = config.handle;
  }

  async executeHandler<H extends StartHookHandler | StopHookHandler>(
    bot: Bot,
    handle: H,
    stage: 'start' | 'stop',
  ) {
    const id = randomUUID();
    const logger = bot.logger.child({
      id,
      type: 'StartHook',
      cronName: this.name,
    });

    try {
      logger.debug(`execute ${stage} hook handler`);
      const mayBeOnStop = await handle({ client: bot.client, logger });
      if (mayBeOnStop) this.#onStop = mayBeOnStop;
    } catch (error) {
      logger.error(error, `${stage} hook handler error`);

      try {
        await findTextChannelByName(bot.client.channels, 'logs').send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${stage} hook run failed`)
              .addFields(
                { name: 'Name', value: this.name, inline: true },
                { name: 'Run id', value: id, inline: true },
              )
              .setDescription('```\n' + error.stack + '\n```')
              .setColor('Red'),
          ],
          enforceNonce: true,
          nonce: SnowflakeUtil.generate().toString(),
        });
      } catch (error_) {
        logger.error(error_, 'failed to send error to #logs');
      }
    }
  }

  async start(bot: Bot) {
    await this.executeHandler(bot, this.#handle, 'start');
  }

  async stop(bot: Bot) {
    if (!this.#onStop) return;

    await this.executeHandler(bot, this.#onStop, 'stop');
  }
}
