import { ApplicationCommandData } from 'discord.js';
import { Command } from './Command.js';

export const createCommandData = (
  command: Command,
): ApplicationCommandData => ({
  name: command.name,
  description: command.description,
  defaultPermission: command.enabled,
  options:
    command.options &&
    (Object.entries(command.options).map(([key, value]) => ({
      name: key,
      required: false,
      choices: undefined,
      ...value,
      options: undefined,
    })) as any),
});
