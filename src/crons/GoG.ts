import { MessageEmbed } from 'discord.js';
import got from 'got';
import { Logger } from 'pino';

import { Cron, findTextChannelByName } from '../framework';
import { parse } from 'node-html-parser';
import { KeyValue } from "#src/database";

const dateFmtOptions: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

export default new Cron({
  enabled: true,
  name: 'GoG',
  description:
    'Vérifie toutes les demi heures si GoG offre un jeu (promotion gratuite) et alerte dans #jeux',
  schedule: '5,35 * * * *',
  // schedule: "* * * * *", // switch for testing
  async handle(context) {
    const game = await getOfferedGame(context.logger);
    
    // vérifie le jeu trouvé avec la dernière entrée
    const lastGame = await KeyValue.get('Last-Cron-GOG') as unknown as string;
    const gameStoreIdentity = game?.title ?? null;
    if (lastGame === gameStoreIdentity) return; // skip si identique
    
    await KeyValue.set('Last-Cron-GOG', gameStoreIdentity) // met à jour sinon
    
    if (!game) return; // skip si pas de jeu

    const channel = findTextChannelByName(context.client.channels, 'jeux');

    await channel.send(
      new MessageEmbed()
        .setTitle(game.title)
        .setURL(game.link)
        .setDescription(game.description)
        .setThumbnail(game.thumbnail)
        .setImage(game.banner)
        .addField(
          'Fin',
          game.discountEndDate.toLocaleDateString('fr-FR', dateFmtOptions),
          true,
        )
        .addField('Prix', `${game.originalPrice}€ → **Gratuit**`)
        .addField('Note', `⭐ ${game.rating}`)
        .setTimestamp(),
    );
  },
});

/**
 * Game information extracted from the GoG Game (pre-rendered HTML scrapping).
 */
interface Game {
  title: string;
  description: string;
  link: string;
  thumbnail: string;
  banner: string;
  originalPrice: string;
  discountEndDate: Date;
  rating: string;
}

/**
 * Fetches offered games from the Epic Games GraphQL API. If there are any, and they
 * were offered between the previous and current cron execution, returns them.
 * @param logger
 */
async function getOfferedGame(logger: Logger): Promise<Game | null> {
  const GOG_GOT_OPTIONS = {
    headers: {
      'Accept-Language':
        'fr,fr-FR;q=0.8,fr-FR;q=0.7,en-US;q=0.5,en-US;q=0.3,en;q=0.2',
    },
  };
  const { body: homeBody } = await got<string>(
    'https://www.gog.com/#giveaway',
    GOG_GOT_OPTIONS,
  );

  if (!homeBody) return null;
  const html = parse(homeBody);
  if (!html) return null;
  const SEOLink = html.querySelector('a#giveaway');
  if (!SEOLink) return null;
  const endTimestamp = Number(
    html
      .querySelector('.giveaway-banner__footer gog-countdown-timer')
      ?.getAttribute('end-date'),
  );

  const { body: gameBody } = await got<string>(
    `https://www.gog.com${SEOLink.getAttribute('ng-href')}`,
    GOG_GOT_OPTIONS,
  );
  if (!gameBody) return null;
  const gameHTML = parse(gameBody);
  if (!gameHTML) return null;

  const ldJSONNode = gameHTML.querySelector(
    'script[type="application/ld+json"]',
  );
  const gameJSON = JSON.parse(ldJSONNode?.innerHTML ?? '');
  if (!gameJSON) return null;

  const description =
    gameHTML.querySelector('.content-summary-item__description')?.innerText ??
    '';
  const banner =
    gameHTML
      .querySelector('head meta[property="og:image"]')
      ?.getAttribute('content') ?? '';

  logger.info(
    { data: { gameJSON, description, banner } },
    'Offered games response',
  );

  return {
    title: gameJSON.name,
    description,
    // link: 'https://www.gog.com/#giveaway',
    link: gameJSON.offers.url,
    thumbnail: gameJSON.image,
    banner,
    originalPrice: gameJSON.offers.price,
    discountEndDate: new Date(endTimestamp),
    rating: `${gameJSON.aggregateRating.ratingValue} / 5`,
  };
}
