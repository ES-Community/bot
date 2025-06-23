import { EmbedBuilder, SnowflakeUtil } from 'discord.js';
import got from 'got';
import type { Logger } from 'pino';

import { KeyValue } from '../database/index.js';
import { Cron, findTextChannelByName } from '../framework/index.js';

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
    'Vérifie toutes les demi heures si Epic Games offre un jeu (promotion gratuite) et alerte dans #jeux',
  schedule: '5,35 * * * *',
  async handle(context) {
    const games = await getOfferedGames(context.date, context.logger);

    const rawLastResults = await KeyValue.get<string[]>('Last-Cron-Epic');
    const lastGames = new Set<string>(rawLastResults);
    const gamesToNotify = games.filter((g) => !lastGames.has(g.id));
    await KeyValue.set(
      'Last-Cron-Epic',
      games.map((g) => g.id),
    );

    const channel = findTextChannelByName(context.client.channels, 'jeux');

    for (const game of gamesToNotify) {
      context.logger.info(`Found a new offered game (${game.title})`);

      const message = new EmbedBuilder({ title: game.title, url: game.link });
      if (game.thumbnail) message.setThumbnail(game.thumbnail);
      if (game.banner) message.setImage(game.banner);

      await channel.send({
        embeds: [
          message
            .setDescription(game.description)
            .addFields(
              {
                name: 'Début',
                value: game.discountStartDate.toLocaleDateString(
                  'fr-FR',
                  dateFmtOptions,
                ),
                inline: true,
              },
              {
                name: 'Fin',
                value: game.discountEndDate.toLocaleDateString(
                  'fr-FR',
                  dateFmtOptions,
                ),
                inline: true,
              },
              { name: 'Prix', value: `${game.originalPrice} → **Gratuit**` },
            )
            .setTimestamp(),
        ],
        enforceNonce: true,
        nonce: SnowflakeUtil.generate().toString(),
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
        elements: Array<{
          id: string;
          title: string;
          description: string;
          keyImages: Array<{
            type: 'OfferImageWide' | 'OfferImageTall' | 'Thumbnail';
            url: string;
          }>;
          productSlug: string;
          catalogNs: {
            mappings: Array<{
              pageSlug: string;
              pageType: 'productHome' | 'offer';
            }>;
          };
          offerMappings: Array<{
            pageSlug: string;
            pageType: 'productHome' | 'offer';
          }>;
          urlSlug: string;
          price: {
            totalPrice: {
              fmtPrice: {
                originalPrice: string;
              };
            };
            lineOffers: Array<{
              appliedRules: Array<{
                startDate: string;
                endDate: string;
              }>;
            }>;
          };
        }>;
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
   * Game id.
   */
  id: string;
  /**
   * Game title.
   */
  title: string;
  /**
   * Game link.
   */
  link: string;
  /**
   * Game description.
   */
  description: string;
  /**
   * Game thumbnail.
   */
  thumbnail?: string;
  /**
   * Game banner.
   */
  banner?: string;
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
        id
        title
        productSlug
        catalogNs { mappings { pageSlug, pageType } }
        offerMappings { pageSlug, pageType }
        urlSlug
        description
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

/**
 * Fetches offered games from the Epic Games GraphQL API. If there are any and they
 * were offered between the previous and current cron execution, returns them.
 * @param now - Current date. Comes from cron schedule.
 * @param logger
 */
export async function getOfferedGames(
  now: Date,
  logger: Logger,
): Promise<Game[]> {
  const { body } = await got<EpicGamesProducts>(
    'https://graphql.epicgames.com/graphql',
    {
      method: 'POST',
      json: {
        query: OFFERED_GAMES_QUERY,
        variables: {
          country: 'FR',
          locale: 'fr',
          count: 20,
        },
      },
      responseType: 'json',
    },
  );

  logger.info({ data: body.data }, 'Offered games GraphQL response');

  const catalog = body.data.Catalog.searchStore;

  if (catalog.paging.total === 0) {
    return [];
  }

  const nowTime = now.getTime();

  // Keep only the games that were offered in the last day.
  const games = (catalog.elements ?? []).filter((game) => {
    const rule = game.price?.lineOffers?.[0]?.appliedRules?.[0];
    if (!rule) return false;

    const [startDate, endDate] = [
      new Date(rule.startDate),
      new Date(rule.endDate),
    ];

    return startDate.getTime() < nowTime && nowTime < endDate.getTime();
  });

  return games.map<Game>((game) => {
    const discount = game.price.lineOffers[0].appliedRules[0];
    let slug =
      game.productSlug ||
      game.offerMappings?.find((mapping) => mapping.pageType === 'productHome')
        ?.pageSlug ||
      game.catalogNs.mappings?.find(
        (mapping) => mapping.pageType === 'productHome',
      )?.pageSlug ||
      (!/^[\da-f]+$/.test(game.urlSlug) && game.urlSlug) ||
      '';

    if (!slug) {
      logger.error(game, 'No slug foundable');
    }

    // Sanitize the slug (e.g. sludge-life/home -> sludge-life).
    const slugSlashIndex = slug.indexOf('/');
    if (slugSlashIndex !== -1) {
      slug = slug.slice(0, slugSlashIndex);
    }

    const link = slug
      ? `https://www.epicgames.com/store/fr/p/${slug}`
      : 'https://store.epicgames.com/fr/free-games';

    let thumbnail = game.keyImages.find(
      (image) => image.type === 'Thumbnail',
    )?.url;
    thumbnail = thumbnail && encodeURI(thumbnail);

    let banner = game.keyImages.find(
      (image) => image.type === 'OfferImageWide',
    )?.url;
    banner = banner && encodeURI(banner);

    return {
      id: game.id,
      title: game.title,
      description: game.description,
      link,
      thumbnail,
      banner,
      originalPrice: game.price.totalPrice.fmtPrice.originalPrice,
      discountStartDate: new Date(discount.startDate),
      discountEndDate: new Date(discount.endDate),
    };
  });
}
