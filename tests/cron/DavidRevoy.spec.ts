import { test, expect } from 'vitest';

import { getLastDavidRevoyStrip } from '../../src/crons/DavidRevoy.ts';

test('getLastDavidRevoyStrip', async () => {
  const strip = await getLastDavidRevoyStrip();
  if (!strip) return;

  expect(strip.id).toBeTruthy();
  expect(typeof strip.id).toBe('string');

  expect(strip.link).toBeTruthy();
  expect(typeof strip.link).toBe('string');

  expect(strip.title).toBeTruthy();
  expect(typeof strip.title).toBe('string');

  expect(strip.imageUrl).toBeTruthy();
  expect(typeof strip.imageUrl).toBe('string');
});
