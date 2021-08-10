/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { Snowflake, Interaction, Constants } from 'discord.js';
import type { Bot } from '../Bot.js';
import type { Command } from './Command.js';
import { createCommandData } from './helpers.js';

export class CommandManager {
  /**
   * Registered slash commands.
   */
  public readonly commands = new Map<Snowflake, Command>();

  private bot!: Bot;
  private holds?: Command[];

  public constructor(holds: Command[]) {
    this.holds = holds;
    this._interactionHandler = this._interactionHandler.bind(this);
  }

  public async _interactionHandler(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) {
      return;
    }

    const command = this.commands.get(interaction.commandId);

    if (!command) {
      return this.bot.logger
        .child({ id: randomUUID(), type: 'CommandManager' })
        .error(
          'unknown command %s (id: %s)',
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
          interaction.options.data.map((option) => [
            option.name,
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

    const registeredCommands = (
      await bot.client.application.commands.fetch()
    ).clone();

    for (const command of this.holds!) {
      const commandData = createCommandData(command);
      const registeredCommand = registeredCommands.find((command) =>
        isDeepStrictEqual(
          {
            name: command.name,
            description: command.description,
            options: command.options.map(({ type, ...option }) => ({
              type: Constants.ApplicationCommandOptionTypes[type],
              ...option,
            })),
            defaultPermission: command.defaultPermission,
          },
          commandData,
        ),
      );

      if (registeredCommand) {
        this.commands.set(registeredCommand.id, command);
        registeredCommands.delete(registeredCommand.id);
      } else {
        bot.logger
          .child({ id: randomUUID(), type: 'CommandManager' })
          .warn(
            "The command '%s' is not registered or not up to date with the local command. Please run the migrations before starting the bot",
            command.name,
          );
      }
    }

    for (const command of registeredCommands.values()) {
      bot.logger
        .child({ id: randomUUID(), type: 'CommandManager' })
        .warn(
          "The registered command '%s' doesn't exist locally. Please run the migrations before starting the bot",
          command.name,
        );
    }

    // We don't need this.holds anymore.
    delete this.holds;

    this.bot.client.on('interactionCreate', this._interactionHandler);
  }

  public async stop(bot: Bot): Promise<void> {
    bot.client.off('interactionCreate', this._interactionHandler);
  }
}
