import {
  Cron,
  findTextChannelByName,
  sendToChannel,
} from '../framework/index.ts';
import got from 'got';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import { KeyValue } from '../database/index.ts';
import { EmbedBuilder } from 'discord.js';

export default new Cron({
  enabled: true,
  name: 'David Revoy',
  description:
    'Vérifie toutes les 30 minutes si un nouveau strip de David Revoy est sorti',
  schedule: '5,35 * * * *',
  async handle(context) {
    const strip = await getLastDavidRevoyStrip();

    // vérifie le strip trouvé avec la dernière entrée
    const lastStrip = await KeyValue.get<string>('Last-Cron-DavidRevoy');
    const stripStoreIdentity = strip?.id ?? null;
    if (lastStrip === stripStoreIdentity) return; // skip si identique

    await KeyValue.set('Last-Cron-DavidRevoy', stripStoreIdentity); // met à jour sinon

    if (!strip) return; // skip si pas de strip

    context.logger.info(`Found a new David Revoy strip`, strip);

    const channel = findTextChannelByName(context.client.channels, 'gif');

    await sendToChannel(channel, {
      embeds: [
        new EmbedBuilder()
          .setURL(strip.link)
          .setTitle(strip.title)
          .setImage(strip.imageUrl)
          .setTimestamp(strip.date),
      ],
    });
  },
});

interface IDavidRevoyStrip {
  id: string;
  link: string;
  title: string;
  date: Date;
  imageUrl: string;
}

export async function getLastDavidRevoyStrip(): Promise<IDavidRevoyStrip | null> {
  const { body } = await got(
    'https://www.davidrevoy.com/feed/rss/categorie2/webcomics/',
  );
  const rss = parse(body, {
    blockTextElements: {
      // link tag in XML RSS is a block with text content
      link: true,
    },
  });

  const item = rss.querySelector('item');
  if (!item) return null;

  const rawDescription = item.querySelector('description')?.textContent ?? '';
  const description = parse(decode(rawDescription));
  const img = description.querySelector('img');

  return {
    id: item.querySelector('guid')?.textContent?.trim() ?? '',
    link: item.querySelector('link')?.textContent?.trim() ?? '',
    title: item.querySelector('title')?.textContent?.trim() ?? '',
    date: new Date(item.querySelector('pubDate')?.textContent ?? new Date()),
    imageUrl: img?.parentNode?.getAttribute('href') ?? '',
  };
}
