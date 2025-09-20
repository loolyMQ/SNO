'use client';

import React, { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';

export interface ExportOptions {
  format: 'json' | 'csv' | 'png' | 'svg' | 'pdf';
  includeMetadata: boolean;
  includePositions: boolean;
  includeConnections: boolean;
  imageSize: {
    width: number;
    height: number;
  };
  imageQuality: number;
}

export interface ExportPanelProps {
  onExport: (options: ExportOptions) => void;
  isExporting?: boolean;
  availableFormats?: string[];
}

export function ExportPanel({
  onExport,
  isExporting = false,
  availableFormats = ['json', 'csv', 'png', 'svg', 'pdf'],
}: ExportPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: true,
    includePositions: true,
    includeConnections: true,
    imageSize: {
      width: 1920,
      height: 1080,
    },
    imageQuality: 0.9,
  });

  // Обработка экспорта
  const handleExport = useCallback(() => {
    onExport(exportOptions);
    setShowModal(false);
  }, [exportOptions, onExport]);

  // Быстрый экспорт
  const handleQuickExport = useCallback((format: ExportOptions['format']) => {
    const quickOptions: ExportOptions = {
      ...exportOptions,
      format,
    };
    onExport(quickOptions);
  }, [exportOptions, onExport]);

  // Обновление опций
  const updateOptions = useCallback((newOptions: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Генерация имени файла
  const generateFileName = useCallback((format: string) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `science-map-export-${timestamp}.${format}`;
  }, []);

  return (
    <>
      <Card className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Экспорт данных</h3>
          
          {/* Быстрые кнопки экспорта */}
          <div className="grid grid-cols-2 gap-2">
            {availableFormats.includes('json') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickExport('json')}
                disabled={isExporting}
              >
                JSON
              </Button>
            )}
            
            {availableFormats.includes('csv') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickExport('csv')}
                disabled={isExporting}
              >
                CSV
              </Button>
            )}
            
            {availableFormats.includes('png') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickExport('png')}
                disabled={isExporting}
              >
                PNG
              </Button>
            )}
            
            {availableFormats.includes('svg') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickExport('svg')}
                disabled={isExporting}
              >
                SVG
              </Button>
            )}
          </div>

          {/* Кнопка расширенных настроек */}
          <Button
            onClick={() => setShowModal(true)}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? 'Экспорт...' : 'Расширенные настройки'}
          </Button>
        </div>
      </Card>

      {/* Модальное окно с настройками */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Настройки экспорта"
      >
        <div className="space-y-6">
          {/* Формат экспорта */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Формат файла:
            </label>
            <select
              value={exportOptions.format}
              onChange={(e) => updateOptions({ format: e.target.value as ExportOptions['format'] })}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {availableFormats.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Опции для данных */}
          {(exportOptions.format === 'json' || exportOptions.format === 'csv') && (
            <div className="space-y-3">
              <h4 className="font-medium">Включить в экспорт:</h4>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => updateOptions({ includeMetadata: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Метаданные (дата создания, версия)</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includePositions}
                  onChange={(e) => updateOptions({ includePositions: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Позиции узлов</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeConnections}
                  onChange={(e) => updateOptions({ includeConnections: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Информация о связях</span>
              </label>
            </div>
          )}

          {/* Настройки для изображений */}
          {(exportOptions.format === 'png' || exportOptions.format === 'svg' || exportOptions.format === 'pdf') && (
            <div className="space-y-4">
              <h4 className="font-medium">Настройки изображения:</h4>
              
              {/* Размер изображения */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ширина (px):
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="4000"
                    value={exportOptions.imageSize.width}
                    onChange={(e) => updateOptions({
                      imageSize: {
                        ...exportOptions.imageSize,
                        width: parseInt(e.target.value) || 1920,
                      },
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Высота (px):
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="4000"
                    value={exportOptions.imageSize.height}
                    onChange={(e) => updateOptions({
                      imageSize: {
                        ...exportOptions.imageSize,
                        height: parseInt(e.target.value) || 1080,
                      },
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Качество изображения */}
              {exportOptions.format === 'png' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Качество: {Math.round(exportOptions.imageQuality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={exportOptions.imageQuality}
                    onChange={(e) => updateOptions({ imageQuality: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {/* Предустановленные размеры */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Предустановленные размеры:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateOptions({
                      imageSize: { width: 1920, height: 1080 },
                    })}
                  >
                    Full HD
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateOptions({
                      imageSize: { width: 2560, height: 1440 },
                    })}
                  >
                    2K
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateOptions({
                      imageSize: { width: 3840, height: 2160 },
                    })}
                  >
                    4K
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateOptions({
                      imageSize: { width: 1024, height: 768 },
                    })}
                  >
                    Квадрат
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Информация о файле */}
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">
              <div>Имя файла: {generateFileName(exportOptions.format)}</div>
              {exportOptions.format === 'png' && (
                <div>Размер: {exportOptions.imageSize.width} × {exportOptions.imageSize.height} px</div>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? 'Экспорт...' : 'Экспортировать'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isExporting}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
