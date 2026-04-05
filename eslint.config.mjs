import pellegrimsBase from '@pellegrims/eslint-config-base';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...pellegrimsBase,
  ...nextCoreWebVitals,
  ...nextTypescript,
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
