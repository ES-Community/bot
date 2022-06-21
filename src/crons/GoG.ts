import { MessageEmbed } from 'discord.js';
import got from 'got';
import { Logger } from 'pino';

import { Cron, findTextChannelByName } from '../framework';
import {parse} from "node-html-parser";

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
    'Vérifie tous les jours à 17h30 (Paris) si GoG offre un jeu (promotion gratuite) et alerte dans #jeux',
  schedule: '30 17 * * *',
  async handle(context) {
    const game = await getOfferedGame(context.logger);
    if (!game) {
      return;
    }

    const channel = findTextChannelByName(context.client.channels, 'jeux');
    
    context.logger.info(`Found a new offered game (${game.title})`);
  
    await channel.send(
      new MessageEmbed({ title: game.title, url: game.link })
        .setThumbnail(game.thumbnail)
        .addField(
          'Fin',
          game.discountEndDate.toLocaleDateString('fr-FR', dateFmtOptions),
          true,
        )
        .addField('Prix', `${game.originalPrice} → **Gratuit**`)
        .setTimestamp(),
    );
  },
});

/**
 * Game information extracted from the Epic Games GraphQL API.
 */
interface Game {
  /**
   * Game title.
   */
  title: string;
  /**
   * Game link.
   */
  link: string;
  /**
   * Game thumbnail.
   */
  thumbnail: string;
  /**
   * Game formatted original price.
   */
  originalPrice: string;
  /**
   * Game discount end date.
   */
  discountEndDate: Date;
}

/**
 * Fetches offered games from the Epic Games GraphQL API. If there are any and they
 * were offered between the previous and current cron execution, returns them.
 * @param logger
 */
async function getOfferedGame(logger: Logger): Promise<Game | null> {
  const { body: homeBody } = await got<string>('https://www.gog.com/#giveaway', {
    headers: {
      'Accept-Language': 'fr,fr-FR;q=0.8,fr-FR;q=0.7,en-US;q=0.5,en-US;q=0.3,en;q=0.2',
    },
  });
  
  if (!homeBody) return null;
  const html = parse(homeBody);
  if (!html) return null;
  const SEOLink = html.querySelector('a#giveaway');
  if (!SEOLink) return null;
  const endTimestamp = Number(
    SEOLink
      .querySelector('gog-countdown-timer')
      ?.getAttribute('end-date')
  );
  
  const { body: gameBody } = await got<string>(`https://www.gog.com${SEOLink.getAttribute('ng-href')}`, {
    headers: {
      'Accept-Language': 'fr,fr-FR;q=0.8,fr-FR;q=0.7,en-US;q=0.5,en-US;q=0.3,en;q=0.2',
    },
  });
  if (!gameBody) return null;
  const gameHTML = parse(gameBody);
  if (!gameHTML) return null;
  
  const ldJSONNode = gameHTML.querySelector('script[type="application/ld+json"]');
  const gameJSON = JSON.parse(ldJSONNode?.innerHTML ?? '');
  if (!gameJSON) return null;
  
  logger.info({ data: gameJSON }, 'Offered games response');
  
  return {
    title: gameJSON.name,
    // link: 'https://www.gog.com/#giveaway',
    link: gameJSON.offers.url,
    thumbnail: gameJSON.image ?? '',
    originalPrice: gameJSON.offers.price,
    discountEndDate: new Date(endTimestamp),
  };
}