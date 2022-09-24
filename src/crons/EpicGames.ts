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
    'Vérifie tous les jours à 17h30 (Paris) si Epic Games offre un jeu (promotion gratuite) et alerte dans #jeux',
  schedule: '30 17 * * *',
  async handle(context) {
    const games = await getOfferedGames(context.date, context.logger);
    if (!games) {
      return;
    }

    const channel = findTextChannelByName(context.client.channels, 'jeux');

    for (const game of games) {
      context.logger.info(`Found a new offered game (${game.title})`);
      
      const message = new MessageEmbed({ title: game.title, url: game.link });
      game.thumbnail && message.setThumbnail(game.thumbnail);
      game.banner && message.setImage(game.banner);

      await channel.send(
        message
          .setDescription(game.description)
          .addField(
            'Début',
            game.discountStartDate.toLocaleDateString('fr-FR', dateFmtOptions),
            true,
          )
          .addField(
            'Fin',
            game.discountEndDate.toLocaleDateString('fr-FR', dateFmtOptions),
            true,
          )
          .addField('Prix', `${game.originalPrice} → **Gratuit**`)
          .setTimestamp(),
      );
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
          description: string;
          keyImages: {
            type: 'OfferImageWide' | 'OfferImageTall' | 'Thumbnail';
            url: string;
          }[];
          productSlug: string;
          catalogNs: {
            mappings: {
              pageSlug: string,
              pageType: 'productHome' | 'offer'
            }[];
          };
          offerMappings: {
            pageSlug: string,
            pageType: 'productHome' | 'offer'
          }[];
          urlSlug: string;
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

const oneDay = 1000 * 60 * 60 * 24;

/**
 * Fetches offered games from the Epic Games GraphQL API. If there are any and they
 * were offered between the previous and current cron execution, returns them.
 * @param now - Current date. Comes from cron schedule.
 * @param logger
 */
export async function getOfferedGames(
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
    let slug = game.productSlug
      || game.offerMappings?.find(i => i.pageType === 'productHome')?.pageSlug
      || game.catalogNs.mappings?.find(i => i.pageType === 'productHome')?.pageSlug
      || (!/^[0-9a-f]+$/.test(game.urlSlug) && game.urlSlug)
      || '';
    
    if (!slug) {
      logger.error(game, 'No slug foundable');
    }
  
    // Sanitize the slug (e.g. sludge-life/home -> sludge-life).
    const slugSlashIndex = slug.indexOf('/');
    if (slugSlashIndex >= 0) {
      slug = slug.slice(0, slugSlashIndex);
    }
    
    const link = slug
      ? `https://www.epicgames.com/store/fr/p/${slug}`
      : 'https://store.epicgames.com/fr/free-games';
    
    let thumbnail = game.keyImages.find((image) => image.type === 'Thumbnail')?.url;
    thumbnail = thumbnail && encodeURI(thumbnail);
    
    let banner = game.keyImages.find((image) => image.type === 'OfferImageWide')?.url;
    banner = banner && encodeURI(banner);

    return {
      title: game.title,
      description: game.description,
      link: link,
      thumbnail: thumbnail,
      banner: banner,
      originalPrice: game.price.totalPrice.fmtPrice.originalPrice,
      discountStartDate: new Date(discount.startDate),
      discountEndDate: new Date(discount.endDate),
    };
  });
}
