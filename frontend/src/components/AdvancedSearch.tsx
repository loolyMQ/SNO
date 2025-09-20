'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

export interface SearchFilter {
  type: 'paper' | 'author' | 'institution' | 'topic' | 'all';
  dateRange: {
    start: string;
    end: string;
  };
  keywords: string[];
  minConnections: number;
  maxConnections: number;
}

export interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilter) => void;
  onClear: () => void;
  isLoading?: boolean;
  searchHistory?: string[];
  suggestions?: string[];
}

export function AdvancedSearch({
  onSearch,
  onClear,
  isLoading = false,
  searchHistory = [],
  suggestions = [],
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({
    type: 'all',
    dateRange: {
      start: '',
      end: '',
    },
    keywords: [],
    minConnections: 0,
    maxConnections: 1000,
  });
  const [keywordInput, setKeywordInput] = useState('');

  // Обработка поиска
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim(), filters);
    }
  }, [query, filters, onSearch]);

  // Обработка очистки
  const handleClear = useCallback(() => {
    setQuery('');
    setFilters({
      type: 'all',
      dateRange: { start: '', end: '' },
      keywords: [],
      minConnections: 0,
      maxConnections: 1000,
    });
    onClear();
  }, [onClear]);

  // Добавление ключевого слова
  const addKeyword = useCallback(() => {
    if (keywordInput.trim() && !filters.keywords.includes(keywordInput.trim())) {
      setFilters(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  }, [keywordInput, filters.keywords]);

  // Удаление ключевого слова
  const removeKeyword = useCallback((keyword: string) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword),
    }));
  }, []);

  // Обработка Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Фильтрация истории поиска
  const filteredHistory = useMemo(() => {
    if (!query) return searchHistory.slice(0, 5);
    return searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query, searchHistory]);

  // Фильтрация предложений
  const filteredSuggestions = useMemo(() => {
    if (!query) return suggestions.slice(0, 5);
    return suggestions
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query, suggestions]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Основная строка поиска */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Поиск по научным работам, авторам, институтам..."
              className="w-full"
            />
            
            {/* Выпадающий список с историей и предложениями */}
            {(filteredHistory.length > 0 || filteredSuggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                {filteredHistory.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-1">История поиска:</div>
                    {filteredHistory.map((item, index) => (
                      <div
                        key={index}
                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => setQuery(item)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
                {filteredSuggestions.length > 0 && (
                  <div className="p-2 border-t">
                    <div className="text-xs text-gray-500 mb-1">Предложения:</div>
                    {filteredSuggestions.map((item, index) => (
                      <div
                        key={index}
                        className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => setQuery(item)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
            {isLoading ? 'Поиск...' : 'Найти'}
          </Button>
          
          <Button variant="outline" onClick={handleClear}>
            Очистить
          </Button>
        </div>

        {/* Кнопка расширенного поиска */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Скрыть фильтры' : 'Расширенный поиск'}
          </Button>
          
          {filters.keywords.length > 0 && (
            <div className="text-sm text-gray-600">
              Ключевые слова: {filters.keywords.length}
            </div>
          )}
        </div>

        {/* Расширенные фильтры */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Тип контента */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип контента:
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  type: e.target.value as SearchFilter['type'],
                }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">Все типы</option>
                <option value="paper">Научные работы</option>
                <option value="author">Авторы</option>
                <option value="institution">Институты</option>
                <option value="topic">Темы</option>
              </select>
            </div>

            {/* Диапазон дат */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата от:
                </label>
                <Input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value },
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата до:
                </label>
                <Input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value },
                  }))}
                />
              </div>
            </div>

            {/* Ключевые слова */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ключевые слова:
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Добавить ключевое слово"
                  className="flex-1"
                />
                <Button onClick={addKeyword} size="sm">
                  Добавить
                </Button>
              </div>
              {filters.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Количество связей */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Мин. связей:
                </label>
                <Input
                  type="number"
                  min="0"
                  value={filters.minConnections}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minConnections: parseInt(e.target.value) || 0,
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Макс. связей:
                </label>
                <Input
                  type="number"
                  min="0"
                  value={filters.maxConnections}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    maxConnections: parseInt(e.target.value) || 1000,
                  }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
