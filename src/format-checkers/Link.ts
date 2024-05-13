import { FormatChecker } from '../framework/index.js';
import createRegExp from 'emoji-regex';

const unicodeEmojiRegexp = createRegExp().source;
const urlRegexp =
  '<?https?:\\/\\/(?:www\\.)?[-\\w@:%.\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-\\w()@:%\\+.~#?&//=]*)>?';
const titleRegexp = `(?:[a-zA-Z0-9_\\- ]|(?:<a?:\\w{2,32}:\\d{17,20}>)|(?::\\w{2,32}:)|${unicodeEmojiRegexp})+`;
const linkRegexp = `^\\[( )?(\\*\\*)?${titleRegexp}\\2\\1\\](?:[^\\n])+ - ${urlRegexp}$`;

export default new FormatChecker({
  enabled: true,
  name: 'Link',
  description: 'Force le formatage du canal #liens.',
  channelName: 'liens',
  checker: new RegExp(linkRegexp),
  examples: [
    '[**SUJET**] Votre description ici - https://github.com/es-community',
    '[👍] Votre description ici - https://github.com/es-community',
  ],
});
