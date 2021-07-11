import { once } from 'events';
import fs from 'fs';
import path from 'path';

import { Client, Intents } from 'discord.js';
import pino from 'pino';

import { Base, BaseConfig } from './Base';
import { Command, CommandManager } from './command';
import { Cron } from './Cron';
import { FormatChecker } from './FormatChecker';

export interface BotOptions {
  /**
   * Discord token.
   * Defaults to `process.env.DISCORD_TOKEN`.
   */
  token?: string;
  /**
   * Directory that contains the `Command` definitions.
   */
  commands?: string;
  /**
   * Directory that contains the `Cron` definitions.
   */
  crons?: string;
  /**
   * Directory that contains the `FormatChecker` definitions.
   */
  formatCheckers?: string;
}

type Constructor<T extends Base, U extends BaseConfig> = {
  new (config: U): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  new <Any>(config: U): T;
};

export class Bot {
  private readonly token?: string;
  private _client: Client | null;
  private commandManager?: CommandManager;
  private crons: Cron[] = [];
  private formatCheckers: FormatChecker[] = [];

  public readonly logger: pino.Logger;

  public constructor(options: BotOptions = {}) {
    this.token = options.token;
    this._client = null;
    this.logger = pino();

    if (options.commands) {
      this.commandManager = new CommandManager(
        this.loadDirectory(options.commands, 'commands', Command),
      );
    }

    if (options.crons) {
      this.crons = this.loadDirectory(options.crons, 'crons', Cron);
    }

    if (options.formatCheckers) {
      this.formatCheckers = this.loadDirectory(
        options.formatCheckers,
        'format-checkers',
        FormatChecker,
      );
    }
  }

  private loadDirectory<T extends Base, U extends BaseConfig>(
    directory: string,
    name: string,
    constructor: Constructor<T, U>,
  ): T[] {
    let list: string[];
    try {
      list = fs.readdirSync(directory);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `Failed to load "${name}" in ${directory}. Directory could not be read`,
        );
      }
      throw err;
    }

    const allExports = list
      .filter((file) => {
        const ext = path.extname(file);
        // Ignore non-source files (such as ".map")
        return ['.js', '.ts'].includes(ext);
      })
      .map((file) => {
        const filePath = path.join(directory, file);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const value = require(filePath);
        if (
          !value ||
          !value.default ||
          !(value.default instanceof constructor)
        ) {
          throw new Error(
            `${filePath} must export an instance of ${constructor.name}`,
          );
        }
        return value.default as T;
      });

    const enabledExports = allExports.filter((element) => element.enabled);

    if (enabledExports.length === allExports.length) {
      this.logger.info(`Loaded ${enabledExports.length} ${constructor.name}`);
    } else {
      this.logger.info(
        `Loaded ${enabledExports.length} ${constructor.name} (${
          allExports.length - enabledExports.length
        } disabled)`,
      );
    }

    return enabledExports;
  }

  private startCrons() {
    this.crons.forEach((cron) => cron.start(this));
  }

  private stopCrons() {
    this.crons.forEach((cron) => cron.stop());
  }

  private startFormatCheckers() {
    this.formatCheckers.forEach((formatChecker) => formatChecker.start(this));
  }

  private stopFormatCheckers() {
    this.formatCheckers.forEach((formatChecker) => formatChecker.stop(this));
  }

  /**
   * Returns the discord.js Client instance.
   * The bot must be started first.
   */
  public get client(): Client {
    if (!this._client) {
      throw new Error('Bot was not started');
    }
    return this._client;
  }

  /**
   * Start the bot by connecting it to Discord.
   */
  public async start(): Promise<void> {
    if (this._client) {
      throw new Error('Bot can only be started once');
    }
    this._client = new Client({
      intents: new Intents(['GUILDS', 'GUILD_MESSAGES']),
    });

    try {
      await Promise.all([
        this.client.login(this.token),
        once(this.client, 'ready'),
      ]);
      if (this.commandManager) {
        await this.commandManager.start(this);
      }
      this.startCrons();
      this.startFormatCheckers();
    } catch (error) {
      this._client = null;
      throw error;
    }
  }

  /**
   * Stop the bot.
   */
  public async stop(): Promise<void> {
    if (!this._client) {
      throw new Error('Bot was not started');
    }
    if (this.commandManager) {
      await this.commandManager.stop(this);
    }
    this.stopCrons();
    this.stopFormatCheckers();
    this._client.destroy();
    this._client = null;
  }
}
