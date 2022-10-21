import { Cron, findTextChannelByName } from '../framework';
import got from 'got';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import { KeyValue } from '../database';
import { EmbedBuilder } from 'discord.js';

const DATETIME_FMT: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

export default new Cron({
  enabled: true,
  name: 'XKCD',
  description:
    'Vérifie toutes les 30 minutes si un nouveau strip de XKCD est sortis',
  schedule: '5,35 * * * *',
  // schedule: '* * * * *',
  async handle(context) {
    const strip = await getLastXKCDStrip();

    // vérifie le strip trouvé avec la dernière entrée
    const lastStrip = await KeyValue.get<string>('Last-Cron-XKCD');
    const stripStoreIdentity = strip?.id ?? null;
    if (lastStrip === stripStoreIdentity) return; // skip si identique

    await KeyValue.set('Last-Cron-XKCD', stripStoreIdentity); // met à jour sinon

    if (!strip) return; // skip si pas de strip

    context.logger.info(`Found a new XKCD strip`, strip);

    const channel = findTextChannelByName(context.client.channels, 'gif');

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setURL(strip.link)
          .setTitle(strip.title)
          .setDescription(strip.description)
          .addFields({
            name: 'Publication',
            value: strip.date.toLocaleDateString('fr-FR', DATETIME_FMT),
            inline: true,
          })
          .setImage(strip.imageUrl),
      ],
    });
  },
});

interface IXKCDStrip {
  id: string;
  link: string;
  title: string;
  description: string;
  date: Date;
  imageUrl: string;
}

export async function getLastXKCDStrip(): Promise<IXKCDStrip | null> {
  const { body } = await got('https://xkcd.com/atom.xml');
  const atom = parse(body);

  const entry = atom.querySelector('entry');
  if (!entry) return null;

  const rawSummary =
    entry.querySelector('summary[type=html]')?.textContent ?? '';
  const summary = parse(decode(rawSummary));
  const img = summary.querySelector('img');

  return {
    id: entry.querySelector('id')?.textContent?.trim() ?? '',
    link: entry.querySelector('link')?.getAttribute('href') ?? '',
    title: entry.querySelector('title')?.textContent?.trim() ?? '',
    description: decode(img?.getAttribute('title')),
    date: new Date(entry.querySelector('updated')?.textContent ?? new Date()),
    imageUrl: img?.getAttribute('src') ?? '',
  };
}
