import { Message, PartialMessage } from 'discord.js';
import { randomUUID } from 'crypto';
import { Logger } from 'pino';
import { Base, BaseConfig } from './Base';
import { Bot } from './Bot';
import { findTextChannelByName, isTextChannel } from './helpers';

type FunctionChecker = (message: Message, logger: Logger) => boolean;

export interface FormatCheckerConfig extends BaseConfig {
  channelName: string;
  checker: RegExp | FunctionChecker;
  examples?: string[];
}

export class FormatChecker extends Base {
  private readonly channelName: string;
  private readonly checker: RegExp | FunctionChecker;
  private readonly examples?: string[];

  private bot: Bot | undefined;

  public constructor(config: FormatCheckerConfig) {
    super(config);
    this.channelName = config.channelName;
    if (
      typeof config.checker === 'function' ||
      config.checker instanceof RegExp
    )
      this.checker = config.checker;
    else throw new Error(`invalid checker for ${this.name}`);

    this.examples = config.examples;

    this._messageHandler = this._messageHandler.bind(this);
    this._messageUpdateHandler = this._messageUpdateHandler.bind(this);
  }

  async _messageHandler(message: Message): Promise<void> {
    if (this.bot === undefined) return;
    if (
      !isTextChannel(message.channel) ||
      message.channel.name !== this.channelName
    )
      return;

    const logger = this.bot.logger.child({
      id: randomUUID(),
      type: 'FormatChecker',
      checkerName: this.name,
    });

    if (this.checker instanceof RegExp) {
      if (this.checker.test(message.cleanContent)) return;
    } else if (this.checker(message, logger)) return;

    const { cleanContent, author } = message;

    logger.info(
      { username: author.username, tag: author.tag, cleanContent },
      'Detected bad message format',
    );

    await message.delete();
    const plural = this.examples !== undefined && this.examples.length > 1;
    const pluralSuffix = plural ? 's' : '';
    const warningContent = [
      `Le message que vous avez posté dans ${message.channel} est incorrectement formaté, il a donc été supprimé.`,
      'Pour rappel, voici le message que vous aviez envoyé :',
      `\`\`\`\n${cleanContent}\n\`\`\``,
      ...(this.examples !== undefined
        ? [
            `Voici ${
              plural ? 'des' : 'un'
            } example${pluralSuffix} de message${pluralSuffix} correctement formaté${pluralSuffix} :`,
            ...this.examples.map((example) => `\`\`\`\n${example}\`\`\``),
          ]
        : []),
    ].join('\n');

    try {
      await author.send(`Bonjour,\n${warningContent}`);
    } catch (err) {
      if (err.code !== 50007 /* Cannot send messages to this user */) {
        logger.error(
          err,
          'failed to send private message to user %s',
          author.tag,
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const channel = findTextChannelByName(message.guild!.channels, 'logs');
      if (channel === undefined)
        return logger.fatal('text channel not found: logs');
      channel.send(`Bonjour ${author},\n${warningContent}`);
    }
    logger.debug('warning message sent');
  }

  async _messageUpdateHandler(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
  ): Promise<void> {
    return this._messageHandler(
      newMessage.partial ? await newMessage.fetch() : newMessage,
    );
  }

  public start(bot: Bot): void {
    this.bot = bot;
    this.bot.client.on('message', this._messageHandler);
    this.bot.client.on('messageUpdate', this._messageUpdateHandler);
  }

  public stop(bot: Bot): void {
    bot.client.off('message', this._messageHandler);
  }
}
