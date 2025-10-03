import React, { useState } from 'react';
import { useSearchStore } from '../stores/searchStore';
import './SearchForm.css';

const SearchForm = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    year: '',
    author: '',
    journal: '',
  });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { searchPapers, isLoading } = useSearchStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    await searchPapers({
      query: query.trim(),
      filters,
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      year: '',
      author: '',
      journal: '',
    });
  };

  return (
    <div className="search-form">
      <form onSubmit={handleSubmit} className="search-form-container">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scientific papers..."
            className="search-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="search-button"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <span className="search-spinner"></span>
            ) : (
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            )}
          </button>
        </div>

        <button
          type="button"
          className="search-advanced-toggle"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        >
          Advanced Filters
          <svg 
            className={`search-advanced-icon ${isAdvancedOpen ? 'search-advanced-icon-open' : ''}`}
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </button>

        {isAdvancedOpen && (
          <div className="search-advanced">
            <div className="search-filters">
              <div className="search-filter-group">
                <label htmlFor="type" className="search-filter-label">Type</label>
                <select
                  id="type"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="search-filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="article">Article</option>
                  <option value="conference">Conference</option>
                  <option value="book">Book</option>
                  <option value="thesis">Thesis</option>
                </select>
              </div>

              <div className="search-filter-group">
                <label htmlFor="year" className="search-filter-label">Year</label>
                <input
                  id="year"
                  type="number"
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  placeholder="e.g., 2023"
                  className="search-filter-input"
                  min="1900"
                  max="2024"
                />
              </div>

              <div className="search-filter-group">
                <label htmlFor="author" className="search-filter-label">Author</label>
                <input
                  id="author"
                  type="text"
                  value={filters.author}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                  placeholder="Author name"
                  className="search-filter-input"
                />
              </div>

              <div className="search-filter-group">
                <label htmlFor="journal" className="search-filter-label">Journal</label>
                <input
                  id="journal"
                  type="text"
                  value={filters.journal}
                  onChange={(e) => handleFilterChange('journal', e.target.value)}
                  placeholder="Journal name"
                  className="search-filter-input"
                />
              </div>
            </div>

            <div className="search-filter-actions">
              <button
                type="button"
                className="search-filter-clear"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchForm;
