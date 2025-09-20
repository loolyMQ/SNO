import type { GraphData, GraphNode, GraphEdge } from '../types';
import type { ExportOptions } from '../components/ExportPanel';

export interface ExportMetadata {
  exportDate: string;
  version: string;
  nodeCount: number;
  edgeCount: number;
  format: string;
}

export class ExportService {
  /**
   * Экспорт данных в JSON формат
   */
  static async exportToJSON(
    graphData: GraphData,
    options: ExportOptions
  ): Promise<void> {
    const exportData: any = {
      nodes: graphData.nodes,
      edges: graphData.edges,
    };

    if (options.includeMetadata) {
      exportData.metadata = this.generateMetadata(graphData, 'json');
    }

    if (options.includePositions) {
      exportData.positions = this.extractPositions(graphData.nodes);
    }

    if (options.includeConnections) {
      exportData.connections = this.extractConnections(graphData.edges);
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    this.downloadBlob(blob, 'science-map-export.json');
  }

  /**
   * Экспорт данных в CSV формат
   */
  static async exportToCSV(
    graphData: GraphData,
    options: ExportOptions
  ): Promise<void> {
    const csvData: string[] = [];

    // Заголовки
    csvData.push('Type,Id,Label,Connections,Position');

    // Узлы
    graphData.nodes.forEach((node) => {
      const connections = graphData.edges.filter(
        edge => edge.source === node.id || edge.target === node.id
      ).length;
      
      const position = options.includePositions && node.x && node.y
        ? `${node.x},${node.y}`
        : '';

      csvData.push(
        `Node,${node.id},"${node.label}",${connections},"${position}"`
      );
    });

    // Связи
    graphData.edges.forEach((edge) => {
      csvData.push(
        `Edge,${edge.id},"${edge.source} -> ${edge.target}",1,""`
      );
    });

    const blob = new Blob([csvData.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });

    this.downloadBlob(blob, 'science-map-export.csv');
  }

  /**
   * Экспорт графа как изображение PNG
   */
  static async exportToPNG(
    svgElement: SVGElement,
    options: ExportOptions
  ): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Не удалось создать контекст canvas');
    }

    // Устанавливаем размеры
    canvas.width = options.imageSize.width;
    canvas.height = options.imageSize.height;

    // Создаем SVG с нужными размерами
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute('width', options.imageSize.width.toString());
    svgClone.setAttribute('height', options.imageSize.height.toString());

    // Конвертируем SVG в изображение
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем изображение
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Экспортируем как PNG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              this.downloadBlob(blob, 'science-map-export.png');
              resolve();
            } else {
              reject(new Error('Не удалось создать PNG изображение'));
            }
          },
          'image/png',
          options.imageQuality
        );
      };
      
      img.onerror = () => reject(new Error('Не удалось загрузить SVG изображение'));
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  }

  /**
   * Экспорт графа как SVG
   */
  static async exportToSVG(
    svgElement: SVGElement,
    options: ExportOptions
  ): Promise<void> {
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Устанавливаем размеры
    svgClone.setAttribute('width', options.imageSize.width.toString());
    svgClone.setAttribute('height', options.imageSize.height.toString());
    
    // Добавляем метаданные если нужно
    if (options.includeMetadata) {
      const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
      metadata.textContent = JSON.stringify(this.generateMetadata({ nodes: [], edges: [] }, 'svg'));
      svgClone.appendChild(metadata);
    }

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });

    this.downloadBlob(blob, 'science-map-export.svg');
  }

  /**
   * Экспорт графа как PDF
   */
  static async exportToPDF(
    svgElement: SVGElement,
    options: ExportOptions
  ): Promise<void> {
    // Сначала экспортируем как PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Не удалось создать контекст canvas');
    }

    canvas.width = options.imageSize.width;
    canvas.height = options.imageSize.height;

    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute('width', options.imageSize.width.toString());
    svgClone.setAttribute('height', options.imageSize.height.toString());

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Создаем PDF с помощью jsPDF (нужно будет добавить зависимость)
        // Пока что экспортируем как PNG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              this.downloadBlob(blob, 'science-map-export.png');
              resolve();
            } else {
              reject(new Error('Не удалось создать изображение для PDF'));
            }
          },
          'image/png',
          options.imageQuality
        );
      };
      
      img.onerror = () => reject(new Error('Не удалось загрузить SVG изображение'));
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  }

  /**
   * Генерация метаданных для экспорта
   */
  private static generateMetadata(graphData: GraphData, format: string): ExportMetadata {
    return {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      nodeCount: graphData.nodes.length,
      edgeCount: graphData.edges.length,
      format,
    };
  }

  /**
   * Извлечение позиций узлов
   */
  private static extractPositions(nodes: GraphNode[]): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        positions[node.id] = { x: node.x, y: node.y };
      }
    });
    
    return positions;
  }

  /**
   * Извлечение информации о связях
   */
  private static extractConnections(edges: GraphEdge[]): Record<string, string[]> {
    const connections: Record<string, string[]> = {};
    
    edges.forEach(edge => {
      if (!connections[edge.source]) {
        connections[edge.source] = [];
      }
      if (!connections[edge.target]) {
        connections[edge.target] = [];
      }
      
      connections[edge.source].push(edge.target);
      connections[edge.target].push(edge.source);
    });
    
    return connections;
  }

  /**
   * Скачивание blob как файл
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Основной метод экспорта
   */
  static async export(
    graphData: GraphData,
    svgElement: SVGElement | null,
    options: ExportOptions
  ): Promise<void> {
    switch (options.format) {
      case 'json':
        return this.exportToJSON(graphData, options);
      case 'csv':
        return this.exportToCSV(graphData, options);
      case 'png':
        if (!svgElement) {
          throw new Error('SVG элемент не найден для экспорта изображения');
        }
        return this.exportToPNG(svgElement, options);
      case 'svg':
        if (!svgElement) {
          throw new Error('SVG элемент не найден для экспорта SVG');
        }
        return this.exportToSVG(svgElement, options);
      case 'pdf':
        if (!svgElement) {
          throw new Error('SVG элемент не найден для экспорта PDF');
        }
        return this.exportToPDF(svgElement, options);
      default:
        throw new Error(`Неподдерживаемый формат экспорта: ${options.format}`);
    }
  }
}
