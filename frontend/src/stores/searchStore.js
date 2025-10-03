import { create } from 'zustand';

const useSearchStore = create((set, get) => ({
  // State
  results: [],
  query: '',
  filters: {
    type: 'all',
    year: '',
    author: '',
    journal: '',
  },
  isLoading: false,
  error: null,
  totalResults: 0,
  currentPage: 1,
  resultsPerPage: 10,
  sortBy: 'relevance',
  sortOrder: 'desc',

  // Actions
  searchPapers: async (searchParams) => {
    set({ isLoading: true, error: null });
    
    try {
      const { query, filters, page = 1, sortBy = 'relevance', sortOrder = 'desc' } = searchParams;
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters,
          page,
          sortBy,
          sortOrder,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Search failed');
      }

      const data = await response.json();
      
      set({
        results: data.results || [],
        query,
        filters,
        totalResults: data.total || 0,
        currentPage: page,
        sortBy,
        sortOrder,
        isLoading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        results: [],
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  setQuery: (query) => {
    set({ query });
  },

  setFilters: (filters) => {
    set({ filters });
  },

  setSorting: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder });
  },

  setPage: (page) => {
    set({ currentPage: page });
  },

  clearResults: () => {
    set({
      results: [],
      query: '',
      filters: {
        type: 'all',
        year: '',
        author: '',
        journal: '',
      },
      totalResults: 0,
      currentPage: 1,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  // Getters
  getTotalPages: () => {
    const { totalResults, resultsPerPage } = get();
    return Math.ceil(totalResults / resultsPerPage);
  },

  hasResults: () => {
    const { results } = get();
    return results.length > 0;
  },

  getFilteredResults: () => {
    const { results, filters } = get();
    
    return results.filter(result => {
      if (filters.type !== 'all' && result.type !== filters.type) {
        return false;
      }
      
      if (filters.year && result.year !== parseInt(filters.year)) {
        return false;
      }
      
      if (filters.author && !result.authors?.some(author => 
        author.toLowerCase().includes(filters.author.toLowerCase())
      )) {
        return false;
      }
      
      if (filters.journal && !result.journal?.toLowerCase().includes(filters.journal.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  },
}));

export { useSearchStore };
