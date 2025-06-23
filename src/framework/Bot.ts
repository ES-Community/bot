import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Client } from 'discord.js';
import type { Logger } from 'pino';
import { pino, transport } from 'pino';

import type { Base, BaseConfig } from './Base.js';
import { Cron } from './Cron.js';
import { FormatChecker } from './FormatChecker.js';

function toPath(pathOrUrl: string | URL): string {
  if (typeof pathOrUrl === 'string') return pathOrUrl;
  return fileURLToPath(pathOrUrl);
}

export interface BotOptions {
  /**
   * Discord token.
   * Defaults to `process.env.DISCORD_TOKEN`.
   */
  token?: string;
  /**
   * Directory that contains the `Cron` definitions.
   */
  crons?: string | URL;
  /**
   * Directory that contains the `FormatChecker` definitions.
   */
  formatCheckers?: string | URL;
}

type Constructor<T extends Base, U extends BaseConfig> = new (config: U) => T;

export class Bot {
  private readonly options: BotOptions;
  private readonly token?: string;
  private _client: Client | null;
  private crons: Cron[] = [];
  private formatCheckers: FormatChecker[] = [];

  public readonly logger: Logger;

  public constructor(options: BotOptions = {}) {
    this.options = options;
    this.token = options.token;
    this._client = null;
    this.logger = pino(transport({ target: 'pino-pretty' }));
  }

  private async loadDirectories() {
    if (this.options.crons) {
      this.crons = await this.loadDirectory(
        toPath(this.options.crons),
        'crons',
        Cron,
      );
    }
    if (this.options.formatCheckers) {
      this.formatCheckers = await this.loadDirectory(
        toPath(this.options.formatCheckers),
        'format-checkers',
        FormatChecker,
      );
    }
  }

  private async loadDirectory<T extends Base, U extends BaseConfig>(
    directory: string,
    name: string,
    constructor: Constructor<T, U>,
  ): Promise<T[]> {
    let list: string[];
    try {
      list = await fs.readdir(directory);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `Failed to load "${name}" in ${directory}. Directory could not be read`,
        );
      }
      throw error;
    }

    const allExportsPromises = list
      .filter((file) => {
        const extension = path.extname(file);
        // Ignore non-source files (such as ".map")
        return ['.js', '.ts'].includes(extension);
      })
      .map(async (file) => {
        const filePath = path.join(directory, file);
        const value = await import(pathToFileURL(filePath).href);
        if (!value.default || !(value.default instanceof constructor)) {
          throw new Error(
            `${filePath} must export an instance of ${constructor.name}`,
          );
        }
        return value.default as T;
      });

    const allExports = await Promise.all(allExportsPromises);
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
    for (const cron of this.crons) cron.start(this);
  }

  private stopCrons() {
    for (const cron of this.crons) cron.stop();
  }

  private startFormatCheckers() {
    for (const formatChecker of this.formatCheckers) formatChecker.start(this);
  }

  private stopFormatCheckers() {
    for (const formatChecker of this.formatCheckers) formatChecker.stop(this);
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
    await this.loadDirectories();
    this._client = new Client({
      intents: ['Guilds', 'GuildMessages', 'MessageContent'],
    });
    try {
      await Promise.all([
        this.client.login(this.token),
        once(this.client, 'ready'),
      ]);
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
  public stop(): void {
    if (!this._client) {
      throw new Error('Bot was not started');
    }
    this.stopCrons();
    this.stopFormatCheckers();
    this._client.destroy();
    this._client = null;
  }
}
