import { randomUUID } from 'node:crypto';

import { CronJob, CronTime } from 'cron';
import { Client, EmbedBuilder } from 'discord.js';
import { Logger } from 'pino';

import { Base, BaseConfig } from './Base.js';
import { Bot } from './Bot.js';
import { findTextChannelByName } from './helpers.js';

export type CronHandler = (context: CronContext) => Promise<void>;

export interface CronConfig extends BaseConfig {
  /**
   * Cron schedule expression.
   * Use https://crontab.guru/ to build your expression.
   */
  schedule: string;
  /**
   * Cron handler. Will be called on schedule after the bot is started.
   */
  handle: CronHandler;
}

export interface CronContext {
  /**
   * Date of the cron execution. Based on the schedule to avoid runtime inaccuracy.
   */
  date: Date;
  /**
   * discord.js Client instance.
   */
  client: Client;
  /**
   * Pino logger.
   */
  logger: Logger;
}

export class Cron extends Base {
  private readonly schedule: string;
  private readonly handler: CronHandler;
  private cronJob: CronJob | null;

  public constructor(config: CronConfig) {
    super(config);
    try {
      new CronTime(config.schedule);
    } catch {
      throw new Error(`Invalid Cron schedule format: "${config.schedule}"`);
    }
    this.schedule = config.schedule;
    this.handler = config.handle;
    this.cronJob = null;
  }

  private async executeJob(date: Date, bot: Bot) {
    const id = randomUUID();
    const logger = bot.logger.child({
      id,
      type: 'Cron',
      cronName: this.name,
    });
    try {
      logger.debug('execute cron handler');
      await this.handler({ date, client: bot.client, logger });
    } catch (error) {
      logger.error(error, 'cron handler error');
      try {
        await findTextChannelByName(bot.client.channels, 'logs').send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Cron run failed')
              .addFields(
                { name: 'Name', value: this.name, inline: true },
                { name: 'Run id', value: id, inline: true },
              )
              .setDescription(`\`\`\`\n${error.stack}\n\`\`\``)
              .setColor('Red'),
          ],
        });
      } catch (error_) {
        logger.error(error_, 'failed to send error to #logs');
      }
    }
  }

  public start(bot: Bot): void {
    const cronJob = CronJob.from({
      cronTime: this.schedule,
      onTick: () => {
        // Returns the theoretical date of the current tick (more precise than `new Date()`.
        const date = cronJob.lastDate() as Date;
        this.executeJob(date, bot);
      },
    });

    this.cronJob = cronJob;
    cronJob.start();
  }

  public stop(): void {
    this.cronJob?.stop();
  }
}
