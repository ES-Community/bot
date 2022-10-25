import { test, expect } from 'vitest';

import { testLogger } from '../utils.js';
import { getOfferedGames } from '../../src/crons/EpicGames.js';

const oneDay = 1000 * 60 * 60 * 24;

test('getOfferedGames', async () => {
  const dates = generateDate();

  let lastGames;
  for (const date of dates) {
    const games = await getOfferedGames(date, testLogger);
    expect(Array.isArray(games)).toBe(true);

    if (!games) continue;

    if (lastGames) {
      if (
        lastGames.length >= games.length &&
        lastGames.every((g) => games.some((gg) => g.title === gg.title))
      ) {
        continue;
      }
    }
    lastGames = games;

    for (const game of games) {
      expect(game.id).toBeTruthy();
      expect(typeof game.id).toBe('string');

      expect(game.title).toBeTruthy();
      expect(typeof game.title).toBe('string');

      expect(game.link).toBeTruthy();
      expect(typeof game.link).toBe('string');

      expect(game.description).toBeTruthy();
      expect(typeof game.description).toBe('string');

      expect(game.discountStartDate instanceof Date).toBe(true);
      expect(game.discountEndDate instanceof Date).toBe(true);

      expect(game.originalPrice).toBeTruthy();
      expect(typeof game.originalPrice).toBe('string');
    }
  }
});

function generateDate(now = new Date()) {
  const nowMs = now.getTime();

  return Array(7)
    .fill(0)
    .map((v, i) => -i) // days
    .map((d) => d * oneDay) // days in ms
    .map((deltaMs) => new Date(nowMs + deltaMs));
}
