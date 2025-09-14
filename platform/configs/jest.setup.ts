// Глобальная настройка для Jest тестов
import 'jest';

// Настройка переменных окружения для тестов
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Мокаем консоль для тестов
global.console = {
  ...console,
  // Отключаем логи в тестах
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Настройка таймаутов
jest.setTimeout(10000);

// Очистка после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
