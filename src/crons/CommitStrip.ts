import { MessageEmbed } from 'discord.js';
import got from 'got';
import { decode } from 'html-entities';

import { Cron, findTextChannelByName } from '../framework';
import { KeyValue } from '../database';

export default new Cron({
  enabled: true,
  name: 'CommitStrip',
  description:
    'Vérifie toutes les 30 minutes si un nouveau CommitStrip est sorti et le poste dans #gif',
  schedule: '5,35 * * * *',
  async handle(context) {
    const strip = await getLastCommitStrip();

    // vérifie le strip trouvé avec la dernière entrée
    const lastStrip = await KeyValue.get<number>('Last-Cron-CommitStrip');
    const stripStoreIdentity = strip?.id ?? null;
    if (lastStrip === stripStoreIdentity) return; // skip si identique

    await KeyValue.set('Last-Cron-CommitStrip', stripStoreIdentity); // met à jour sinon

    if (!strip) return; // skip si pas de strip

    context.logger.info(`Found a new CommitStrip (${strip.id})`);

    const channel = findTextChannelByName(context.client.channels, 'gif');

    await channel.send(
      new MessageEmbed()
        .setTitle(strip.title)
        .setURL(strip.link)
        .setImage(strip.imageUrl),
    );
  },
});

/**
 * Subset of the fields returned by the WordPress Posts API.
 */
interface WordPressPost {
  id: number;
  date_gmt: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
}

/**
 * Strip information extracted from the WordPress post.
 */
interface CommitStrip {
  /**
   * Post ID.
   */
  id: number;
  /**
   * Post date.
   */
  date: Date;
  /**
   * Direct link to the post.
   */
  link: string;
  /**
   * Post title.
   */
  title: string;
  /**
   * URL of the strip image.
   */
  imageUrl: string;
}

/**
 * Fetches the most recent post from the WordPress API. If there is one, and it
 * was posted between the previous and current cron execution, returns it.
 * Otherwise, or if the post does not contain any image URL, returns null.
 */
async function getLastCommitStrip(): Promise<CommitStrip | null> {
  const { body: posts } = await got<WordPressPost[]>(
    'https://www.commitstrip.com/fr/wp-json/wp/v2/posts?per_page=1',
    { responseType: 'json', https: { rejectUnauthorized: false } },
  );

  if (posts.length === 0) {
    return null;
  }

  const [strip] = posts;
  const stripDate = new Date(strip.date_gmt + '.000Z');

  const stripImageUrlReg = /src="([^"]+)"/;
  const urlMatch = stripImageUrlReg.exec(strip.content.rendered);
  if (!urlMatch) {
    return null;
  }

  return {
    id: strip.id,
    date: stripDate,
    link: strip.link,
    // Sometimes, the title can contain HTML Entities, e.g. "Pendant ce temps, sur Mars #16 &#8211; Vivement 2028"
    title: decode(strip.title.rendered, { level: 'html5', scope: 'strict' }),
    imageUrl: urlMatch[1],
  };
}
