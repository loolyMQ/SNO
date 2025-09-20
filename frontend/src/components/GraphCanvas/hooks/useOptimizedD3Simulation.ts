import { useCallback, useRef, useEffect, useState } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3';

export interface OptimizedPhysicsConfig {
  // Основные силы
  repulsion: number;
  attraction: number;
  gravity: number;
  damping: number;
  
  // Пружинная система
  naturalLinkLength: number;
  maxLinkStretch: number;
  minLinkLength: number;
  springStiffness: number;
  springDamping: number;
  
  // Производительность
  enableAdaptiveForces: boolean;
  enableSpatialOptimization: boolean;
  enableBarnesHut: boolean;
  theta: number;
  maxIterations: number;
  targetFPS: number;
  
  // Качество симуляции
  enableHighQuality: boolean;
  enableStableLayout: boolean;
  convergenceThreshold: number;
}

const defaultConfig: OptimizedPhysicsConfig = {
  repulsion: 20000,
  attraction: 120,
  gravity: 0.1,
  damping: 0.85,
  
  naturalLinkLength: 200,
  maxLinkStretch: 500,
  minLinkLength: 75,
  springStiffness: 0.8,
  springDamping: 0.9,
  
  enableAdaptiveForces: true,
  enableSpatialOptimization: true,
  enableBarnesHut: true,
  theta: 0.9,
  maxIterations: 300,
  targetFPS: 60,
  
  enableHighQuality: true,
  enableStableLayout: true,
  convergenceThreshold: 0.01,
};

