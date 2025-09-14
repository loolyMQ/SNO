'use client';

import { useState } from 'react';
import { Button, Input } from './ui';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Поиск по научным данным..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          loading={isLoading}
        >
          {isLoading ? 'Поиск...' : 'Найти'}
        </Button>
      </form>
    </div>
  );
}
