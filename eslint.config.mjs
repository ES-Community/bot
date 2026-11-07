import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['coverage', 'build']),
  eslint.configs.recommended,
  unicorn.configs.recommended,
  {
    extends: tseslint.configs.recommended,
    files: ['**/*.{js,ts}'],
  },
  {
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-asterisk-prefix-in-documentation-comments': 'off',
      'unicorn/prefer-scoped-selector': 'off',
      'unicorn/prefer-await': 'off',
      'unicorn/prefer-dom-node-html-methods': 'off',
    },
  },
);
