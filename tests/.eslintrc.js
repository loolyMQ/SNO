module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': 'off', // Allow console in tests
    'no-unused-vars': 'error'
  },
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  ignorePatterns: [
    '../backend/**',
    '../platform/**',
    '../frontend/**',
    '../node_modules/**',
    '../**'
  ],
  root: true
};
