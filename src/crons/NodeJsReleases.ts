import got from 'got';

import { KeyValue } from '../database/index.js';
import { Cron, findTextChannelByName } from '../framework/index.js';

export default new Cron({
  enabled: true,
  name: 'Node.js Releases',
  description:
    'Vérifie toutes les 30 minutes si une nouvelle release de Node.js est sortie',
  schedule: '5,35 * * * *',
  // schedule: '* * * * *',
  async handle(context) {
    // retrieve last release id from db
    const lastRelease = (await KeyValue.get<number>('Last-Cron-Node.js')) ?? 0;
    // fetch last releases from gh filtered by releases older or equal than the stored one
    const entries = await getLastNodeReleases(lastRelease);

    // if no releases return
    if (entries.length === 0) return;

    context.logger.info(`Found new Node.js releases`, entries);

    const channel = findTextChannelByName(context.client.channels, 'news');

    for (const release of entries) {
      await channel.send({
        content: `# Release ${release.title}\n\n<${release.link}>`,
      });
      const content = release.content.replaceAll('\r\n', '\n');
      const lines = content.split('\n');

      let message = '';
      for (const line of lines) {
        if (message.length + line.length > 2000) {
          const m = await channel.send(message);
          await m.suppressEmbeds(true);

          message = '';
        }

        // Remove the Commits section and after.
        if (/#{1,6}\s+Commits?/.test(line)) {
          break;
        }

        message += `\n${line}`;
      }
      if (message) {
        const m = await channel.send(message);
        await m.suppressEmbeds(true);
      }

      await channel.send({ content: release.link });

      await KeyValue.set('Last-Cron-Node.js', release.id); // update id in db
    }
  },
});

interface AtomEntry {
  id: number;
  link: string;
  title: string;
  content: string;
  date: Date;
  author: {
    name: string;
    image: string;
  };
}

interface GithubRelease {
  html_url: string;
  id: number;
  name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  body: string;
  author: {
    login: string;
    avatar_url: string;
  };
}

export async function getLastNodeReleases(
  skipAfterId: number,
): Promise<AtomEntry[]> {
  const releases = await got(
    'https://api.github.com/repos/nodejs/node/releases',
  ).json<GithubRelease[]>();

  let shouldSkip = false;
  return (
    releases
      // recent to old (title is a better attribute than date, because it's the updated field)
      .sort((a, b) => b.published_at.localeCompare(a.published_at))
      .filter((release) => {
        if (release.id === skipAfterId) {
          shouldSkip = true;
        }

        return !shouldSkip;
      })
      .map((release) => ({
        id: release.id,
        link: release.html_url,
        title: release.name,
        date: new Date(release.published_at),
        content: release.body,
        author: {
          name: release.author.login,
          image: release.author.avatar_url,
        },
      }))
      .reverse()
  );
}
