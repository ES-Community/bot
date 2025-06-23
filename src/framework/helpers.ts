import type { Channel, ChannelManager, GuildChannelManager } from 'discord.js';
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
