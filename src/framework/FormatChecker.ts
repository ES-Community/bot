import { Base, BaseConfig } from "./Base"
import { Bot } from "./Bot"
import { findTextChannelByName } from "./helpers"
import { Message, User } from "discord.js"
import uuid from "@lukeed/uuid"

export interface FormatCheckerConfig extends BaseConfig {
  channelName: string;
  regexp: RegExp;
  examples?: string[];
  postHandler?: (author: User) => Promise<void>
}

export default class FormatChecker extends Base {
  private readonly channelName: string;
  private readonly regexp: RegExp;
  private readonly examples?: string[];
  private readonly postHandler?: (author: User) => Promise<void>;

  private bot: Bot | undefined;

  public constructor(config: FormatCheckerConfig) {
    super(config)
    this.channelName = config.channelName
    this.regexp = config.regexp
    this.postHandler = config.postHandler;
    this.examples = config.examples
  }

  async _messageHandler(message: Message): Promise<void> {
    if(this.bot === undefined) return;
    if(message.channel.id !== findTextChannelByName(this.bot.client, this.channelName)?.id) return;
    if(this.regexp.test(message.cleanContent) === true) return;

    const logger = this.bot.logger.child({
      id: uuid(),
      type: 'FormatChecker',
      name: this.name,
    });
    logger.debug('bad format detected')

    const { cleanContent, author } = message

    await message.delete()
    const warningContent = [
      'Bonjour,',
      `Le message que vous avez posté dans #${this.channelName} est incorrectement formaté, il a donc été supprimé.`,
      'Pour rappel, voici le message que vous aviez envoyé :',
      `\`\`\`${cleanContent}\`\`\``,
      ...this.examples !== undefined ? [
        `Voici ${this.examples.length > 1 ? 'des' : 'un'} example${this.examples.length > 1 ? 's' : ''} de message correctement formaté :`,
        ...this.examples.map(example => `\`\`\`${example}\`\`\``)
      ] : []
    ]
    await author.send(warningContent.join('\n')).then(warning => warning.suppressEmbeds(true))
    logger.debug('warning message sent')

    if(this.postHandler === undefined) return;
    logger.debug('execute postHandler')
    await this.postHandler(author)
  }

  public start(bot: Bot): void {
    this.bot = bot
    this.bot.client.on('message', this._messageHandler.bind(this))
  }

  public stop(bot: Bot): void {
    bot.client.off('message', this._messageHandler.bind(this))
  }
}