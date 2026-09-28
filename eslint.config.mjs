import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends('next/core-web-vitals'),

  ...tseslint.configs.recommended,

  prettier,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      'react-hooks/exhaustive-deps': 'warn',

      '@next/next/no-img-element': 'off',
    },
  },

  {
    ignores: [
        '.next/**',
        'node_modules/**',
        'out/**',
        'build/**',
        'coverage/**',
        'dist/**',
        '.vercel/**',
        'next-env.d.ts',
    ],
  },
];