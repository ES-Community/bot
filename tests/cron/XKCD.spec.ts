import { test, expect } from 'vitest';

import { getLastXKCDStrip } from '../../src/crons/XKCD.js';

test('getLastXKCDStrip', async () => {
  const strip = await getLastXKCDStrip();
  if (!strip) return;

  expect(strip.id).toBeTruthy();
  expect(typeof strip.id).toBe('string');

  expect(strip.link).toBeTruthy();
  expect(typeof strip.link).toBe('string');

  expect(strip.title).toBeTruthy();
  expect(typeof strip.title).toBe('string');

  expect(strip.description).toBeTruthy();
  expect(typeof strip.description).toBe('string');

  expect(strip.imageUrl).toBeTruthy();
  expect(typeof strip.imageUrl).toBe('string');
});
