import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedSearch } from '../AdvancedSearch';
import type { SearchFilter } from '../AdvancedSearch';

describe('AdvancedSearch', () => {
  const mockOnSearch = jest.fn();
  const mockOnClear = jest.fn();

  const defaultProps = {
    onSearch: mockOnSearch,
    onClear: mockOnClear,
    isLoading: false,
    searchHistory: ['машинное обучение', 'нейронные сети', 'deep learning'],
    suggestions: ['искусственный интеллект', 'компьютерное зрение', 'обработка естественного языка'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<AdvancedSearch {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/поиск по научным работам/i)).toBeInTheDocument();
    expect(screen.getByText(/найти/i)).toBeInTheDocument();
    expect(screen.getByText(/очистить/i)).toBeInTheDocument();
  });

  it('should handle search input', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    await user.type(searchInput, 'машинное обучение');
    
    expect(searchInput).toHaveValue('машинное обучение');
  });

  it('should trigger search on button click', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    const searchButton = screen.getByText(/найти/i);
    
    await user.type(searchInput, 'тест');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('тест', expect.any(Object));
  });

  it('should trigger search on Enter key', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    await user.type(searchInput, 'тест{enter}');
    
    expect(mockOnSearch).toHaveBeenCalledWith('тест', expect.any(Object));
  });

  it('should trigger clear on clear button click', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const clearButton = screen.getByText(/очистить/i);
    await user.click(clearButton);
    
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('should show advanced filters when toggled', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const advancedButton = screen.getByText(/расширенный поиск/i);
    await user.click(advancedButton);
    
    expect(screen.getByText(/тип контента/i)).toBeInTheDocument();
    expect(screen.getByText(/дата от/i)).toBeInTheDocument();
    expect(screen.getByText(/ключевые слова/i)).toBeInTheDocument();
  });

  it('should add keywords', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    // Открываем расширенные фильтры
    const advancedButton = screen.getByText(/расширенный поиск/i);
    await user.click(advancedButton);
    
    // Добавляем ключевое слово
    const keywordInput = screen.getByPlaceholderText(/добавить ключевое слово/i);
    const addButton = screen.getByText(/добавить/i);
    
    await user.type(keywordInput, 'искусственный интеллект');
    await user.click(addButton);
    
    expect(screen.getByText('искусственный интеллект')).toBeInTheDocument();
  });

  it('should remove keywords', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    // Открываем расширенные фильтры
    const advancedButton = screen.getByText(/расширенный поиск/i);
    await user.click(advancedButton);
    
    // Добавляем ключевое слово
    const keywordInput = screen.getByPlaceholderText(/добавить ключевое слово/i);
    const addButton = screen.getByText(/добавить/i);
    
    await user.type(keywordInput, 'тест');
    await user.click(addButton);
    
    // Удаляем ключевое слово
    const removeButton = screen.getByText('×');
    await user.click(removeButton);
    
    expect(screen.queryByText('тест')).not.toBeInTheDocument();
  });

  it('should show search history when input is focused', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    await user.click(searchInput);
    
    expect(screen.getByText(/история поиска/i)).toBeInTheDocument();
    expect(screen.getByText('машинное обучение')).toBeInTheDocument();
  });

  it('should show suggestions when typing', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    await user.type(searchInput, 'искусственный');
    
    expect(screen.getByText(/предложения/i)).toBeInTheDocument();
    expect(screen.getByText('искусственный интеллект')).toBeInTheDocument();
  });

  it('should disable search button when input is empty', () => {
    render(<AdvancedSearch {...defaultProps} />);
    
    const searchButton = screen.getByText(/найти/i);
    expect(searchButton).toBeDisabled();
  });

  it('should disable search button when loading', () => {
    render(<AdvancedSearch {...defaultProps} isLoading={true} />);
    
    const searchButton = screen.getByText(/поиск\.\.\./i);
    expect(searchButton).toBeDisabled();
  });

  it('should update filters when content type changes', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    // Открываем расширенные фильтры
    const advancedButton = screen.getByText(/расширенный поиск/i);
    await user.click(advancedButton);
    
    // Меняем тип контента
    const typeSelect = screen.getByDisplayValue(/все типы/i);
    await user.selectOptions(typeSelect, 'paper');
    
    // Выполняем поиск
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    const searchButton = screen.getByText(/найти/i);
    
    await user.type(searchInput, 'тест');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('тест', expect.objectContaining({
      type: 'paper',
    }));
  });

  it('should update date range filters', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    // Открываем расширенные фильтры
    const advancedButton = screen.getByText(/расширенный поиск/i);
    await user.click(advancedButton);
    
    // Устанавливаем даты
    const startDateInput = screen.getByLabelText(/дата от/i);
    const endDateInput = screen.getByLabelText(/дата до/i);
    
    await user.type(startDateInput, '2020-01-01');
    await user.type(endDateInput, '2023-12-31');
    
    // Выполняем поиск
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    const searchButton = screen.getByText(/найти/i);
    
    await user.type(searchInput, 'тест');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('тест', expect.objectContaining({
      dateRange: {
        start: '2020-01-01',
        end: '2023-12-31',
      },
    }));
  });

  it('should update connection filters', async () => {
    const user = userEvent.setup();
    render(<AdvancedSearch {...defaultProps} />);
    
    // Открываем расширенные фильтры
    const advancedButton = screen.getByText(/расширенный поиск/i);
    await user.click(advancedButton);
    
    // Устанавливаем фильтры связей
    const minConnectionsInput = screen.getByLabelText(/мин\. связей/i);
    const maxConnectionsInput = screen.getByLabelText(/макс\. связей/i);
    
    await user.clear(minConnectionsInput);
    await user.type(minConnectionsInput, '5');
    await user.clear(maxConnectionsInput);
    await user.type(maxConnectionsInput, '50');
    
    // Выполняем поиск
    const searchInput = screen.getByPlaceholderText(/поиск по научным работам/i);
    const searchButton = screen.getByText(/найти/i);
    
    await user.type(searchInput, 'тест');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('тест', expect.objectContaining({
      minConnections: 5,
      maxConnections: 50,
    }));
  });
});
