import {
  type Channel,
  type ChannelManager,
  type GuildChannelManager,
  type MessageCreateOptions,
  SnowflakeUtil,
} from 'discord.js';
import { TextChannel } from 'discord.js';
import type { CronContext } from './Cron.ts';
import { type JSONTypes, KeyValue } from '../database/index.ts';

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

export interface BuildBasicCronHandleOptions<
  Id extends JSONTypes,
  Entry extends { id: Id },
> {
  getLastEntry: () => Promise<Entry | null>;
  key: string;
  logMsg: string;
  targetChannelName: string;
  toMessage: (
    entry: Entry,
  ) => Omit<MessageCreateOptions, 'enforceNonce' | 'nonce'>;
}
export function buildBasicCronHandle<
  Id extends JSONTypes,
  Entry extends { id: Id },
>(options: BuildBasicCronHandleOptions<Id, Entry>) {
  const { key, getLastEntry, logMsg, targetChannelName, toMessage } = options;

  return async (context: CronContext) => {
    const entry = await getLastEntry();

    const lastStoredEntry = await KeyValue.get<Id>(key);
    const entryStoreIdentity = entry?.id ?? null;
    if (lastStoredEntry === entryStoreIdentity) return;

    await KeyValue.set(key, entryStoreIdentity);

    if (!entry) return;

    context.logger.info(logMsg, entry);

    const channel = findTextChannelByName(
      context.client.channels,
      targetChannelName,
    );

    const message = toMessage(entry);
    await sendToChannel(channel, message);
  };
}
