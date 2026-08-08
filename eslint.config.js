import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', 'data/**', 'baileys_auth/**', 'coverage/**', 'scratch-*.mjs', 'scratch-*.js'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // These files call page.evaluate(() => { ... }) — the callback body is
    // serialized and executed inside the browser page, not in Node, so
    // browser globals like `document`/`window` are genuinely available there.
    files: [
      'src/discovery/amazonDeals.js',
      'src/discovery/googleShopping.js',
      'src/discovery/mercadolivreDeals.js',
      'src/scrapers/browser.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  prettierConfig,
];
