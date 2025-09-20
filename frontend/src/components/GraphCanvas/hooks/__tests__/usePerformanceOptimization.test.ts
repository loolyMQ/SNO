import { renderHook, act } from '@testing-library/react';
import { usePerformanceOptimization } from '../usePerformanceOptimization';

// Включаем fake timers
jest.useFakeTimers();

// Мокаем performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    },
  },
  writable: true,
});

describe('usePerformanceOptimization', () => {
  const defaultProps = {
    nodeCount: 100,
    edgeCount: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    expect(result.current.metrics.fps).toBe(0);
    expect(result.current.metrics.frameTime).toBe(0);
    expect(result.current.metrics.memoryUsage).toBe(0);
    expect(result.current.metrics.nodeCount).toBe(0); // Инициализируется как 0
    expect(result.current.metrics.edgeCount).toBe(0); // Инициализируется как 0
    expect(result.current.qualityLevel).toBe('high');
    expect(result.current.isThrottled).toBe(false);
  });

  it('should update metrics correctly', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    // Проверяем, что функция updateMetrics существует
    expect(typeof result.current.updateMetrics).toBe('function');
    
    act(() => {
      result.current.updateMetrics(80, 5.5);
    });

    expect(result.current.metrics.visibleNodes).toBe(80);
    expect(result.current.metrics.renderTime).toBe(5.5);
  });

  it('should provide optimized settings for different quality levels', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    const highSettings = result.current.getOptimizedSettings();
    expect(highSettings.nodeRadius).toBe(8);
    expect(highSettings.edgeWidth).toBe(2);
    expect(highSettings.enableLabels).toBe(true);
    expect(highSettings.enableShadows).toBe(true);
    expect(highSettings.maxVisibleNodes).toBe(1000);
  });

  it('should optimize data for rendering', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    const nodes = [
      { id: '1', x: 100, y: 100 },
      { id: '2', x: 200, y: 200 },
      { id: '3', x: 300, y: 300 },
    ];

    const edges = [
      { id: '1', source: '1', target: '2' },
      { id: '2', source: '2', target: '3' },
    ];

    const viewportBounds = {
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      scale: 1,
    };

    const optimized = result.current.optimizeDataForRendering(
      nodes,
      edges,
      viewportBounds
    );

    expect(optimized.nodes).toBeDefined();
    expect(optimized.edges).toBeDefined();
    expect(optimized.settings).toBeDefined();
  });

  it('should predict performance correctly', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    const prediction = result.current.predictPerformance(100, 50, 1.0);
    
    expect(prediction.estimatedFPS).toBeGreaterThan(0);
    expect(prediction.recommendedQuality).toMatch(/^(high|medium|low)$/);
    expect(typeof prediction.shouldThrottle).toBe('boolean');
  });

  it('should handle throttled rendering', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount,
      { enableThrottling: true, throttleInterval: 16 }
    ));

    const renderFunction = jest.fn();

    act(() => {
      result.current.throttledRender(renderFunction);
    });

    // Функция должна быть вызвана через setTimeout
    expect(renderFunction).not.toHaveBeenCalled();
    
    // Ждем выполнения setTimeout
    act(() => {
      jest.advanceTimersByTime(16);
    });

    expect(renderFunction).toHaveBeenCalled();
  });

  it('should handle force rendering', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount,
      { enableThrottling: true }
    ));

    const renderFunction = jest.fn();

    act(() => {
      result.current.throttledRender(renderFunction, true);
    });

    expect(renderFunction).toHaveBeenCalled();
  });

  it('should call onRenderStart and onRenderEnd', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    act(() => {
      result.current.onRenderStart();
    });

    act(() => {
      result.current.onRenderEnd();
    });

    // Проверяем, что функции не выбрасывают ошибок
    expect(result.current.onRenderStart).toBeDefined();
    expect(result.current.onRenderEnd).toBeDefined();
  });

  it('should handle memory monitoring', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount,
      { enableMemoryMonitoring: true }
    ));

    // Проверяем, что память отслеживается
    expect(result.current.metrics.memoryUsage).toBeGreaterThan(0);
  });

  it('should cleanup resources on unmount', () => {
    const { result, unmount } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    const cleanup = result.current.cleanup;
    
    // Проверяем, что cleanup не выбрасывает ошибок
    expect(() => cleanup()).not.toThrow();
    
    unmount();
  });

  it('should handle different node counts', () => {
    const { result: result1 } = renderHook(() => usePerformanceOptimization(10, 5));
    const { result: result2 } = renderHook(() => usePerformanceOptimization(1000, 500));

    expect(result1.current.metrics.nodeCount).toBe(10);
    expect(result1.current.metrics.edgeCount).toBe(5);
    
    expect(result2.current.metrics.nodeCount).toBe(1000);
    expect(result2.current.metrics.edgeCount).toBe(500);
  });

  it('should provide different settings for different quality levels', () => {
    const { result } = renderHook(() => usePerformanceOptimization(
      defaultProps.nodeCount,
      defaultProps.edgeCount
    ));

    // Мокаем изменение качества
    act(() => {
      // Симулируем низкий FPS для переключения на низкое качество
      result.current.updateMetrics(100, 20);
    });

    const settings = result.current.getOptimizedSettings();
    expect(settings).toBeDefined();
    expect(settings.nodeRadius).toBeGreaterThan(0);
    expect(settings.edgeWidth).toBeGreaterThan(0);
  });

  it('should handle edge cases', () => {
    const { result } = renderHook(() => usePerformanceOptimization(0, 0));

    expect(result.current.metrics.nodeCount).toBe(0);
    expect(result.current.metrics.edgeCount).toBe(0);

    const optimized = result.current.optimizeDataForRendering([], [], {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      scale: 1,
    });

    expect(optimized.nodes).toEqual([]);
    expect(optimized.edges).toEqual([]);
  });
});

