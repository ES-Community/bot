import { getOfferedGame } from '#src/crons/GoG';
import { testLogger } from '../utils';

test('getOfferedGames', async () => {
  const game = await getOfferedGame(testLogger);
  if (!game) return;

  expect(game.title).toBeTruthy();
  expect(typeof game.title).toBe('string');

  expect(game.description).toBeTruthy();
  expect(typeof game.description).toBe('string');

  expect(game.link).toBeTruthy();
  expect(typeof game.link).toBe('string');

  // expect(game.thumbnail).toBeTruthy();
  // expect(typeof game.thumbnail).toBe('string');

  expect(game.banner).toBeTruthy();
  expect(typeof game.banner).toBe('string');

  // expect(game.originalPrice).toBeTruthy();
  // expect(typeof game.originalPrice).toBe('string');

  expect(game.discountEndDate).toBeTruthy();
  expect(game.discountEndDate instanceof Date).toBe(true);

  // expect(game.rating).toBeTruthy();
  // expect(typeof game.rating).toBe('string');
});