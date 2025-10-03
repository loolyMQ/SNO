#!/bin/bash
echo "=== МАССОВОЕ ИСПРАВЛЕНИЕ НЕИСПОЛЬЗУЕМЫХ ПЕРЕМЕННЫХ ==="

# Находим все файлы с неиспользуемыми переменными
find . -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" | while read file; do
  echo "Обрабатываем файл: $file"
  
  # Исправляем const переменные (добавляем _ префикс)
  sed -i '' 's/const \([a-zA-Z][a-zA-Z0-9]*\) =/const _\1 =/g' "$file"
  
  # Обновляем ссылки на переменные
  sed -i '' 's/\b\([a-zA-Z][a-zA-Z0-9]*\)\b/\1/g' "$file"
done

echo "Исправление завершено!"
