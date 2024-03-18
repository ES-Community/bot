import { test, expect } from 'vitest';

import { getLastChronicle } from '../../src/crons/WorkChronicles.js';

test('getLastChronicle', async () => {
  const chronicle = await getLastChronicle();
  if (!chronicle) return;

  expect(chronicle.id).toBeTruthy();
  expect(typeof chronicle.id).toBe('number');

  expect(chronicle.link).toBeTruthy();
  expect(typeof chronicle.link).toBe('string');

  expect(chronicle.title).toBeTruthy();
  expect(typeof chronicle.title).toBe('string');

  expect(chronicle.imageUrl).toBeTruthy();
  expect(typeof chronicle.imageUrl).toBe('string');
});
