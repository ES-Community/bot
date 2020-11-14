import FormatChecker from '../framework/FormatChecker';

export default new FormatChecker({
  enabled: true,
  name: 'Job',
  description: 'Force le formattage du channel #jobs.',
  channelName: 'jobs',
  checker: (message) => {
    const lines = message.split('\n');
    const headerParts = lines[0].split(' - ');

    const predicates = [
      lines.length >= 2,
      lines[0].startsWith('**') && lines[0].endsWith('**'),
      headerParts.length === 3,
    ];

    return !predicates.includes(false);
  },
});
