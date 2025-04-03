/// <reference types="jest" />
import { ComponentLogger, LogLevel } from '../../core/Logger';

describe('ComponentLogger', () => {
  let originalConsole: Console;
  let mockConsole: jest.SpyInstance[];
  let logger: ComponentLogger;

  beforeEach(() => {
    // Save original console methods
    originalConsole = { ...console };

    // Create mock implementations that don't call through to the original methods
    mockConsole = [
      jest.spyOn(console, 'debug').mockImplementation(() => {}),
      jest.spyOn(console, 'info').mockImplementation(() => {}),
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'error').mockImplementation(() => {}),
    ];

    // Create a new logger instance for each test
    logger = new ComponentLogger('TestComponent');
  });

  afterEach(() => {
    // Restore original console methods
    mockConsole.forEach(mock => mock.mockRestore());
  });

  test('should log debug messages', () => {
    // Set log level to DEBUG to allow debug messages
    logger.setLevel(LogLevel.DEBUG);
    logger.debug('Test debug message');
    expect(console.debug).toHaveBeenCalled();
  });

  test('should log info messages', () => {
    logger.info('Test info message');
    expect(console.info).toHaveBeenCalled();
  });

  test('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(console.warn).toHaveBeenCalled();
  });

  test('should log error messages', () => {
    logger.error('Test error message');
    expect(console.error).toHaveBeenCalled();
  });

  test('should include component name in log messages', () => {
    logger.info('Test message with component');
    expect(console.info).toHaveBeenCalled();
    const calls = (console.info as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Just check that the first argument contains the component name
    // This avoids issues with specific formatting
    if (calls.length > 0) {
      const firstCall = calls[0];
      expect(firstCall[0]).toContain('TestComponent');
    }
  });
});
