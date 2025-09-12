import { useCallback, useRef, useEffect, useState } from 'react';
import { GraphNode, GraphEdge } from '../types';

export interface PhysicsConfig {
  // Основные параметры
  repulsion: number;
  attraction: number;
  gravity: number;
  damping: number;
  
  // Пружинная система связей
  naturalLinkLength: number;
  maxLinkStretch: number;
  minLinkLength: number;
  springStiffness: number;
  springDamping: number;
  
  // Температура и охлаждение
  initialTemperature: number;
  minTemperature: number;
  coolingRate: number;
  
  // Производительность
  adaptiveFPS: boolean;
  targetFPS: number;
  maxFPS: number;
  minFPS: number;
}

export interface UseGraphPhysicsProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config?: Partial<PhysicsConfig>;
  onUpdate?: (positions: Map<string, { x: number; y: number }>) => void;
}

const defaultConfig: PhysicsConfig = {
  repulsion: 20000,
  attraction: 120,
  gravity: 0.1,
  damping: 0.85,
  
  // Пружинная система
  naturalLinkLength: 200,
  maxLinkStretch: 500,
  minLinkLength: 75,
  springStiffness: 0.8,
  springDamping: 0.9,
  
  // Температура
  initialTemperature: 1000,
  minTemperature: 0.1,
  coolingRate: 0.95,
  
  // Производительность
  adaptiveFPS: true,
  targetFPS: 60,
  maxFPS: 120,
  minFPS: 30,
};

