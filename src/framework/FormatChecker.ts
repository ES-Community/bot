import { Base, BaseConfig } from "./Base"
import { Bot } from "./Bot"
import { findTextChannelByName } from "./helpers"
import { Client, Message, User } from "discord.js"

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

  private client: Client | undefined;

  public constructor(config: FormatCheckerConfig) {
    super(config)
    this.channelName = config.channelName
    this.regexp = config.regexp
    this.postHandler = config.postHandler;
    this.examples = config.examples
  }

  async _messageHandler(message: Message): Promise<void> {
    if(this.client === undefined) return;
    if(message.channel.id !== findTextChannelByName(this.client, this.channelName)?.id) return;
    if(this.regexp.test(message.cleanContent) === true) return;
    
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

    if(this.postHandler === undefined) return;
    await this.postHandler(author)
  }

  public start(bot: Bot): void {
    this.client = bot.client
    this.client.on('message', this._messageHandler.bind(this))
  }

  public stop(bot: Bot): void {
    bot.client.off('message', this._messageHandler.bind(this))
  }
}