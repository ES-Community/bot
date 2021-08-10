export default {
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    // Since Jest doesn't supports `exports`, it will resolve the CJS exports of discord.js
    // a way to fix this, is to force the use of the ESM wrapper of discord.js
    '^discord.js$': 'discord.js/src/index.mjs',
    '^node:(.+)$': '$1',
    '^(\\.\\.?/.+)\\.js$': '$1',
    '^#src/(.*)$': '<rootDir>/src/$1',
  },
};
