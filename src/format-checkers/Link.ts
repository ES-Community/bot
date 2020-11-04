import FormatChecker from '../framework/FormatChecker';
import createRegExp from 'emoji-regex';

const textRegexp = '\\*\\*[A-Z]+\\*\\*';
// todo: limiter aux emojis disponibles sur le serveur
const discordEmojiRegexp = '<:[a-z]+:[0-9]+>';
const unicodeEmojiRegexp = createRegExp().source;
const urlRegexp =
  'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)';
const linkRegexp = `^\\[((${textRegexp})|(${discordEmojiRegexp})|${unicodeEmojiRegexp})\\] [\\w ]+ - ${urlRegexp}$`;

export default new FormatChecker({
  enabled: true,
  name: 'Link',
  description: 'Force le formattage du channel #liens.',
  channelName: 'liens',
  regexp: new RegExp(linkRegexp),
  examples: [
    '[**SUJET**] Votre description ici - https://github.com/es-community',
    '[👍] Votre description ici - https://github.com/es-community',
  ],
});
