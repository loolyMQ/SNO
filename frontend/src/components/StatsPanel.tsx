'use client';

interface StatsPanelProps {
  stats: any;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  if (!stats) return null;

  return (
    <div className="stats">
      <div className="stat-card">
        <div className="stat-value">{stats.nodeCount || 0}</div>
        <div className="stat-label">Узлов</div>
      </div>

      <div className="stat-card">
        <div className="stat-value">{stats.edgeCount || 0}</div>
        <div className="stat-label">Связей</div>
      </div>

      <div className="stat-card">
        <div className="stat-value">{stats.temperature?.toFixed(1) || '0.0'}</div>
        <div className="stat-label">Температура</div>
      </div>

      <div className="stat-card">
        <div className="stat-value">{stats.isStable ? 'Да' : 'Нет'}</div>
        <div className="stat-label">Стабильность</div>
      </div>

      <div className="stat-card">
        <div className="stat-value">{stats.isSimulating ? 'Да' : 'Нет'}</div>
        <div className="stat-label">Симуляция</div>
      </div>
    </div>
  );
}
