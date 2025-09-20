import { useCallback, useRef, useEffect, useState } from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  nodeCount: number;
  edgeCount: number;
  visibleNodes: number;
  renderTime: number;
}

export interface PerformanceConfig {
  targetFPS: number;
  maxFPS: number;
  minFPS: number;
  adaptiveQuality: boolean;
  enableThrottling: boolean;
  throttleInterval: number;
  enableMemoryMonitoring: boolean;
  maxMemoryUsage: number;
}

const defaultConfig: PerformanceConfig = {
  targetFPS: 60,
  maxFPS: 120,
  minFPS: 30,
  adaptiveQuality: true,
  enableThrottling: true,
  throttleInterval: 16, // ~60 FPS
  enableMemoryMonitoring: true,
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
};

export function usePerformanceOptimization(
  nodeCount: number,
  edgeCount: number,
  config: Partial<PerformanceConfig> = {}
) {
  const performanceConfig = { ...defaultConfig, ...config };
  
  // Состояние метрик
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    nodeCount,
    edgeCount,
    visibleNodes: 0,
    renderTime: 0,
  });

  // Рефы для отслеживания производительности
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const renderStartTimeRef = useRef(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout>();
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Адаптивное качество рендеринга
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [isThrottled, setIsThrottled] = useState(false);

  // Обновление метрик FPS
  const updateFPS = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime - lastFpsTimeRef.current >= 1000) {
      const fps = frameCountRef.current;
      const frameTime = 1000 / fps;
      
      setMetrics(prev => ({
        ...prev,
        fps,
        frameTime,
      }));
      
      frameCountRef.current = 0;
      lastFpsTimeRef.current = currentTime;
      
      // Адаптивное качество
      if (performanceConfig.adaptiveQuality) {
        if (fps < performanceConfig.minFPS && qualityLevel !== 'low') {
          setQualityLevel('low');
        } else if (fps < performanceConfig.targetFPS && qualityLevel === 'high') {
          setQualityLevel('medium');
        } else if (fps >= performanceConfig.targetFPS && qualityLevel !== 'high') {
          setQualityLevel('high');
        }
      }
    }
  }, [performanceConfig, qualityLevel]);

  // Мониторинг памяти
  const checkMemoryUsage = useCallback(() => {
    if (!performanceConfig.enableMemoryMonitoring) return;

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage,
      }));

      // Предупреждение о высоком использовании памяти
      if (memoryUsage > performanceConfig.maxMemoryUsage) {
        console.warn(`Высокое использование памяти: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }, [performanceConfig]);

  // Обновление метрик
  const updateMetrics = useCallback((
    visibleNodes: number,
    renderTime: number
  ) => {
    setMetrics(prev => ({
      ...prev,
      nodeCount,
      edgeCount,
      visibleNodes,
      renderTime,
    }));
  }, [nodeCount, edgeCount]);

  // Троттлинг рендеринга
  const throttledRender = useCallback((
    renderFunction: () => void,
    forceRender = false
  ) => {
    if (!performanceConfig.enableThrottling || forceRender) {
      renderFunction();
      return;
    }

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      renderFunction();
      setIsThrottled(false);
    }, performanceConfig.throttleInterval);

    setIsThrottled(true);
  }, [performanceConfig]);

  // Оптимизация на основе качества
  const getOptimizedSettings = useCallback(() => {
    switch (qualityLevel) {
      case 'high':
        return {
          nodeRadius: 8,
          edgeWidth: 2,
          labelSize: 12,
          enableLabels: true,
          enableShadows: true,
          enableAnimations: true,
          maxVisibleNodes: 1000,
          maxVisibleEdges: 2000,
        };
      case 'medium':
        return {
          nodeRadius: 6,
          edgeWidth: 1.5,
          labelSize: 10,
          enableLabels: true,
          enableShadows: false,
          enableAnimations: true,
          maxVisibleNodes: 500,
          maxVisibleEdges: 1000,
        };
      case 'low':
        return {
          nodeRadius: 4,
          edgeWidth: 1,
          labelSize: 8,
          enableLabels: false,
          enableShadows: false,
          enableAnimations: false,
          maxVisibleNodes: 200,
          maxVisibleEdges: 400,
        };
    }
  }, [qualityLevel]);

  // Оптимизация данных для рендеринга
  const optimizeDataForRendering = useCallback((
    nodes: any[],
    edges: any[],
    viewportBounds: any
  ) => {
    const settings = getOptimizedSettings();
    
    // Фильтруем узлы по видимости и количеству
    const visibleNodes = nodes.filter((node, index) => {
      if (index >= settings.maxVisibleNodes) return false;
      
      if (node.x !== undefined && node.y !== undefined) {
        const screenX = (node.x - viewportBounds.x) * viewportBounds.scale;
        const screenY = (node.y - viewportBounds.y) * viewportBounds.scale;
        
        return (
          screenX >= -100 &&
          screenX <= viewportBounds.width + 100 &&
          screenY >= -100 &&
          screenY <= viewportBounds.height + 100
        );
      }
      
      return true;
    });

    // Фильтруем связи
    const visibleEdges = edges.filter((edge, index) => {
      if (index >= settings.maxVisibleEdges) return false;
      
      const sourceVisible = visibleNodes.some(n => n.id === edge.source);
      const targetVisible = visibleNodes.some(n => n.id === edge.target);
      
      return sourceVisible && targetVisible;
    });

    return {
      nodes: visibleNodes,
      edges: visibleEdges,
      settings,
    };
  }, [getOptimizedSettings]);

  // Предсказание производительности
  const predictPerformance = useCallback((
    nodeCount: number,
    edgeCount: number,
    viewportScale: number
  ) => {
    // Простая модель предсказания производительности
    const complexity = nodeCount * edgeCount * viewportScale;
    const estimatedFPS = Math.max(10, 120 - complexity / 10000);
    
    return {
      estimatedFPS,
      recommendedQuality: estimatedFPS < 30 ? 'low' : estimatedFPS < 60 ? 'medium' : 'high',
      shouldThrottle: estimatedFPS < 45,
    };
  }, []);

  // Очистка ресурсов
  const cleanup = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }
    if (memoryCheckIntervalRef.current) {
      clearInterval(memoryCheckIntervalRef.current);
    }
  }, []);

  // Инициализация мониторинга
  useEffect(() => {
    if (performanceConfig.enableMemoryMonitoring) {
      memoryCheckIntervalRef.current = setInterval(checkMemoryUsage, 5000);
    }

    return cleanup;
  }, [performanceConfig.enableMemoryMonitoring, checkMemoryUsage, cleanup]);

  // Обновление FPS при каждом рендере
  const onRenderStart = useCallback(() => {
    renderStartTimeRef.current = performance.now();
  }, []);

  const onRenderEnd = useCallback(() => {
    const currentTime = performance.now();
    const renderTime = currentTime - renderStartTimeRef.current;
    
    updateFPS(currentTime);
    updateMetrics(metrics.visibleNodes, renderTime);
  }, [updateFPS, updateMetrics, metrics.visibleNodes]);

  return {
    // Метрики
    metrics,
    qualityLevel,
    isThrottled,
    
    // Функции оптимизации
    throttledRender,
    optimizeDataForRendering,
    predictPerformance,
    getOptimizedSettings,
    
    // Управление рендерингом
    onRenderStart,
    onRenderEnd,
    
    // Утилиты
    cleanup,
  };
}

