import { FormatChecker } from '../framework/index.js';

const urlRegexp =
  '<?https?:\\/\\/(?:www\\.)?[-\\w@:%.\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-\\w()@:%\\+.~#?&//=]*)>?';
const headerRegexp = `(?:[a-zA-Z0-9_\\- ]|(?:<a?:\\w{2,32}:\\d{17,20}>)|(?::\\w{2,32}:)|\\p{Emoji_Presentation})+`;
const projectRegexp = new RegExp(
  `^\\*\\*${headerRegexp}+\\*\\*\\n\\n(?:.*\\n)+\n(?:(?:${headerRegexp}* )?${urlRegexp}\n)+$`,
  'u',
);

export default new FormatChecker({
  enabled: true,
  name: 'Project',
  description: 'Force le formatage du canal #projets.',
  channelName: 'projets',
  checker: (cleanContent) => projectRegexp.test(cleanContent + '\n'),
  examples: [
    `**Nom du projet**\n\nDescription du projet\n\nhttps://github.com`,
  ],
});