export function useOptimizedD3Simulation(
  nodes: any[],
  edges: any[],
  config: Partial<OptimizedPhysicsConfig> = {}
) {
  const physicsConfig = { ...defaultConfig, ...config };
  
  // Рефы для симуляции
  const simulationRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);
  const iterationCountRef = useRef<number>(0);
  
  // Состояние симуляции
  const [isRunning, setIsRunning] = useState(false);
  const [isConverged, setIsConverged] = useState(false);
  const [alpha, setAlpha] = useState(1);
  const [fps, setFps] = useState(0);
  const [energy, setEnergy] = useState(0);
  
  // Метрики производительности
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const energyHistoryRef = useRef<number[]>([]);

  // Адаптивные силы на основе размера графа
  const getAdaptiveForces = useCallback(() => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const complexity = nodeCount * edgeCount;
    
    // Адаптируем силы в зависимости от сложности графа
    const scaleFactor = Math.min(1, 1000 / Math.max(1, complexity / 1000));
    
    return {
      repulsion: physicsConfig.repulsion * scaleFactor,
      attraction: physicsConfig.attraction * scaleFactor,
      naturalLinkLength: physicsConfig.naturalLinkLength * Math.sqrt(scaleFactor),
    };
  }, [nodes.length, edges.length, physicsConfig]);

  // Создание оптимизированной симуляции
  const createSimulation = useCallback(() => {
    if (nodes.length === 0) return null;

    const adaptiveForces = getAdaptiveForces();
    
    // Создаем симуляцию
    const simulation = forceSimulation(nodes)
      .force('link', forceLink(edges)
        .id((d: any) => d.id)
        .distance(adaptiveForces.naturalLinkLength)
        .strength((d: any) => {
          if (!physicsConfig.enableAdaptiveForces) {
            return physicsConfig.attraction;
          }
          
          // Адаптивная сила связи
          const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
          const targetId = typeof d.target === 'string' ? d.target : d.target.id;
          
          const sourceConnections = edges.filter(
            (edge) => edge.source === sourceId || edge.target === sourceId,
          ).length;
          const targetConnections = edges.filter(
            (edge) => edge.source === targetId || edge.target === targetId,
          ).length;
          
          const minConnections = Math.min(sourceConnections, targetConnections);
          const strengthMultiplier = minConnections === 1 ? 0.3 : 1.0;
          
          return adaptiveForces.attraction * strengthMultiplier;
        })
      )
      .force('charge', forceManyBody()
        .strength((d: any) => {
          if (!physicsConfig.enableAdaptiveForces) {
            return -physicsConfig.repulsion;
          }
          
          // Адаптивная сила отталкивания
          const connections = edges.filter(
            (edge) => edge.source === d.id || edge.target === d.id,
          ).length;
          
          const chargeMultiplier = connections === 1 ? 0.5 : 1.0;
          return -adaptiveForces.repulsion * chargeMultiplier;
        })
        .theta(physicsConfig.enableBarnesHut ? physicsConfig.theta : Infinity)
      )
      .force('center', forceCenter(400, 300))
      .force('collision', forceCollide().radius(20))
      .alpha(1)
      .alphaDecay(0.01)
      .velocityDecay(physicsConfig.damping);

    // Добавляем дополнительные силы для стабильности
    if (physicsConfig.enableStableLayout) {
      simulation
        .force('x', forceX().strength(0.1))
        .force('y', forceY().strength(0.1));
    }

    return simulation;
  }, [nodes, edges, physicsConfig, getAdaptiveForces]);

  // Вычисление энергии системы
  const calculateEnergy = useCallback(() => {
    let totalEnergy = 0;
    
    // Кинетическая энергия (скорости узлов)
    nodes.forEach(node => {
      if (node.vx !== undefined && node.vy !== undefined) {
        totalEnergy += node.vx * node.vx + node.vy * node.vy;
      }
    });
    
    // Потенциальная энергия (расстояния между узлами)
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      if (source && target && 
          source.x !== undefined && source.y !== undefined &&
          target.x !== undefined && target.y !== undefined) {
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const idealDistance = physicsConfig.naturalLinkLength;
        
        totalEnergy += Math.pow(distance - idealDistance, 2);
      }
    });
    
    return totalEnergy;
  }, [nodes, edges, physicsConfig.naturalLinkLength]);

  // Проверка сходимости
  const checkConvergence = useCallback(() => {
    const currentEnergy = calculateEnergy();
    energyHistoryRef.current.push(currentEnergy);
    
    // Ограничиваем историю
    if (energyHistoryRef.current.length > 10) {
      energyHistoryRef.current.shift();
    }
    
    setEnergy(currentEnergy);
    
    // Проверяем сходимость по энергии
    if (energyHistoryRef.current.length >= 5) {
      const recentEnergies = energyHistoryRef.current.slice(-5);
      const avgEnergy = recentEnergies.reduce((sum, e) => sum + e, 0) / recentEnergies.length;
      const energyVariance = recentEnergies.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / recentEnergies.length;
      
      if (energyVariance < physicsConfig.convergenceThreshold) {
        setIsConverged(true);
        return true;
      }
    }
    
    setIsConverged(false);
    return false;
  }, [calculateEnergy, physicsConfig.convergenceThreshold]);

  // Обновление FPS
  const updateFPS = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = currentTime;
    }
  }, []);

  // Оптимизированный цикл симуляции
  const runSimulation = useCallback((currentTime: number) => {
    if (!simulationRef.current) return;
    
    const deltaTime = currentTime - lastUpdateTimeRef.current;
    const targetFrameTime = 1000 / physicsConfig.targetFPS;
    
    // Ограничиваем частоту обновлений
    if (deltaTime < targetFrameTime) {
      animationFrameRef.current = requestAnimationFrame(runSimulation);
      return;
    }
    
    lastUpdateTimeRef.current = currentTime;
    iterationCountRef.current++;
    
    // Обновляем симуляцию
    simulationRef.current.tick();
    
    // Обновляем состояние
    setAlpha(simulationRef.current.alpha());
    
    // Проверяем сходимость
    if (iterationCountRef.current % 10 === 0) {
      checkConvergence();
    }
    
    // Обновляем FPS
    updateFPS(currentTime);
    
    // Останавливаем симуляцию если сходилась или достигли максимума итераций
    if (isConverged || iterationCountRef.current >= physicsConfig.maxIterations) {
      stopSimulation();
    } else {
      animationFrameRef.current = requestAnimationFrame(runSimulation);
    }
  }, [physicsConfig, checkConvergence, updateFPS, isConverged]);

  // Запуск симуляции
  const startSimulation = useCallback(() => {
    if (isRunning) return;
    
    const simulation = createSimulation();
    if (!simulation) return;
    
    simulationRef.current = simulation;
    setIsRunning(true);
    setIsConverged(false);
    iterationCountRef.current = 0;
    energyHistoryRef.current = [];
    lastUpdateTimeRef.current = performance.now();
    
    // Запускаем цикл симуляции
    animationFrameRef.current = requestAnimationFrame(runSimulation);
  }, [isRunning, createSimulation, runSimulation]);

  // Остановка симуляции
  const stopSimulation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    
    setIsRunning(false);
  }, []);

  // Сброс симуляции
  const resetSimulation = useCallback(() => {
    stopSimulation();
    
    // Сбрасываем позиции узлов
    nodes.forEach(node => {
      node.x = undefined;
      node.y = undefined;
      node.vx = undefined;
      node.vy = undefined;
    });
    
    setIsConverged(false);
    setAlpha(1);
    setEnergy(0);
    energyHistoryRef.current = [];
  }, [stopSimulation, nodes]);

  // Нагрев системы
  const heatUp = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
      setIsConverged(false);
    }
    
    // Добавляем случайные импульсы
    nodes.forEach(node => {
      node.vx = (Math.random() - 0.5) * 100;
      node.vy = (Math.random() - 0.5) * 100;
    });
  }, [nodes]);

  // Обновление конфигурации
  const updateConfig = useCallback((newConfig: Partial<OptimizedPhysicsConfig>) => {
    Object.assign(physicsConfig, newConfig);
    
    if (simulationRef.current) {
      // Обновляем силы
      const adaptiveForces = getAdaptiveForces();
      
      simulationRef.current
        .force('charge')
        .strength(-adaptiveForces.repulsion)
        .theta(physicsConfig.enableBarnesHut ? physicsConfig.theta : Infinity);
      
      simulationRef.current
        .force('link')
        .distance(adaptiveForces.naturalLinkLength)
        .strength(adaptiveForces.attraction);
      
      simulationRef.current.velocityDecay(physicsConfig.damping);
    }
  }, [physicsConfig, getAdaptiveForces]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  // Автозапуск при изменении данных
  useEffect(() => {
    if (nodes.length > 0) {
      startSimulation();
    }
    
    return () => stopSimulation();
  }, [nodes.length, startSimulation, stopSimulation]);

  return {
    // Управление симуляцией
    startSimulation,
    stopSimulation,
    resetSimulation,
    heatUp,
    updateConfig,
    
    // Состояние симуляции
    isRunning,
    isConverged,
    alpha,
    fps,
    energy,
    iterationCount: iterationCountRef.current,
    
    // Конфигурация
    config: physicsConfig,
    
    // Утилиты
    calculateEnergy,
    checkConvergence,
  };
}

