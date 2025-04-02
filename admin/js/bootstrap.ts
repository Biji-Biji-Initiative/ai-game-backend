// Types improved by ts-improve-types
/**
 * Bootstrap
 *
 * Application bootstrap code to set up services and register dependencies
 */

import { AppBootstrapper } from './core/AppBootstrapper';
import { DependencyContainer } from './core/DependencyContainer';
import { Logger } from './core/Logger';
import { logger } from './utils/logger';
import { LocalStorageService, SessionStorageService, MemoryStorageService } from './services/StorageService';

/**
 * Bootstrap the application
 */
export function bootstrap(): void {
  logger.info('Bootstrapping application - registering fundamental services');

  try {
    // Get the dependency container
    const container = DependencyContainer.getInstance();
    
    // Register storage services
    container.register('localStorage', () => new LocalStorageService());
    container.register('sessionStorage', () => new SessionStorageService());
    container.register('memoryStorage', () => new MemoryStorageService());
    
    // Register the default storage service
    container.register('storageService', () => new LocalStorageService());
    
    logger.info('Fundamental services registered successfully');
  } catch (error) {
    logger.error('Failed to register fundamental services:', error);
  }
}

// Run bootstrap when the file is imported
bootstrap();
