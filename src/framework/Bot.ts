import { once } from 'node:events';
import fs from 'node:fs/promises';

import { Client, Intents } from 'discord.js';
import pino from 'pino';

import { Command, CommandManager } from './command/index.js';
import { Base, BaseConfig } from './Base.js';
import { Cron } from './Cron.js';
import { FormatChecker } from './FormatChecker.js';

export interface BotStartOptions {
  /**
   * Directory that contains the `Command` definitions.
   */
  commands?: URL;
  /**
   * Directory that contains the `Cron` definitions.
   */
  crons?: URL;
  /**
   * Directory that contains the `FormatChecker` definitions.
   */
  formatCheckers?: URL;
}

type Constructor<T extends Base, U extends BaseConfig> = {
  new (config: U): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  new <Any>(config: U): T;
};

export class Bot {
  private _client: Client<true> | null;
  private commandManager?: CommandManager;
  private crons: Cron[] = [];
  private formatCheckers: FormatChecker[] = [];

  public readonly logger: pino.Logger;

  /**
   * @param token Discord token. Defaults to `process.env.DISCORD_TOKEN`.
   */
  public constructor(private readonly token?: string) {
    this._client = null;
    this.logger = pino();
  }

  private async loadDirectory<T extends Base, U extends BaseConfig>(
    directory: URL,
    name: string,
    constructor: Constructor<T, U>,
  ): Promise<T[]> {
    let list: string[];
    try {
      list = await fs.readdir(directory);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `Failed to load "${name}" in ${directory}. Directory could not be read`,
        );
      }
      throw err;
    }

    const allExports = await Promise.all(
      list
        .filter((file) => !file.endsWith('.map'))
        .map(async (file) => {
          const filePath = new URL(file, directory);
          // @ts-expect-error Types are not up to date
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = await import(filePath);
          if (!(mod.default instanceof constructor)) {
            throw new Error(
              `${filePath} must export an instance of ${constructor.name}`,
            );
          }
          return mod.default as T;
        }),
    );

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
  public get client(): Client<true> {
    if (!this._client) {
      throw new Error('Bot was not started');
    }
    return this._client;
  }

  /**
   * Start the bot by connecting it to Discord.
   */
  public async start(options: BotStartOptions = {}): Promise<void> {
    if (this._client) {
      throw new Error('Bot can only be started once');
    }
    this._client = new Client({
      intents: new Intents(['GUILDS', 'GUILD_MESSAGES']),
    });

    if (options.commands) {
      this.commandManager = new CommandManager(
        await this.loadDirectory(options.commands, 'commands', Command),
      );
    }

    if (options.crons) {
      this.crons = await this.loadDirectory(options.crons, 'crons', Cron);
    }

    if (options.formatCheckers) {
      this.formatCheckers = await this.loadDirectory(
        options.formatCheckers,
        'format-checkers',
        FormatChecker,
      );
    }

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
