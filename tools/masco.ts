'use strict';

const TOKEN =
  process.env.DISCORD_TOKEN ??
  (await import('dotenv')).config().parsed?.DISCORD_TOKEN;
if (!TOKEN) {
  throw new Error('DISCORD_TOKEN is missing.');
}
const APPLICATION_ID = atob(TOKEN.split('.')[0]);

import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readdirSync } from 'node:fs';

import { ApplicationCommandData, SnowflakeUtil } from 'discord.js';
import { REST as HttpClient } from '@discordjs/rest';
import {
  Routes,
  RESTGetAPIApplicationCommandsResult,
  RESTPostAPIApplicationCommandsJSONBody,
  APIApplicationCommand,
  RESTPutAPIApplicationCommandsJSONBody,
  RESTPutAPIApplicationCommandsResult,
  Snowflake,
} from 'discord-api-types/v9';

import { Command } from '../src/framework/index.js';
import { createCommandData } from '../src/framework/command/helpers.js';

type APIApplicationCommandData = RESTPostAPIApplicationCommandsJSONBody;

const httpClient = new HttpClient({ version: '9' }).setToken(TOKEN);

const commandsPath = new URL('../src/commands/', import.meta.url);
const registeredCommands = (await httpClient.get(
  Routes.applicationCommands(APPLICATION_ID),
)) as RESTGetAPIApplicationCommandsResult;

async function importCommand(
  fileName: string,
): Promise<APIApplicationCommandData> {
  const filePath = new URL(fileName, commandsPath);

  // @ts-expect-error Types are not up to date
  const mod = await import(filePath);
  if (!(mod.default instanceof Command)) {
    throw new Error(
      `${fileURLToPath(filePath)} must export an instance of Command`,
    );
  }

  const data = createCommandData(mod.default) as ApplicationCommandData &
    APIApplicationCommandData;
  data.default_permission = data.defaultPermission;
  delete data.defaultPermission;
  if (data.options?.length) {
    for (const option of data.options as any) {
      if (option.required === false) delete option.required;
      if (!option.choices?.length) delete option.choices;
      delete option.options;
    }
  } else delete data.options;
  return data;
}

// Limitations:
// A command name can be safely edit, if its description *and* its options have not been changed during the same migration run.
// A command description and/or options can be safely edited, if the name has not been changed during the same migration run.
function findTargetRegisteredCommand({
  name,
  description,
  default_permission,
  options,
}: APIApplicationCommandData):
  | [target: APIApplicationCommand, changed: boolean]
  | undefined {
  for (const command of registeredCommands.values()) {
    const arePartiallyEqual =
      description === command.description &&
      isDeepStrictEqual(options, command.options);

    if (name === command.name)
      return [
        command,
        !arePartiallyEqual || default_permission !== command.default_permission,
      ];
    if (arePartiallyEqual) return [command, true]; // true because the name has changed
  }
}

async function purgeCommands(commandsIgnore?: Snowflake[]) {
  await Promise.all(
    registeredCommands.map(async ({ id, name }) => {
      if (commandsIgnore?.includes(id)) return;
      await httpClient.delete(Routes.applicationCommand(APPLICATION_ID, id));
      console.log(`Command ${name} has been successfully unregistered.`);
    }),
  );
}

const args = process.argv.slice(2);

if (!args[0] || args[0] === 'help') {
  console.log(`
  This tool MAnages Slash COmmands between local and Discord.

  Usage:
    $ masco [command] [command options]

  Commands:
    help       Displays this help message.
    purge      Deletes all registered commands.
    list       Lists all registered commands.
    show       Shows a registered *raw* command specific property (object path).
    migrate    Registers or updates local commands or specific command to Discord.

  Examples:
    $ masco show hello options
    $ masco show hello options.0.description
    $ masco migrate
    $ masco migrate Hello
  `);
  // delete all registered commands
} else if (args[0] === 'purge') {
  purgeCommands();
} else if (args[0] === 'show' && args[1]) {
  let data: any = registeredCommands.find(({ name }) => name === args[1]);
  if (!data) {
    throw new Error('Command not found');
  }
  if (args[2]) {
    const keys = args[2].split('.');
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key in data) data = data[keys[i]];
      else
        throw new Error(
          `The path ${keys.slice(0, i + 1).join('.')} is invalid.`,
        );
    }
  }
  console.dir(data, { depth: Infinity });
  // list all registered commands
} else if (args[0] === 'list') {
  console.table(
    Object.fromEntries(
      registeredCommands.map((command) => [
        command.id,
        {
          name: command.name,
          description: command.description,
          enabled: command.default_permission,
        },
      ]),
    ),
  );
  // migrate only a specific command
} else if (args[0] === 'migrate' && args[1]) {
  const command = await importCommand(args[0]);
  const targetData = await findTargetRegisteredCommand(command);
  if (targetData?.[1]) {
    await httpClient.patch(
      Routes.applicationCommand(APPLICATION_ID, targetData[0].id),
      { body: command },
    );
    console.log(`Command ${command.name} has been successfully updated.`);
  } else {
    await httpClient.post(Routes.applicationCommands(APPLICATION_ID), {
      body: command,
    });
    console.log(`Command ${command.name} has been successfully created.`);
  }
} else if (args[0] === 'migrate') {
  const body: RESTPutAPIApplicationCommandsJSONBody = [];
  const knownCommands = Array<Snowflake>();

  for (const fileName of readdirSync(commandsPath)) {
    if (fileName.endsWith('.map')) continue;

    const command = await importCommand(fileName);
    const targetData = findTargetRegisteredCommand(command);

    if (!targetData || targetData[1]) body.push(command);
    if (targetData) knownCommands.push(targetData[0].id);
  }

  if (body.length > 0) {
    const now = Date.now();
    const result = (await httpClient.put(
      Routes.applicationCommands(APPLICATION_ID),
      { body },
    )) as RESTPutAPIApplicationCommandsResult;

    for (const command of result) {
      console.log(
        `Command ${command.name} has been successfully %s.`,
        SnowflakeUtil.deconstruct(command.id).timestamp > now
          ? 'created'
          : 'updated',
      );
    }
  }

  // unregister remaining commands (= deleted commands)
  purgeCommands(knownCommands);
}
