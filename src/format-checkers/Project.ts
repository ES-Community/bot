import { FormatChecker } from '../framework/index.js';
import emojiRegExp from '../emoji-regex.js';

const urlRegExp =
  '<?https?:\\/\\/(?:www\\.)?[-\\w@:%.\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-\\w()@:%\\+.~#?&//=]*)>?';
const headerRegExp = `(?:[\\w- ]|(?:<a?:\\w{2,32}:\\d{17,20}>)|${emojiRegExp})`;
const projectRegExp = new RegExp(
  `^\\*\\*${headerRegExp}+\\*\\*\\n\\n(?:.*\\n)+\n(?:(?:${headerRegExp}* )?${urlRegExp}\n)+$`,
);

export default new FormatChecker({
  enabled: true,
  name: 'Project',
  description: 'Force le formatage du canal #projets.',
  channelName: 'projets',
  checker: ({ cleanContent }) => projectRegExp.test(cleanContent + '\n'),
  examples: [
    `**Nom du projet**\n\nDescription du projet\n\nhttps://github.com`,
  ],
});
