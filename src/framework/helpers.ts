import {
  type Channel,
  type ChannelManager,
  type GuildChannelManager,
  type MessageCreateOptions,
  SnowflakeUtil,
} from 'discord.js';
import { TextChannel } from 'discord.js';

export function findTextChannelByName(
  manager: ChannelManager | GuildChannelManager,
  name: string,
): TextChannel {
  const channel = manager.cache.find(
    (channel) => isTextChannel(channel) && channel.name === name,
  );
  if (!channel) {
    throw new Error(`found no #${name} channel`);
  }
  if (!(channel instanceof TextChannel)) {
    throw new TypeError(`channel #${name} is not a text channel`);
  }
  return channel;
}

export function isTextChannel(channel: Channel): channel is TextChannel {
  return channel instanceof TextChannel;
}

/**
 * Envoie un message dans un canal en mettant un nonce.
 * Évite des race-conditions qui ré-envoient plusieurs fois le même message.
 *
 * @param channel
 * @param message
 */
export function sendToChannel(
  channel: TextChannel,
  message: Omit<MessageCreateOptions, 'enforceNonce' | 'nonce'>,
) {
  return channel.send({
    ...message,
    enforceNonce: true,
    nonce: SnowflakeUtil.generate().toString(),
  });
}
