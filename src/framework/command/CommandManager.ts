/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { randomUUID } from 'crypto';
import { Snowflake, Interaction } from 'discord.js';
import type { Bot } from '../Bot';
import { Command } from './Command';

export class CommandManager {
  /**
   * Registered slash commands.
   */
  public readonly commands = new Map<Snowflake, Command>();

  private bot!: Bot;

  public constructor(private holds: Command[]) {
    this._interactionHandler = this._interactionHandler.bind(this);
  }

  public async _interactionHandler(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) {
      return;
    }

    const command = this.commands.get(interaction.commandId);

    if (!command) {
      return this.bot.logger
        .child({
          id: randomUUID(),
          type: 'CommandManager',
        })
        .error(
          'unregistred slash command %s (id: %s)',
          interaction.commandName,
          interaction.commandId,
        );
    }

    const logger = this.bot.logger.child({
      id: randomUUID(),
      type: 'Command',
      commandName: command.name,
    });

    try {
      logger.debug('execute command handler');
      await command.handler({
        client: this.bot.client,
        logger,
        interaction,
        args: Object.fromEntries(
          interaction.options.data.map((option, name) => [
            name,
            (option.member ??
              option.user ??
              option.channel ??
              option.role ??
              option.value) as any,
          ]),
        ),
      });
    } catch (error) {
      logger.error(error, 'command handler error');
    }
  }

  public async start(bot: Bot): Promise<void> {
    this.bot = bot;

    await Promise.all(
      this.holds.map(async (hold) => {
        // The application cannot be null if the Client is ready.
        const command = await this.bot.client.application!.commands.create(
          {
            name: hold.name,
            description: hold.description,
            defaultPermission: hold.defaultPermission,
            options:
              hold.options &&
              (Object.entries(hold.options).map(([key, value]) => ({
                name: key,
                ...value,
              })) as any),
          },
          hold.guildId as any,
        );
        this.commands.set(command.id, hold);
      }),
    );

    // We don't need this.holds anymore.
    this.holds = [];

    this.bot.client.on('interactionCreate', this._interactionHandler);
  }

  public async stop(bot: Bot): Promise<void> {
    bot.client.off('interactionCreate', this._interactionHandler);

    // Unregister *all* registered slash commands.
    await Promise.all(
      // The application cannot be null if the Client is ready.
      (
        await bot.client.application!.commands.fetch()
      ).map((command) => command.delete()),
    );
  }
}
