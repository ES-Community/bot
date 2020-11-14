import { FormatChecker } from '../framework';

export default new FormatChecker({
  enabled: true,
  name: 'Job',
  description: 'Force le formatage du canal #jobs.',
  channelName: 'jobs',
  checker({ cleanContent }, logger) {
    const lines = cleanContent.split('\n', 2);
    const headerParts = lines[0].split(' - ', 4);

    const predicates = [
      lines.length === 2,
      lines[0].startsWith('**') && lines[0].endsWith('**'),
      headerParts.length === 3,
    ];

    logger.trace(predicates, 'predicates failed');
    return !predicates.includes(false);
  },
  examples: [
    [
      '**[ Orientation du poste ] - [ Langage(s) et/ou technologie(s) (si possible avec des émojis) ] - Intitulé du poste**',
      'Description courte (missions proposés, lieu, nom de la boite, rémunération, etc.)',
      "Lien de l'annonce et/ou contact",
    ].join('\n'),
  ],
});
