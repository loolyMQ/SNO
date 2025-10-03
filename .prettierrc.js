module.exports = {
  // Основные настройки
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  
  // Настройки для разных типов файлов
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always'
      }
    },
    {
      files: '*.yml',
      options: {
        printWidth: 100,
        tabWidth: 2
      }
    }
  ],
  
  // Игнорируемые файлы
  ignorePath: '.prettierignore'
};
