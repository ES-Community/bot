import {
  Channel,
  ChannelManager,
  GuildChannelManager,
  TextChannel,
} from 'discord.js';

export function findTextChannelByName(
  manager: ChannelManager | GuildChannelManager,
  name: string,
): TextChannel | undefined {
  return manager.cache.find(
    (channel) => isTextChannel(channel) && channel.name === name,
  ) as TextChannel;
}

export function isTextChannel(channel: Channel): channel is TextChannel {
  return channel instanceof TextChannel;
}
