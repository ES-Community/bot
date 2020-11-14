import { FormatChecker } from '../framework';
import createRegExp from 'emoji-regex';

const textRegexp = '\\*\\*[A-Z]+\\*\\*';
const discordEmojiRegexp = '<a?:\\w{2,32}:\\d{17,}>';
const unicodeEmojiRegexp = `${createRegExp().source}`;
const urlRegexp =
  'https?:\\/\\/(www\\.)?[-\\w@:%.\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-\\w()@:%\\+.~#?&//=]*)';
const descriptionRegexp = '([^\\r\\n])+ ';
const linkRegexp = `^\\[${textRegexp}|( ?((${discordEmojiRegexp})|${unicodeEmojiRegexp})+ ?)\\]${descriptionRegexp}- ${urlRegexp}$`;
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
