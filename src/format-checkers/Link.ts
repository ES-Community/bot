import { FormatChecker } from '../framework/index.js';
import emojiRegExp from '../emoji-regex.js';

const urlRegExp =
  '<?https?:\\/\\/(?:www\\.)?[-\\w@:%.\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-\\w()@:%\\+.~#?&//=]*)>?';
const titleRegExp = `(?:[\\w- ]|(?:<a?:\\w{2,32}:\\d{17,20}>)|${emojiRegExp})+`;
const linkRegExp = `^\\[( )?(\\*\\*)?${titleRegExp}\\2\\1\\](?:[^\\n])+ - ${urlRegExp}$`;

export default new FormatChecker({
  enabled: true,
  name: 'Link',
  description: 'Force le formatage du canal #liens.',
  channelName: 'liens',
  checker: new RegExp(linkRegExp),
  examples: [
    '[**SUJET**] Votre description ici - https://github.com/es-community',
    '[👍] Votre description ici - https://github.com/es-community',
  ],
});
