'use client';

import type { PhysicsConfig } from '../types';

interface ControlsPanelProps {
  physicsConfig: PhysicsConfig;
  onConfigChange: (config: Partial<PhysicsConfig>) => void;
  onReload: () => void;
}

export function ControlsPanel({ physicsConfig, onConfigChange, onReload }: ControlsPanelProps) {
  const handleInputChange = (key: keyof PhysicsConfig, value: number) => {
    onConfigChange({ [key]: value });
  };

  return (
    <div className="graph-container">
      <h3>Настройки физики</h3>

      <div className="controls">
        <div className="control-group">
          <label>Отталкивание</label>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={physicsConfig.repulsion}
            onChange={(e) => handleInputChange('repulsion', Number(e.target.value))}
          />
          <span>{physicsConfig.repulsion}</span>
        </div>

        <div className="control-group">
          <label>Притяжение</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={physicsConfig.attraction}
            onChange={(e) => handleInputChange('attraction', Number(e.target.value))}
          />
          <span>{physicsConfig.attraction.toFixed(2)}</span>
        </div>

        <div className="control-group">
          <label>Гравитация</label>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.001"
            value={physicsConfig.gravity}
            onChange={(e) => handleInputChange('gravity', Number(e.target.value))}
          />
          <span>{physicsConfig.gravity.toFixed(3)}</span>
        </div>

        <div className="control-group">
          <label>Демпфирование</label>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.01"
            value={physicsConfig.damping}
            onChange={(e) => handleInputChange('damping', Number(e.target.value))}
          />
          <span>{physicsConfig.damping.toFixed(2)}</span>
        </div>

        <div className="control-group">
          <label>Длина связи</label>
          <input
            type="range"
            min="50"
            max="200"
            step="5"
            value={physicsConfig.naturalLinkLength}
            onChange={(e) => handleInputChange('naturalLinkLength', Number(e.target.value))}
          />
          <span>{physicsConfig.naturalLinkLength}</span>
        </div>

        <div className="control-group">
          <label>Жесткость пружины</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={physicsConfig.springStiffness}
            onChange={(e) => handleInputChange('springStiffness', Number(e.target.value))}
          />
          <span>{physicsConfig.springStiffness.toFixed(2)}</span>
        </div>

        <div className="control-group">
          <label>Скорость охлаждения</label>
          <input
            type="range"
            min="0.8"
            max="0.99"
            step="0.01"
            value={physicsConfig.coolingRate}
            onChange={(e) => handleInputChange('coolingRate', Number(e.target.value))}
          />
          <span>{physicsConfig.coolingRate.toFixed(2)}</span>
        </div>

        <div className="control-group">
          <label>Минимальная температура</label>
          <input
            type="range"
            min="0.01"
            max="10"
            step="0.01"
            value={physicsConfig.minTemperature}
            onChange={(e) => handleInputChange('minTemperature', Number(e.target.value))}
          />
          <span>{physicsConfig.minTemperature.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button onClick={onReload} className="button">
          Перезагрузить данные
        </button>
      </div>
    </div>
  );
}
