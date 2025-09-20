import type { GraphData, GraphNode, GraphEdge } from '../types';
import type { SearchFilter } from '../components/AdvancedSearch';

export interface SearchResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalMatches: number;
  searchTime: number;
  suggestions: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'paper' | 'author' | 'institution' | 'topic';
  relevance: number;
}

export class AdvancedSearchService {
  private static searchHistory: string[] = [];
  private static maxHistorySize = 50;

  /**
   * Выполнение расширенного поиска
   */
  static async search(
    query: string,
    filters: SearchFilter,
    graphData: GraphData
  ): Promise<SearchResult> {
    const startTime = performance.now();
    
    // Добавляем запрос в историю
    this.addToHistory(query);
    
    // Фильтруем данные по типу
    let filteredNodes = this.filterNodesByType(graphData.nodes, filters.type);
    let filteredEdges = this.filterEdgesByType(graphData.edges, filters.type);
    
    // Применяем фильтры по дате
    if (filters.dateRange.start || filters.dateRange.end) {
      filteredNodes = this.filterNodesByDate(filteredNodes, filters.dateRange);
    }
    
    // Применяем фильтры по ключевым словам
    if (filters.keywords.length > 0) {
      filteredNodes = this.filterNodesByKeywords(filteredNodes, filters.keywords);
    }
    
    // Применяем фильтры по количеству связей
    filteredNodes = this.filterNodesByConnections(
      filteredNodes,
      filteredEdges,
      filters.minConnections,
      filters.maxConnections
    );
    
    // Выполняем текстовый поиск
    const searchResults = this.performTextSearch(query, filteredNodes, filteredEdges);
    
    // Получаем связанные узлы и связи
    const resultEdges = this.getRelatedEdges(searchResults.nodes, filteredEdges);
    
    const endTime = performance.now();
    
    return {
      nodes: searchResults.nodes,
      edges: resultEdges,
      totalMatches: searchResults.totalMatches,
      searchTime: endTime - startTime,
      suggestions: this.generateSuggestions(query, graphData),
    };
  }

