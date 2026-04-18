import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import react19UpgradePlugin from 'eslint-plugin-react-19-upgrade';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}'];
const configFiles = ['eslint.config.js', 'vite.config.ts'];

const reactHooksConfig = {
  ...reactHooksPlugin.configs.flat.recommended,
  files: sourceFiles,
};

export default defineConfig([
  {
    name: 'script-master/ignores',
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'package-lock.json',
      '**/*.d.ts',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooksConfig,
  {
    name: 'script-master/source-rules',
    files: sourceFiles,
    plugins: {
      'react-19-upgrade': react19UpgradePlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@mui/material',
              message:
                'Evite barrel import do MUI. Prefira imports por caminho, como @mui/material/Button, para manter o Vite mais rápido no desenvolvimento.',
            },
            {
              name: '@mui/icons-material',
              message:
                'Evite barrel import dos ícones. Prefira imports por caminho, como @mui/icons-material/Delete, para manter o Vite mais rápido no desenvolvimento.',
            },
          ],
        },
      ],
      'react-hooks/set-state-in-effect': 'off',
      'react-19-upgrade/no-factories': 'error',
      'react-19-upgrade/no-legacy-context': 'error',
      'react-19-upgrade/no-prop-types': 'error',
      'react-19-upgrade/no-string-refs': 'error',
    },
  },
  {
    name: 'script-master/config-files',
    files: configFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
]);
