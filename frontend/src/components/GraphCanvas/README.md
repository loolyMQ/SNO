# Оптимизированные компоненты для рендеринга графов

Этот набор компонентов предоставляет высокопроизводительные решения для рендеринга больших графов с использованием D3.js и современных техник оптимизации.

## Компоненты

### 1. UltraOptimizedGraphCanvas
Основной компонент с максимальной оптимизацией:
- Виртуализация узлов и связей
- Кластеризация для больших графов
- WebGL рендеринг (опционально)
- Адаптивное качество рендеринга
- Мониторинг производительности

### 2. OptimizedGraphCanvas
Упрощенная версия с базовыми оптимизациями:
- Виртуализация viewport
- Кластеризация узлов
- Canvas 2D рендеринг

### 3. PerformancePanel
Панель мониторинга производительности:
- Метрики FPS, памяти, времени рендеринга
- Управление качеством
- Рекомендации по оптимизации

## Хуки

### usePerformanceOptimization
Управление производительностью рендеринга:
- Адаптивное качество
- Троттлинг рендеринга
- Мониторинг памяти
- Предсказание производительности

### useGraphVirtualization
Виртуализация больших графов:
- Пространственное индексирование
- Кластеризация узлов
- Level of Detail (LOD)
- Управление видимостью

### useOptimizedD3Simulation
Оптимизированная D3.js симуляция:
- Адаптивные силы
- Barnes-Hut алгоритм
- Проверка сходимости
- Управление итерациями

## Использование

### Базовое использование
```tsx
import { UltraOptimizedGraphCanvas } from './components/GraphCanvas/UltraOptimizedGraphCanvas';

function MyGraphComponent() {
  const graphData = {
    nodes: [...],
    edges: [...]
  };

  const physicsConfig = {
    repulsion: 20000,
    attraction: 120,
    naturalLinkLength: 200,
  };

  return (
    <UltraOptimizedGraphCanvas
      graphData={graphData}
      physicsConfig={physicsConfig}
      onGraphUpdate={(data) => console.log('Graph updated', data)}
      isLoading={false}
      maxNodes={1000}
      enableVirtualization={true}
      enableWebGL={false}
      enableClustering={true}
      enablePerformanceMonitoring={true}
    />
  );
}
```

### Продвинутое использование
```tsx
import { UltraOptimizedGraphCanvas } from './components/GraphCanvas/UltraOptimizedGraphCanvas';

function AdvancedGraphComponent() {
  const [graphData, setGraphData] = useState(initialData);
  const [performanceConfig, setPerformanceConfig] = useState({
    targetFPS: 60,
    maxVisibleNodes: 500,
    enableAdaptiveQuality: true,
  });

  const handleNodeClick = (nodeId: string) => {
    console.log('Node clicked:', nodeId);
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <UltraOptimizedGraphCanvas
        graphData={graphData}
        physicsConfig={physicsConfig}
        onGraphUpdate={setGraphData}
        onNodeClick={handleNodeClick}
        isLoading={false}
        maxNodes={performanceConfig.maxVisibleNodes}
        enableVirtualization={true}
        enableWebGL={true}
        enableClustering={true}
        enablePerformanceMonitoring={true}
      />
    </div>
  );
}
```

## Оптимизации

### 1. Виртуализация
- Рендеринг только видимых узлов
- Пространственное индексирование
- Динамическое обновление viewport

### 2. Кластеризация
- Автоматическая группировка узлов
- Представительные узлы для кластеров
- Интерактивное разворачивание

### 3. Level of Detail (LOD)
- Адаптивное качество рендеринга
- Упрощение на больших масштабах
- Оптимизация подписей

### 4. Производительность
- Адаптивный FPS
- Троттлинг рендеринга
- Мониторинг памяти
- Предсказание производительности

### 5. D3.js Оптимизации
- Barnes-Hut алгоритм для отталкивания
- Адаптивные силы
- Проверка сходимости
- Ограничение итераций

## Конфигурация

### PerformanceConfig
```typescript
interface PerformanceConfig {
  targetFPS: number;           // Целевой FPS
  maxFPS: number;             // Максимальный FPS
  minFPS: number;             // Минимальный FPS
  adaptiveQuality: boolean;   // Адаптивное качество
  enableThrottling: boolean;  // Троттлинг
  throttleInterval: number;   // Интервал троттлинга
  enableMemoryMonitoring: boolean; // Мониторинг памяти
  maxMemoryUsage: number;     // Максимальное использование памяти
}
```

### VirtualizationConfig
```typescript
interface VirtualizationConfig {
  maxVisibleNodes: number;    // Максимум видимых узлов
  maxVisibleEdges: number;    // Максимум видимых связей
  viewportMargin: number;     // Запас viewport
  enableClustering: boolean;  // Кластеризация
  clusterThreshold: number;   // Порог кластеризации
  enableLevelOfDetail: boolean; // LOD
  enableSpatialIndexing: boolean; // Пространственное индексирование
  spatialGridSize: number;    // Размер сетки
}
```

### OptimizedPhysicsConfig
```typescript
interface OptimizedPhysicsConfig {
  repulsion: number;          // Сила отталкивания
  attraction: number;         // Сила притяжения
  gravity: number;            // Гравитация
  damping: number;            // Демпфирование
  naturalLinkLength: number;  // Естественная длина связи
  enableAdaptiveForces: boolean; // Адаптивные силы
  enableBarnesHut: boolean;   // Barnes-Hut алгоритм
  theta: number;              // Параметр Barnes-Hut
  maxIterations: number;      // Максимум итераций
  targetFPS: number;          // Целевой FPS
}
```

## Производительность

### Рекомендации по использованию

1. **Малые графы (< 100 узлов)**
   - Используйте стандартный GraphCanvas
   - Отключите виртуализацию
   - Включите высокое качество

2. **Средние графы (100-1000 узлов)**
   - Используйте OptimizedGraphCanvas
   - Включите виртуализацию
   - Включите кластеризацию при необходимости

3. **Большие графы (> 1000 узлов)**
   - Используйте UltraOptimizedGraphCanvas
   - Включите все оптимизации
   - Мониторьте производительность

### Метрики производительности

- **FPS**: Целевой 60 FPS, минимум 30 FPS
- **Память**: Рекомендуется < 100MB
- **Время рендеринга**: < 16ms для 60 FPS
- **Видимые узлы**: Оптимально 200-500 узлов

## Отладка

### Включение отладки
```tsx
<UltraOptimizedGraphCanvas
  // ... другие пропсы
  enablePerformanceMonitoring={true}
  debug={true}
/>
```

### Логи производительности
```typescript
// В консоли браузера
console.log('Performance metrics:', metrics);
console.log('Virtualization stats:', virtualizationStats);
console.log('Simulation stats:', simulationStats);
```

## Совместимость

- **Браузеры**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **WebGL**: Опционально, автоматическое переключение на Canvas 2D
- **React**: 18.0+
- **D3.js**: 7.0+

## Лицензия

MIT License

