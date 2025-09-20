import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchBar } from '../SearchBar';

// Mock the API service
jest.mock('../../services/ApiService', () => ({
  searchGraph: jest.fn().mockResolvedValue({
    nodes: [
      { id: '1', label: 'Test Node', type: 'topic', x: 0, y: 0 }
    ],
    edges: []
  }),
  getSearchHistory: jest.fn().mockResolvedValue([
    { query: 'test query', timestamp: new Date().toISOString() }
  ])
}));

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input and button', () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        isLoading={false}
      />
    );

    expect(screen.getByPlaceholderText(/поиск/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /найти/i })).toBeInTheDocument();
  });

  it('handles search input change', () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/поиск/i);
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(input).toHaveValue('test query');
  });

  it('calls onSearch when search button is clicked', async () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/поиск/i);
    const button = screen.getByRole('button', { name: /найти/i });

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query');
    });
  });


  it('shows loading state', () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        isLoading={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables button when query is empty', () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        isLoading={false}
      />
    );

    const button = screen.getByRole('button', { name: /найти/i });
    expect(button).toBeDisabled();
  });

  it('does not search with empty query', () => {
    render(
      <SearchBar 
        onSearch={mockOnSearch} 
        isLoading={false}
      />
    );

    const button = screen.getByRole('button', { name: /найти/i });
    fireEvent.click(button);

    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});
