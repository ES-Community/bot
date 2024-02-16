import { EmbedBuilder } from 'discord.js';
import got from 'got';
import { Logger } from 'pino';

import { Cron, findTextChannelByName } from '../framework/index.js';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import { KeyValue } from '../database/index.js';

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
    'Vérifie toutes les heures si GoG offre un jeu (promotion gratuite) et alerte dans #jeux',
  schedule: '5 * * * *',
  // schedule: '* * * * *', // switch for testing
  async handle(context) {
    const game = await getOfferedGame(context.logger);

    // vérifie le jeu trouvé avec la dernière entrée
    const gameStoreIdentity = game?.title ?? null;

    const lastCron = await KeyValue.get<string>('Last-Cron-GOG');
    if (gameStoreIdentity === lastCron) return; // skip si identique

    await KeyValue.set('Last-Cron-GOG', gameStoreIdentity); // met à jour sinon

    const lastGame = await KeyValue.get<string>('Last-Cron-GOG-Found');
    if (gameStoreIdentity === lastGame) return; // skip si identique

    if (!game) return; // skip si pas de jeu

    await KeyValue.set('Last-Cron-GOG-Found', gameStoreIdentity); // met à jour sinon

    const channel = findTextChannelByName(context.client.channels, 'jeux');

    const embed = new EmbedBuilder()
      .setTitle(`GoG - ${game.title}`)
      .setURL('https://www.gog.com/#giveaway')
      .setDescription(game.description)
      .setImage(game.banner)
      .addFields({
        name: 'URL du jeu',
        value: game.link,
      })
      .addFields({
        name: 'Désinscription newsletter',
        value: 'https://www.gog.com/fr/account/settings/subscriptions',
      })
      .addFields({
        name: 'Fin',
        value: game.discountEndDate.toLocaleDateString('fr-FR', dateFmtOptions),
        inline: true,
      })
      .setTimestamp();

    if (game.thumbnail) embed.setThumbnail(game.thumbnail);
    if (game.originalPrice)
      embed.addFields({
        name: 'Prix',
        value: `${game.originalPrice}€ → **Gratuit**`,
      });
    if (game.rating)
      embed.addFields({ name: 'Note', value: `⭐ ${game.rating}` });

    await channel.send({ embeds: [embed] });
  },
});

/**
 * Game information extracted from the GoG Game (pre-rendered HTML scrapping).
 */
interface Game {
  title: string;
  description: string;
  link: string;
  thumbnail?: string;
  banner: string;
  originalPrice?: string;
  discountEndDate: Date;
  rating?: string;
}

/**
 * Fetches offered games from the Epic Games GraphQL API. If there are any, and they
 * were offered between the previous and current cron execution, return them.
 * @param logger
 */
export async function getOfferedGame(logger: Logger): Promise<Game | null> {
  const GOG_GOT_OPTIONS = {
    headers: {
      'Accept-Language':
        'fr,fr-FR;q=0.8,fr-FR;q=0.7,en-US;q=0.5,en-US;q=0.3,en;q=0.2',
    },
    followRedirect: true,
    throwHttpErrors: true,
  };
  const { body: homeBody } = await got<string>(
    'https://www.gog.com/fr#giveaway', // ensure get fr info or it's geolocalized
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

  const ldJSON = gameHTML.querySelector('script[type="application/ld+json"]');
  const ldJSONNode = ldJSON?.innerHTML ?? null;

  const gameJSON = ldJSONNode ? JSON.parse(ldJSONNode) : null;
  if (!gameJSON) {
    // the gift link redirect to incorrect page
    const title =
      SEOLink.querySelector('.giveaway-banner__title')?.textContent ??
      SEOLink.getAttribute('giveaway-banner-id') ??
      '';
    const description =
      SEOLink.querySelector('.giveaway-banner__description')?.textContent ?? '';
    const srcset =
      SEOLink.querySelector(
        '.giveaway-banner__image source[type="image/png"]',
      )?.getAttribute('srcset') ?? '';
    /*
     * srcset="
     * //images-1.gog-statics.com/c26a3d08d01005d92fbc4b658ab226fc5de374d3746f313a01c83e615cc066c1_giveaway_banner_logo_502_2x.png 2x,
     * //images-1.gog-statics.com/c26a3d08d01005d92fbc4b658ab226fc5de374d3746f313a01c83e615cc066c1_giveaway_banner_logo_502.png 1x
     * "
     */
    const [[banner]] = srcset.split(',').map((s) =>
      s
        .trim()
        .split(' ')
        .map((s) => s.trim()),
    );

    logger.info(
      { data: { title, description, banner } },
      'Offered games response (compute form homepage only)',
    );

    return {
      title: title.normalize().trim(),
      description: decode(description.trim()),
      link: 'https://www.gog.com/#giveaway',
      banner: `https:${banner}`,
      discountEndDate: new Date(endTimestamp),
    };
  }

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

  const rating = gameJSON.aggregateRating?.ratingValue ?? '?';

  return {
    title: gameJSON.name.trim(),
    description: decode(description),
    // link: 'https://www.gog.com/fr#giveaway',
    link: gameJSON.offers.url,
    thumbnail: gameJSON.image,
    banner,
    originalPrice: gameJSON.offers.price,
    discountEndDate: new Date(endTimestamp),
    rating: `${rating} / 5`,
  };
}
