import { resolve } from 'path';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';

const projectRoot = resolve(import.meta.dirname);

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'packages/*/dist/**',
      'packages/*/node_modules/**'
    ]
  },
  {
    // Konfiguration für TypeScript-Dateien
    files: ['**/*.ts', '**/*.tsx'],
    settings: {
      'import/resolver': {
        typescript: {
          project: resolve(projectRoot, './tsconfig.json'),
        },
      },
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2020,
        sourceType: 'module',
        jsx: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
      '@next/next': nextPlugin
    },
    rules: {
      'no-console': ['warn', {allow: ['warn', 'error']}],
      'no-debugger': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', {'avoidEscape': true}],
      'max-len': ['error', {'code': 100}],

      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],

      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': {'order': 'asc', 'caseInsensitive': true}
      }],
    },
  },
  {
    // JavaScript-Dateien
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      jsx: true,
    },
    plugins: {
      '@next/next': nextPlugin
    },
  }
];