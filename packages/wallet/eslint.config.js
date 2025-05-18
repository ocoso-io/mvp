// eslint.config.js
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals'

export default [
    eslint.configs.recommended,
    {
        ignores: ['dist/**', 'node_modules/**', '*.js', '*.d.ts']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json'
            },
            globals: {
                ...globals.browser
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'import': importPlugin,
            'promise': promisePlugin,
            'sonarjs': sonarjsPlugin,
            'unicorn': unicornPlugin,
            'prettier': prettierPlugin
        },
        rules: {
            // TypeScript-Regeln
            ...tseslint.configs['recommended'].rules,
            ...tseslint.configs['recommended-requiring-type-checking'].rules,
            '@typescript-eslint/explicit-module-boundary-types': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],

            // Import-Regeln
            'import/order': ['error', {
                'groups': [
                    'builtin',
                    'external',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                ],
                'newlines-between': 'always',
                'alphabetize': {
                    order: 'asc',
                    caseInsensitive: true
                }
            }],

            // Promise-Regeln
            ...promisePlugin.configs.recommended.rules,
            'promise/always-return': 'warn',

            // SonarJS-Regeln
            ...sonarjsPlugin.configs.recommended.rules,
            'sonarjs/cognitive-complexity': ['error', 15],

            // Unicorn-Regeln (moderne JS-Praktiken)
            ...unicornPlugin.configs.recommended.rules,
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/no-null': 'off',
            'unicorn/filename-case': ['error', {
                'cases': {
                    'camelCase': true,
                    'pascalCase': true
                }
            }],

            // Allgemeine Regeln
            'no-console': 'warn',

            // Prettier-Konfiguration
            'prettier/prettier': ['error', {
                singleQuote: true,
                trailingComma: 'es5',
                printWidth: 100,
                tabWidth: 4,
                semi: true,
                bracketSpacing: false,
                "require-await": false
            }]
        }
    },
    // Test-spezifische Regeln
    {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'sonarjs/no-duplicate-string': 'off'
        }
    },
    prettierConfig
];