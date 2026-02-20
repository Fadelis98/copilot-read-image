// @ts-check
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

const tsRules = {
  ...tseslint.configs.recommended.rules,
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/explicit-function-return-type': 'off',
  'no-console': 'warn',
};

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint },
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: './tsconfig.eslint.json' },
      globals: { ...globals.node },
    },
    rules: tsRules,
  },
  {
    files: ['tests/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint },
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: './tsconfig.eslint.json' },
      globals: { ...globals.node, ...globals.jest },
    },
    rules: tsRules,
  },
];
