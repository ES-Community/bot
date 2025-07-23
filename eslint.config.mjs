import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['coverage', 'build']),
  eslint.configs.recommended,
  unicorn.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
    },
  },
);
