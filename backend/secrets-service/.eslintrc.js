module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'error',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'off',
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
    
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-var-requires': 'error'
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.d.ts',
    'coverage/',
    'build/',
    'public/'
  ]
};