export function useGraphPhysics({ nodes, edges, config = {}, onUpdate }: UseGraphPhysicsProps) {
  const physicsConfig = { ...defaultConfig, ...config };
  
  // Состояние симуляции
  const currentPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const velocities = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const pinnedRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  // Состояние для UI (вызывает ре-рендер)
  const [temperature, setTemperature] = useState(physicsConfig.initialTemperature);
  const [fps, setFps] = useState(0);
  
  npx tsx src/simple-index.ts  // Метрики производительности
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  
  // Инициализация позиций
  const initializePositions = useCallback(() => {
    currentPositions.current.clear();
    velocities.current.clear();
    
    // Размещаем узлы в случайных позициях
    nodes.forEach(node => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 300 + 100;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      currentPositions.current.set(node.id, { x, y });
      velocities.current.set(node.id, { vx: 0, vy: 0 });
    });
    
    setTemperature(physicsConfig.initialTemperature);
  }, [nodes, physicsConfig.initialTemperature]);
  
  // Пружинная сила связи
  const calculateSpringForce = useCallback((distance: number, naturalLength: number) => {
    const stretch = distance - naturalLength;
    const maxStretch = physicsConfig.maxLinkStretch - naturalLength;
    const minStretch = naturalLength - physicsConfig.minLinkLength;
    
    // Ограничиваем растяжение
    const clampedStretch = Math.max(minStretch, Math.min(maxStretch, stretch));
    
    // Сила пружины: F = -k * x (закон Гука)
    const springForce = -physicsConfig.springStiffness * clampedStretch;
    
    return springForce;
  }, [physicsConfig]);
  
  // Симуляция Fruchterman-Reingold с пружинной системой
  const simulateFruchtermanReingold = useCallback((deltaTime: number, currentTemp: number) => {
    const nodes = Array.from(currentPositions.current.keys());
    const area = 1000 * 1000; // Общая площадь
    const k = Math.sqrt(area / nodes.length);
    
    // Сброс сил
    const forces = new Map<string, { fx: number; fy: number }>();
    nodes.forEach(nodeId => {
      forces.set(nodeId, { fx: 0, fy: 0 });
    });
    
    // Отталкивание между всеми узлами
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];
      const posA = currentPositions.current.get(nodeA);
      if (!posA) continue;
      
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j];
        const posB = currentPositions.current.get(nodeB);
        if (!posB) continue;
        
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        
        // Сила отталкивания: Fr = k² / d
        const force = (k * k) / distance;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const forceA = forces.get(nodeA)!;
        const forceB = forces.get(nodeB)!;
        
        forceA.fx -= fx;
        forceA.fy -= fy;
        forceB.fx += fx;
        forceB.fy += fy;
      }
    }
    
    // Пружинные силы связей
    edges.forEach(edge => {
      const posA = currentPositions.current.get(edge.source);
      const posB = currentPositions.current.get(edge.target);
      if (!posA || !posB) return;
      
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      
      // Пружинная сила
      const springForce = calculateSpringForce(distance, physicsConfig.naturalLinkLength);
      const fx = (dx / distance) * springForce;
      const fy = (dy / distance) * springForce;
      
      const forceA = forces.get(edge.source)!;
      const forceB = forces.get(edge.target)!;
      
      forceA.fx += fx;
      forceA.fy += fy;
      forceB.fx -= fx;
      forceB.fy -= fy;
    });
    
    // Гравитация к центру
    nodes.forEach(nodeId => {
      const pos = currentPositions.current.get(nodeId)!;
      const centerX = 0;
      const centerY = 0;
      const dx = centerX - pos.x;
      const dy = centerY - pos.y;
      
      const force = forces.get(nodeId)!;
      force.fx += dx * physicsConfig.gravity;
      force.fy += dy * physicsConfig.gravity;
    });
    
    // Применение сил к скоростям
    nodes.forEach(nodeId => {
      const force = forces.get(nodeId)!;
      const velocity = velocities.current.get(nodeId)!;
      const isPinned = pinnedRef.current.has(nodeId);
      
      if (!isPinned) {
        // Применяем силу с учетом температуры
        const forceMultiplier = currentTemp / physicsConfig.initialTemperature;
        velocity.vx += force.fx * deltaTime * forceMultiplier;
        velocity.vy += force.fy * deltaTime * forceMultiplier;
        
        // Демпфирование
        velocity.vx *= physicsConfig.damping;
        velocity.vy *= physicsConfig.damping;
      }
    });
    
    // Обновление позиций
    nodes.forEach(nodeId => {
      const pos = currentPositions.current.get(nodeId)!;
      const velocity = velocities.current.get(nodeId)!;
      const isPinned = pinnedRef.current.has(nodeId);
      
      if (!isPinned) {
        pos.x += velocity.vx * deltaTime;
        pos.y += velocity.vy * deltaTime;
      }
    });
  }, [edges, physicsConfig, calculateSpringForce]);
  
  // Адаптивная симуляция
  const simulatePhysics = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
      return;
    }

    const deltaTime = (currentTime - lastTimeRef.current) / 1000; // в секундах
    lastTimeRef.current = currentTime;
    
    // Ограничиваем deltaTime для стабильности
    const clampedDeltaTime = Math.min(deltaTime, 1/30); // максимум 30 FPS
    
    // Охлаждение температуры
    const newTemperature = Math.max(
      physicsConfig.minTemperature,
      temperature * physicsConfig.coolingRate
    );
    
    // Обновляем температуру в состоянии
    setTemperature(newTemperature);
    
    // Запускаем симуляцию с новой температурой
    simulateFruchtermanReingold(clampedDeltaTime, newTemperature);
    
    // Обновляем метрики FPS
    frameCountRef.current++;
    if (currentTime - lastFpsTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsTimeRef.current = currentTime;
    }
    
    // Вызываем callback для обновления UI
    if (onUpdate) {
      onUpdate(new Map(currentPositions.current));
    }
  }, [simulateFruchtermanReingold, onUpdate, temperature, physicsConfig]);
  
  // Основной цикл анимации
  const animate = useCallback((currentTime: number) => {
    simulatePhysics(currentTime);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [simulatePhysics]);
  
  // Запуск симуляции
  const startSimulation = useCallback(() => {
    if (animationFrameRef.current) return;
    
    console.log('Starting simulation...');
    initializePositions();
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [initializePositions, animate]);
  
  // Остановка симуляции
  const stopSimulation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);
  
  // Сброс симуляции
  const resetSimulation = useCallback(() => {
    stopSimulation();
    initializePositions();
    if (onUpdate) {
      onUpdate(new Map(currentPositions.current));
    }
  }, [stopSimulation, initializePositions, onUpdate]);
  
  // Нагрев системы
  const heatUp = useCallback(() => {
    setTemperature(physicsConfig.initialTemperature);
    
    // Добавляем случайные импульсы
    nodes.forEach(node => {
      const velocity = velocities.current.get(node.id);
      if (velocity) {
        velocity.vx += (Math.random() - 0.5) * 100;
        velocity.vy += (Math.random() - 0.5) * 100;
      }
    });
  }, [nodes, physicsConfig.initialTemperature]);
  
  // Управление закреплением узлов
  const pinNode = useCallback((nodeId: string) => {
    pinnedRef.current.add(nodeId);
  }, []);

  const unpinNode = useCallback((nodeId: string) => {
    pinnedRef.current.delete(nodeId);
  }, []);

  const isNodePinned = useCallback((nodeId: string) => {
    return pinnedRef.current.has(nodeId);
  }, []);

  // Обновление позиции узла (для drag & drop)
  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    const pos = currentPositions.current.get(nodeId);
    if (pos) {
      pos.x = x;
      pos.y = y;
      // Сбрасываем скорость при перетаскивании
      const velocity = velocities.current.get(nodeId);
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }
    }
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);
  
  // Автозапуск при изменении данных
  useEffect(() => {
    if (nodes.length > 0) {
      console.log('Starting simulation with', nodes.length, 'nodes');
      startSimulation();
    }
    return () => stopSimulation();
  }, [nodes.length, startSimulation, stopSimulation]);
  
  // Принудительное обновление температуры каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      const newTemp = Math.max(
        physicsConfig.minTemperature,
        temperature * physicsConfig.coolingRate
      );
      setTemperature(newTemp);
      console.log('Forced temperature update:', newTemp);
    }, 1000); // Обновляем каждую секунду
    
    return () => clearInterval(interval);
  }, [temperature, physicsConfig.minTemperature, physicsConfig.coolingRate]);

  return {
    // Управление симуляцией
    startSimulation,
    stopSimulation,
    resetSimulation,
    heatUp,
    
    // Управление узлами
    pinNode,
    unpinNode,
    isNodePinned,
    updateNodePosition,
    
    // Состояние
    positions: currentPositions.current,
    velocities: velocities.current,
    temperature,
    fps,
    
    // Конфигурация
    config: physicsConfig,
  };
}