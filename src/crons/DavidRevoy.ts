import { Cron, buildBasicCronHandle } from '../framework/index.ts';
import got from 'got';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import { EmbedBuilder } from 'discord.js';

export default new Cron({
  enabled: true,
  name: 'David Revoy',
  description:
    'Vérifie toutes les 30 minutes si un nouveau strip de David Revoy est sorti',
  schedule: '5,35 * * * *',
  handle: buildBasicCronHandle({
    key: 'Last-Cron-DavidRevoy',
    targetChannelName: 'gif',
    logMsg: 'Found a new David Revoy strip',
    getLastEntry: getLastDavidRevoyStrip,
    toMessage: (entry) => ({
      embeds: [
        new EmbedBuilder()
          .setURL(entry.link)
          .setTitle(entry.title)
          .setImage(entry.imageUrl)
          .setTimestamp(entry.date),
      ],
    }),
  }),
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
