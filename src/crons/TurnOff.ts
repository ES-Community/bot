import { Cron, findTextChannelByName } from '../framework/index.ts';
import got from 'got';
import { parse } from 'node-html-parser';
import { KeyValue } from '../database/index.ts';
import { EmbedBuilder, SnowflakeUtil } from 'discord.js';

export default new Cron({
  enabled: true,
  name: '{turnoff.us}',
  description:
    'Vérifie toutes les 30 minutes si un nouveau strip de {turnoff.us} est sorti',
  schedule: '5,35 * * * *',
  async handle(context) {
    const strip = await getLastTurnOffStrip();

    // vérifie le strip trouvé avec la dernière entrée
    const lastStrip = await KeyValue.get<string>('Last-Cron-TurnOff');
    const stripStoreIdentity = strip?.id ?? null;
    if (lastStrip === stripStoreIdentity) return; // skip si identique

    await KeyValue.set('Last-Cron-TurnOff', stripStoreIdentity); // met à jour sinon

    if (!strip) return; // skip si pas de strip

    context.logger.info(`Found a new {turnoff.us} strip`, strip);

    const channel = findTextChannelByName(context.client.channels, 'gif');

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setURL(strip.link)
          .setTitle(strip.title)
          .setImage(strip.imageUrl)
          .setTimestamp(strip.date),
      ],
      enforceNonce: true,
      nonce: SnowflakeUtil.generate().toString(),
    });
  },
});

interface ITurnOffStrip {
  id: string;
  link: string;
  title: string;
  date: Date;
  imageUrl: string;
}

export async function getLastTurnOffStrip(): Promise<ITurnOffStrip | null> {
  const { body } = await got('https://turnoff.us/feed.xml');
  const rss = parse(body, {
    blockTextElements: {
      // link tag in XML RSS is a block with text content
      link: true,
    },
  });

  const item = rss.querySelector('item');
  if (!item) return null;

  const description = item.querySelector('description');
  const img = description?.querySelector('img');

  return {
    id: item.querySelector('guid')?.textContent?.trim() ?? '',
    link: item.querySelector('link')?.textContent?.trim() ?? '',
    title: item.querySelector('title')?.textContent?.trim() ?? '',
    date: new Date(item.querySelector('pubDate')?.textContent ?? new Date()),
    imageUrl: img?.getAttribute('src') ?? '',
  };
}
