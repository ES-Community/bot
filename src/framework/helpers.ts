import {
  Channel,
  ChannelManager,
  GuildChannelManager,
  TextChannel,
} from 'discord.js';

export function findTextChannelByName(
  { cache }: ChannelManager | GuildChannelManager,
  name: string,
): TextChannel | undefined {
  return cache.find(
    (channel) => isTextChannel(channel) && channel.name === name,
  ) as TextChannel | undefined;
}

export function isTextChannel(channel: Channel): channel is TextChannel {
  return channel instanceof TextChannel;
}
