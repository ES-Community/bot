import { Client, TextChannel } from 'discord.js';

export function findTextChannelByName(
  client: Client,
  name: string,
): TextChannel | undefined {
  return client.channels.cache.find(
    (channel) =>
      channel.type === 'text' && (channel as TextChannel).name === name,
  ) as TextChannel | undefined;
}
