import { MessageEmbed } from 'discord.js';
import got from 'got';
import { Logger } from 'pino';

import { Cron, findTextChannelByName } from '../framework';

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
  name: 'EpicGames',
  description:
    'Vérifie tous les jours à 17h00 (Paris) si Epic Games offre un jeu (promotion gratuite) et alerte dans #jeux',
  schedule: '0 17 * * *',
  async handle(context) {
    const games = await getOfferedGames(context.date, context.logger);
    if (!games) {
      return;
    }

    const channel = findTextChannelByName(context.client.channels, 'jeux');

    for (const game of games) {
      context.logger.info(`Found a new offered game (${game.title})`);

      await channel.send({
        embeds: [
          new MessageEmbed({ title: game.title, url: game.link })
            .setThumbnail(game.thumbnail)
            .addField(
              'Début',
              game.discountStartDate.toLocaleDateString(
                'fr-FR',
                dateFmtOptions,
              ),
              true,
            )
            .addField(
              'Fin',
              game.discountEndDate.toLocaleDateString('fr-FR', dateFmtOptions),
              true,
            )
            .addField('Prix', `${game.originalPrice} → **Gratuit**`)
            .setTimestamp(),
        ],
      });
    }
  },
});

/**
 * Subset of the fields returned by the Epic Games GraphQL API.
 */
interface EpicGamesProducts {
  data: {
    Catalog: {
      searchStore: {
        elements: {
          title: string;
          keyImages: {
            type: string;
            url: string;
          }[];
          productSlug: string;
          price: {
            totalPrice: {
              fmtPrice: {
                originalPrice: string;
              };
            };
            lineOffers: {
              appliedRules: {
                startDate: string;
                endDate: string;
              }[];
            }[];
          };
        }[];
        paging: {
          total: number;
        };
      };
    };
  };
}

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
   * Game discount start date.
   */
  discountStartDate: Date;
  /**
   * Game discount end date.
   */
  discountEndDate: Date;
}

const OFFERED_GAMES_QUERY = `query searchStoreQuery($country: String!, $locale: String!, $count: Int) {
  Catalog {
    searchStore(category: "games", country: $country, locale: $locale, freeGame: true, onSale: true, count: $count) {
      elements {
        title productSlug
        keyImages { type url }
        price(country: $country) {
          totalPrice {
            fmtPrice(locale: $locale) { originalPrice }
          }
          lineOffers {
            appliedRules { startDate endDate }
          }
        }
      }
      paging { total }
    }
  }
}`;

const oneDay = 1000 * 60 * 60 * 24;

/**
 * Fetches offered games from the Epic Games GraphQL API. If there are any and they
 * were offered between the previous and current cron execution, returns them.
 * @param now - Current date. Comes from cron schedule.
 */
async function getOfferedGames(
  now: Date,
  logger: Logger,
): Promise<Game[] | null> {
  const { body } = await got<EpicGamesProducts>(
    'https://www.epicgames.com/graphql',
    {
      method: 'POST',
      json: {
        query: OFFERED_GAMES_QUERY,
        variables: {
          country: 'FR',
          locale: 'fr',
          count: 1000,
        },
      },
      responseType: 'json',
    },
  );

  logger.info({ data: body.data }, 'Offered games GraphQL response');

  const catalog = body.data.Catalog.searchStore;

  if (catalog.paging.total === 0) {
    return null;
  }

  const nowTime = now.getTime();

  // Keep only the games that were offered in the last day.
  const games = catalog.elements.filter((game) => {
    const startDate = new Date(
      game.price.lineOffers[0].appliedRules[0].startDate,
    );
    return nowTime - startDate.getTime() < oneDay;
  });

  if (games.length === 0) {
    return null;
  }

  return games.map<Game>((game) => {
    const discount = game.price.lineOffers[0].appliedRules[0];
    const slug = game.productSlug;
    const slugSlashIndex = slug.indexOf('/');

    return {
      title: game.title,
      // Sanitize the slug (e.g. sludge-life/home -> sludge-life).
      link: `https://www.epicgames.com/store/fr/p/${
        slugSlashIndex === -1 ? slug : slug.slice(0, slugSlashIndex)
      }`,
      thumbnail:
        game.keyImages.find((image) => image.type === 'Thumbnail')?.url ||
        game.keyImages[0].url,
      originalPrice: game.price.totalPrice.fmtPrice.originalPrice,
      discountStartDate: new Date(discount.startDate),
      discountEndDate: new Date(discount.endDate),
    };
  });
}
