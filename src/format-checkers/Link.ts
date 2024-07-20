import { FormatChecker } from '../framework/index.js';

const urlRegexp = String.raw`<?https?://(?:www\.)?[-\w@:%.\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-\w()@:%\+.~#?&//=]*)>?`;
const titleRegexp = String.raw`(?:[a-zA-Z0-9_\- ]|(?:<a?:\w{2,32}:\d{17,20}>)|(?::\w{2,32}:)|(?:\p{Emoji_Presentation}\p{Emoji_Modifier}*))+`;
const linkRegexp = String.raw`^\[( )?(\*\*)?${titleRegexp}\2\1\](?:[^\n])+ - ${urlRegexp}$`;

export default new FormatChecker({
  enabled: true,
  name: 'Link',
  description: 'Force le formatage du canal #liens.',
  channelName: 'liens',
  checker: new RegExp(linkRegexp, 'u'),
  examples: [
    '[**SUJET**] Votre description ici - https://github.com/es-community',
    '[👍] Votre description ici - https://github.com/es-community',
  ],
});
