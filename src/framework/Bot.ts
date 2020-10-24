import { Client } from 'discord.js';
import pino from 'pino';

export interface BotOptions {
  token?: string;
}

export default class Bot {
  private token?: string;
  private _client: Client | null;

  public logger: pino.Logger;

  public constructor(options: BotOptions = {}) {
    this.token = options.token;
    this._client = null;
    this.logger = pino();
  }

  public get client(): Client {
    if (!this._client) {
      throw new Error('Bot was not started');
    }
    return this._client;
  }

  public async start(): Promise<void> {
    if (this._client) {
      throw new Error('Bot can only be started once');
    }
    this._client = new Client();
    try {
      await this.client.login(this.token);
    } catch (error) {
      this._client = null;
      throw error;
    }
  }

  public stop(): void {
    if (!this._client) {
      throw new Error('Bot was not started');
    }
    this._client.destroy();
    this._client = null;
  }
}