  /**
   * Получение истории поиска
   */
  static getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Очистка истории поиска
   */
  static clearSearchHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Получение предложений для автодополнения
   */
  static getSuggestions(query: string, graphData: GraphData): SearchSuggestion[] {
    if (!query.trim()) return [];
    
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();
    
    // Поиск по названиям работ
    graphData.nodes.forEach(node => {
      if (node.label.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: node.label,
          type: 'paper',
          relevance: this.calculateRelevance(queryLower, node.label.toLowerCase()),
        });
      }
    });
    
    // Поиск по авторам (если есть поле author)
    graphData.nodes.forEach(node => {
      if (node.author && node.author.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: node.author,
          type: 'author',
          relevance: this.calculateRelevance(queryLower, node.author.toLowerCase()),
        });
      }
    });
    
    // Поиск по институтам (если есть поле institution)
    graphData.nodes.forEach(node => {
      if (node.institution && node.institution.toLowerCase().includes(queryLower)) {
        suggestions.push({
          text: node.institution,
          type: 'institution',
          relevance: this.calculateRelevance(queryLower, node.institution.toLowerCase()),
        });
      }
    });
    
    // Сортируем по релевантности и возвращаем топ-10
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  /**
   * Фильтрация узлов по типу
   */
  private static filterNodesByType(nodes: GraphNode[], type: SearchFilter['type']): GraphNode[] {
    if (type === 'all') return nodes;
    
    return nodes.filter(node => {
      switch (type) {
        case 'paper':
          return node.type === 'paper' || !node.type;
        case 'author':
          return node.type === 'author';
        case 'institution':
          return node.type === 'institution';
        case 'topic':
          return node.type === 'topic';
        default:
          return true;
      }
    });
  }

  /**
   * Фильтрация связей по типу
   */
  private static filterEdgesByType(edges: GraphEdge[], type: SearchFilter['type']): GraphEdge[] {
    if (type === 'all') return edges;
    
    return edges.filter(edge => {
      switch (type) {
        case 'paper':
          return edge.type === 'cites' || edge.type === 'references';
        case 'author':
          return edge.type === 'authored' || edge.type === 'coauthored';
        case 'institution':
          return edge.type === 'affiliated' || edge.type === 'collaborates';
        case 'topic':
          return edge.type === 'related' || edge.type === 'similar';
        default:
          return true;
      }
    });
  }

  /**
   * Фильтрация узлов по дате
   */
  private static filterNodesByDate(
    nodes: GraphNode[],
    dateRange: SearchFilter['dateRange']
  ): GraphNode[] {
    return nodes.filter(node => {
      if (!node.date) return true;
      
      const nodeDate = new Date(node.date);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      
      if (startDate && nodeDate < startDate) return false;
      if (endDate && nodeDate > endDate) return false;
      
      return true;
    });
  }

  /**
   * Фильтрация узлов по ключевым словам
   */
  private static filterNodesByKeywords(
    nodes: GraphNode[],
    keywords: string[]
  ): GraphNode[] {
    return nodes.filter(node => {
      const searchText = [
        node.label,
        node.description || '',
        node.author || '',
        node.institution || '',
        node.tags?.join(' ') || '',
      ].join(' ').toLowerCase();
      
      return keywords.some(keyword =>
        searchText.includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Фильтрация узлов по количеству связей
   */
  private static filterNodesByConnections(
    nodes: GraphNode[],
    edges: GraphEdge[],
    minConnections: number,
    maxConnections: number
  ): GraphNode[] {
    return nodes.filter(node => {
      const connectionCount = edges.filter(edge =>
        edge.source === node.id || edge.target === node.id
      ).length;
      
      return connectionCount >= minConnections && connectionCount <= maxConnections;
    });
  }

  /**
   * Выполнение текстового поиска
   */
  private static performTextSearch(
    query: string,
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): { nodes: GraphNode[]; totalMatches: number } {
    if (!query.trim()) {
      return { nodes, totalMatches: nodes.length };
    }
    
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/);
    
    const matchingNodes = nodes.filter(node => {
      const searchText = [
        node.label,
        node.description || '',
        node.author || '',
        node.institution || '',
        node.tags?.join(' ') || '',
      ].join(' ').toLowerCase();
      
      // Проверяем, содержатся ли все термины поиска
      return searchTerms.every(term => searchText.includes(term));
    });
    
    // Сортируем по релевантности
    const scoredNodes = matchingNodes.map(node => ({
      node,
      score: this.calculateSearchScore(queryLower, node),
    }));
    
    scoredNodes.sort((a, b) => b.score - a.score);
    
    return {
      nodes: scoredNodes.map(item => item.node),
      totalMatches: matchingNodes.length,
    };
  }

  /**
   * Получение связанных связей
   */
  private static getRelatedEdges(nodes: GraphNode[], edges: GraphEdge[]): GraphEdge[] {
    const nodeIds = new Set(nodes.map(node => node.id));
    
    return edges.filter(edge =>
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }

  /**
   * Расчет релевантности для поиска
   */
  private static calculateSearchScore(query: string, node: GraphNode): number {
    const searchText = [
      node.label,
      node.description || '',
      node.author || '',
      node.institution || '',
      node.tags?.join(' ') || '',
    ].join(' ').toLowerCase();
    
    let score = 0;
    
    // Точное совпадение в названии
    if (node.label.toLowerCase().includes(query)) {
      score += 10;
    }
    
    // Совпадение в описании
    if (node.description?.toLowerCase().includes(query)) {
      score += 5;
    }
    
    // Совпадение в авторе
    if (node.author?.toLowerCase().includes(query)) {
      score += 3;
    }
    
    // Совпадение в институте
    if (node.institution?.toLowerCase().includes(query)) {
      score += 2;
    }
    
    // Совпадение в тегах
    if (node.tags?.some(tag => tag.toLowerCase().includes(query))) {
      score += 1;
    }
    
    return score;
  }

  /**
   * Расчет релевантности для предложений
   */
  private static calculateRelevance(query: string, text: string): number {
    if (text.startsWith(query)) return 1.0;
    if (text.includes(query)) return 0.8;
    
    // Проверяем частичные совпадения
    const queryWords = query.split(/\s+/);
    const textWords = text.split(/\s+/);
    
    const matchingWords = queryWords.filter(qWord =>
      textWords.some(tWord => tWord.includes(qWord))
    );
    
    return matchingWords.length / queryWords.length;
  }

  /**
   * Генерация предложений
   */
  private static generateSuggestions(query: string, graphData: GraphData): string[] {
    const suggestions = this.getSuggestions(query, graphData);
    return suggestions.map(s => s.text);
  }

  /**
   * Добавление запроса в историю
   */
  private static addToHistory(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Удаляем дубликаты
    this.searchHistory = this.searchHistory.filter(item => item !== trimmedQuery);
    
    // Добавляем в начало
    this.searchHistory.unshift(trimmedQuery);
    
    // Ограничиваем размер истории
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }
}
