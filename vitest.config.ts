import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // We make some external calls which can take more than 5s.
    testTimeout: 15_000,
  },
});
