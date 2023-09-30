import { EmbedBuilder } from 'discord.js';
import got from 'got';

import { Cron, findTextChannelByName } from '../framework/index.js';
import { KeyValue } from '../database/index.js';

export default new Cron({
  enabled: true,
  name: 'WorkChronicles',
  description:
    'Vérifie toutes les 30 minutes si un nouveau comic Work Chronicles est sorti et le poste dans #gif',
  schedule: '5,35 * * * *',
  async handle(context) {
    const chronicle = await getLastChronicle();

    // vérifie le comic trouvé avec la dernière entrée
    const lastChronicle = await KeyValue.get<number>('Last-Cron-WorkChronicle');
    const chronicleStoreIdentity = chronicle?.id ?? null;
    if (lastChronicle === chronicleStoreIdentity) return; // skip si identique

    await KeyValue.set('Last-Cron-WorkChronicle', chronicleStoreIdentity); // met à jour sinon

    if (!chronicle) return; // skip si pas de comic

    context.logger.info(`Found a new Work Chronicle (${chronicle.id})`);

    const channel = findTextChannelByName(context.client.channels, 'gif');

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(chronicle.title)
          .setURL(chronicle.link)
          .setImage(chronicle.imageUrl),
      ],
    });
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
 * Chronicle information extracted from the WordPress post.
 */
interface WorkChronicle {
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
   * URL of the chronicle image.
   */
  imageUrl: string;
}

/**
 * Fetches the most recent post from the WordPress API. If there is one, and it
 * was posted between the previous and current cron execution, returns it.
 * Otherwise, or if the post does not contain any image URL, returns null.
 */
export async function getLastChronicle(): Promise<WorkChronicle | null> {
  const { body: posts } = await got<WordPressPost[]>(
    'https://workchronicles.com/wp-json/wp/v2/posts?per_page=1',
    { responseType: 'json', https: { rejectUnauthorized: false } },
  );

  if (posts.length === 0) {
    return null;
  }

  const [chronicle] = posts;
  const chronicleDate = new Date(chronicle.date_gmt + '.000Z');

  const chronicleImageUrlReg = /src="([^"]+)"/;
  const urlMatch = chronicleImageUrlReg.exec(chronicle.content.rendered);
  if (!urlMatch) {
    return null;
  }

  return {
    id: chronicle.id,
    date: chronicleDate,
    link: chronicle.link,
    title: chronicle.title.rendered,
    imageUrl: urlMatch[1],
  };
}
