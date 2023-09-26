import { Cron, findTextChannelByName } from '../framework/index.js';
import got from 'got';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import { KeyValue } from '../database/index.js';
import { EmbedBuilder } from 'discord.js';

export default new Cron({
  enabled: true,
  name: 'Node.js Releases',
  description:
    'Vérifie toutes les 30 minutes si une nouvelle release de Node.js est sortie',
  schedule: '5,35 * * * *',
  async handle(context) {
    // retrieve last release id from db
    const lastRelease = (await KeyValue.get<string>('Last-Cron-Node.js')) ?? '';
    // fetch last releases from gh filtered by releases older or equal than the stored one
    const entries = await getLastNodeRelease(lastRelease);

    // if no releases return
    const lastEntry = entries.at(-1);
    if (!lastEntry) return;

    await KeyValue.set('Last-Cron-Node.js', lastEntry.id); // else update last id in db

    context.logger.info(`Found new Node.js releases`, entries);

    const channel = findTextChannelByName(context.client.channels, 'nodejs');

    for (const release of entries) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setURL(release.link)
            .setTitle(release.title)
            .setDescription(release.content)
            .setImage(release.author.image)
            .setTimestamp(release.date),
        ],
      });
    }
  },
});

interface AtomEntry {
  id: string;
  link: string;
  title: string;
  content: string;
  date: Date;
  author: {
    name: string;
    image: string;
  };
}

export async function getLastNodeRelease(
  skipAfterId: string,
): Promise<AtomEntry[]> {
  const { body } = await got('https://github.com/nodejs/node/releases.atom');
  const atom = parse(body);

  let shouldSkip = false;
  return atom
    .querySelectorAll('entry')
    .map((entry) => ({
      id: entry.querySelector('id')?.textContent ?? '',
      link: entry.querySelector('link')?.textContent ?? '',
      title: entry.querySelector('title')?.textContent ?? '',
      content: decode(entry.querySelector('content[type="html"]')?.textContent),
      author: {
        name: entry.querySelector('author name')?.textContent ?? '',
        image:
          entry.querySelector('media\\:thumbnail')?.getAttribute('url') ?? '',
      },
      date: new Date(entry.querySelector('updated')?.textContent ?? new Date()),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .filter((entry) => {
      if (entry.id === skipAfterId) {
        shouldSkip = true;
      }

      return !shouldSkip;
    });
}
