module.exports = {
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md,yml,yaml,css,scss,sass}': [
    'prettier --write'
  ]
};
