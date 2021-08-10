import { Command, CommandOptionTypes } from '../framework/index.js';

export default new Command({
  name: 'hello',
  description: 'Vous salue.',
  enabled: true,
  options: {
    stars: {
      description: "Nombre d'étoiles accompagnant le salut.",
      required: true,
      type: CommandOptionTypes.Integer,
      choices: [
        { name: '1 étoile', value: 1 },
        { name: '2 étoiles', value: 2 },
        { name: '3 étoiles', value: 3 },
        { name: '4 étoiles', value: 4 },
        { name: '5 étoiles', value: 5 },
      ] as const,
    },
    user: {
      description: 'Mentionne un utilisateur spécifique (vous par défaut).',
      type: CommandOptionTypes.User,
    },
  },
  handle({ args, interaction }) {
    return interaction.reply(
      `Salut ${(args.user ?? interaction.user).toString()} ${'⭐'.repeat(
        args.stars,
      )}`,
    );
  },
});
