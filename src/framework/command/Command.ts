import type {
  Client,
  CommandInteraction,
  GuildChannel,
  GuildMember,
  Role,
  Snowflake,
  User,
} from 'discord.js';
import type {
  APIRole,
  APIInteractionDataResolvedGuildMember,
  APIInteractionDataResolvedChannel,
} from 'discord-api-types/v9';
import type { Logger } from 'pino';
import { Base, BaseConfig } from '../Base.js';

export const enum CommandOptionTypes {
  String = 3,
  Integer,
  Boolean,
  User,
  Channel,
  Role,
  Mentionable,
}

interface CommandOptionsData<
  T extends CommandOptionTypes =
    | CommandOptionTypes.Boolean
    | CommandOptionTypes.Channel
    | CommandOptionTypes.Mentionable
    | CommandOptionTypes.Role
    | CommandOptionTypes.User,
  C = never,
> {
  readonly type: T;
  readonly description: string;
  readonly required?: boolean;
  readonly choices?: C extends never
    ? never
    : readonly { readonly name: string; readonly value: C }[];
}

export type CommandOptions = Record<
  string,
  | CommandOptionsData<CommandOptionTypes.String, string>
  | CommandOptionsData<CommandOptionTypes.Integer, number>
  | CommandOptionsData
>;

interface OptionTypes {
  [CommandOptionTypes.Boolean]: boolean;
  [CommandOptionTypes.Integer]: number;
  [CommandOptionTypes.String]: string;
  [CommandOptionTypes.Role]: Role | APIRole;
  [CommandOptionTypes.Channel]:
    | GuildChannel
    | APIInteractionDataResolvedChannel;
  [CommandOptionTypes.User]:
    | User
    | GuildMember
    | APIInteractionDataResolvedGuildMember;
  [CommandOptionTypes.Mentionable]:
    | OptionTypes[CommandOptionTypes.Role]
    | OptionTypes[CommandOptionTypes.User];
}

type BuildArgs<T extends CommandOptions, Keys extends keyof T> = {
  [K in Keys]: T[K]['choices'] extends readonly [unknown, ...unknown[]]
    ? T[K]['choices'][number]['value']
    : OptionTypes[T[K]['type']];
};

type FinalCommandOptions<
  T extends CommandOptions,
  RequiredArgs = keyof {
    [K in keyof T as T[K]['required'] extends true
      ? K
      : never]: never /* unimportant */;
  },
> = BuildArgs<T, Extract<keyof T, RequiredArgs>> &
  Partial<BuildArgs<T, Exclude<keyof T, RequiredArgs>>>;

export type CommandHandler<T extends CommandOptions> = (
  context: CommandContext<T>,
) => Promise<unknown>;

export interface CommandContext<T extends CommandOptions> {
  /**
   * discord.js Client instance.
   */
  client: Client;
  /**
   * Pino logger.
   */
  logger: Logger;
  /**
   * The arguments (options) provided by the user, with correct typings
   */
  args: FinalCommandOptions<T>;
  /**
   * CommandInteraction instance.
   */
  interaction: CommandInteraction;
}

export interface CommandConfig<T extends CommandOptions = CommandOptions>
  extends BaseConfig {
  /**
   * The guild ID (if this command is specific to a guild)
   */
  guildId?: Snowflake;
  /**
   * Whether the command is enabled by default when the app is added to a guild
   * @default true
   */
  defaultPermission?: boolean;
  /**
   * Command options
   */
  options?: T;
  /**
   * Command handler
   */
  handle: CommandHandler<T>;
}

export class Command<T extends CommandOptions = CommandOptions> extends Base {
  /**
   * The guild ID (if this command is specific to a guild)
   */
  public readonly guildId: Snowflake | undefined;
  /**
   * Whether the command is enabled by default when the app is added to a guild
   * @default true
   */
  public readonly defaultPermission: boolean | undefined;
  /**
   * Command options
   */
  public readonly options: T | undefined;
  /**
   * Command handler
   */
  public readonly handler: CommandHandler<T>;

  public constructor(config: CommandConfig<T>) {
    super(config);
    this.guildId = config.guildId;
    this.options = config.options;
    this.defaultPermission = config.defaultPermission;
    this.handler = config.handle;
  }
}
