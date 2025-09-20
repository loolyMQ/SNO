import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatsPanel } from '../StatsPanel';

describe('StatsPanel', () => {
  const mockStats = {
    nodeCount: 10,
    edgeCount: 15,
    averageConnections: 3.0,
    temperature: 0.5,
    isStable: true,
    isSimulating: false
  };

  it('renders statistics correctly', () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText('10')).toBeInTheDocument(); // nodeCount
    expect(screen.getByText('15')).toBeInTheDocument(); // edgeCount
    expect(screen.getByText('0.5')).toBeInTheDocument(); // temperature
  });

  it('shows stable state when isStable is true', () => {
    render(<StatsPanel stats={mockStats} />);

    expect(screen.getByText('Стабильность')).toBeInTheDocument();
    expect(screen.getByText('Да')).toBeInTheDocument();
  });

  it('shows unstable state when isStable is false', () => {
    const unstableStats = { ...mockStats, isStable: false };
    render(<StatsPanel stats={unstableStats} />);

    expect(screen.getByText('Стабильность')).toBeInTheDocument();
    expect(screen.getAllByText('Нет')).toHaveLength(2); // Стабильность и Симуляция
  });

  it('shows simulation status', () => {
    const simulatingStats = { ...mockStats, isSimulating: true };
    render(<StatsPanel stats={simulatingStats} />);

    expect(screen.getByText('Симуляция')).toBeInTheDocument();
    expect(screen.getAllByText('Да')).toHaveLength(2); // Стабильность и Симуляция
  });

  it('handles zero values', () => {
    const zeroStats = {
      nodeCount: 0,
      edgeCount: 0,
      averageConnections: 0,
      temperature: 0,
      isStable: true,
      isSimulating: false
    };

    render(<StatsPanel stats={zeroStats} />);

    expect(screen.getAllByText('0')).toHaveLength(2); // Узлы и связи
  });

  it('formats numbers correctly', () => {
    const decimalStats = {
      ...mockStats,
      temperature: 0.123456
    };

    render(<StatsPanel stats={decimalStats} />);

    // Should show formatted numbers (depends on implementation)
    expect(screen.getByText('0.1')).toBeInTheDocument();
  });
});
