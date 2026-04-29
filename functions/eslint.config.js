import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['**/dist/', '**/node_modules/', '**/.*'] },

  js.configs.recommended,

  {
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...tsPlugin.configs.strict.rules,
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
