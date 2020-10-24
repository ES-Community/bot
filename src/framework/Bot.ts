import { Client } from 'discord.js';
import pino from 'pino';

export interface BotOptions {
  token?: string;
}

export default class Bot {
  private token?: string;
  // @ts-expect-error: The client must be constructed when "start()" is called,
  // because it keeps the process alive.
  private client: Client;
  private started = false;

  public logger: pino.Logger;

  public constructor(options: BotOptions = {}) {
    this.token = options.token;
    this.logger = pino();
  }

  public async start(): Promise<void> {
    if (this.started) {
      throw new Error('Bot can only be started once');
    }
    this.started = true;
    this.client = new Client();
    try {
      await this.client.login(this.token);
    } catch (error) {
      this.started = false;
      throw error;
    }
  }

  public stop(): void {
    if (!this.started) {
      throw new Error('Bot was not started');
    }
    this.client.destroy();
    this.started = false;
  }
}
