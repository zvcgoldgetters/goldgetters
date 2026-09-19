import pellegrimsBase from '@pellegrims/eslint-config-base';
import { plugin as shadcn } from '@shadcn/lint';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...pellegrimsBase,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { shadcn },
    rules: {
      'shadcn/no-restyle': [
        'error',
        {
          allow: ['layout'],
          contracts: [
            { pattern: '^Button$', allow: ['layout', 'rounded-full'] },
          ],
        },
      ],
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-arbitrary-values': ['error', { allow: ['layout'] }],
      'shadcn/no-inline-styles': 'error',
      'shadcn/require-static-classes': 'error',
      'shadcn/no-unknown-classes': 'error',
    },
  },
  {
    files: ['components/ui/**', 'components/goldgetters/**'],
    rules: {
      'shadcn/no-restyle': 'off',
      'shadcn/no-arbitrary-values': 'off',
      'shadcn/require-static-classes': 'off',
    },
  },
  {
    files: ['app/(payload)/admin/**/*.tsx', 'app/(payload)/layout.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    files: [
      'migrations/**/*.ts',
      'payload/collections/**/*.ts',
      'playwright.config.ts',
      'vitest.config.ts',
    ],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'migrations/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
