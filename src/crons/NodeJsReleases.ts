import { Cron, findTextChannelByName } from '../framework/index.js';
import got from 'got';
import { parse } from 'node-html-parser';
import { decode, encode } from 'html-entities';
import { KeyValue } from '../database/index.js';
import { NodeHtmlMarkdown } from 'node-html-markdown';

const nhm = new NodeHtmlMarkdown({
  bulletMarker: '-',
  useLinkReferenceDefinitions: false,
  useInlineLinks: true,
});

export default new Cron({
  enabled: true,
  name: 'Node.js Releases',
  description:
    'Vérifie toutes les 30 minutes si une nouvelle release de Node.js est sortie',
  schedule: '5,35 * * * *',
  // schedule: '* * * * *',
  async handle(context) {
    // retrieve last release id from db
    const lastRelease = (await KeyValue.get<string>('Last-Cron-Node.js')) ?? '';
    // fetch last releases from gh filtered by releases older or equal than the stored one
    const entries = await getLastNodeReleases(lastRelease);

    // if no releases return
    if (entries.length === 0) return;

    context.logger.info(`Found new Node.js releases`, entries);

    const channel = findTextChannelByName(context.client.channels, 'nodejs');

    for (const release of entries) {
      const completeContent = `# Release ${release.title}\n\n${
        release.link
      }\n\n${nhm.translate(release.content)}`;
      const indexOfCommit = completeContent.indexOf('\n# Commits\n');
      const content =
        indexOfCommit >= 0
          ? completeContent.slice(0, indexOfCommit)
          : completeContent;

      // fence message by 2000 char chunks
      for (
        let start = 0, end = 2000;
        start < content.length;
        start += 2000, end += 2000
      ) {
        await channel.send({ content: content.slice(start, end) });
      }

      await KeyValue.set('Last-Cron-Node.js', release.id); // update id in db
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

export async function getLastNodeReleases(
  skipAfterId: string,
): Promise<AtomEntry[]> {
  const { body } = await got('https://github.com/nodejs/node/releases.atom');
  const atom = parse(body);

  let shouldSkip = false;
  return (
    atom
      .querySelectorAll('entry')
      .map((entry) => {
        const originContent = decode(
          entry.querySelector('content[type="html"]')?.textContent,
        );
        const document = parse(originContent);

        {
          // clean up commit and PR links
          const internalLinks = document.querySelectorAll(
            'a[href*="github.com/nodejs/node/commit"], a[href*="github.com/nodejs/node/pull"]',
          );
          for (const link of internalLinks) {
            link.insertAdjacentHTML('beforebegin', link.innerHTML);
            link.remove();
          }

          // remove embed on other links
          const externalLinks = document.querySelectorAll('a');
          for (const link of externalLinks) {
            link.insertAdjacentHTML('beforebegin', encode('<'));
            link.insertAdjacentHTML('afterend', encode('>'));
          }

          // ensure code blocks is rendered as codeblock
          const codes = document.querySelectorAll('div.highlight');
          for (const code of codes) {
            const langCls =
              code.classList.value.find((cls) =>
                cls.startsWith('highlight-source-'),
              ) ?? '';
            const lang = langCls.replace('highlight-source-', '');
            const markdownBlock = `<pre class="language-${lang}"><code>${code.getAttribute(
              'data-snippet-clipboard-copy-content',
            )}</code></pre>`;
            code.insertAdjacentHTML('beforebegin', markdownBlock);
            code.remove();
          }

          // up titles (start to h3), so it's still compatibles with discord
          for (const title of document.querySelectorAll('h3'))
            title.tagName = 'h1';
          for (const title of document.querySelectorAll('h4'))
            title.tagName = 'h2';
          for (const title of document.querySelectorAll('h5'))
            title.tagName = 'h3';
          for (const title of document.querySelectorAll('h6'))
            title.tagName = 'h3';
        }

        const content = document.innerHTML;

        return {
          id: entry.querySelector('id')?.textContent ?? '',
          link: entry.querySelector('link')?.getAttribute('href') ?? '',
          title: entry.querySelector('title')?.textContent ?? '',
          content,
          author: {
            name: entry.querySelector('author name')?.textContent ?? '',
            image:
              entry.querySelector('media\\:thumbnail')?.getAttribute('url') ??
              '',
          },
          date: new Date(
            entry.querySelector('updated')?.textContent ?? new Date(),
          ),
        };
      })
      // recent to old (title is a better attribute than date, because it's the updated field)
      .sort((a, b) => b.title.localeCompare(a.title))
      // remove older items
      .filter((entry) => {
        if (entry.id === skipAfterId) {
          shouldSkip = true;
        }

        return !shouldSkip;
      })
      // old to recent
      .reverse()
  );
}
