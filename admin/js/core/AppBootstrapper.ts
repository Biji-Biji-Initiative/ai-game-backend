import { Component } from '../types/component-base';
import { ConfigManager } from './ConfigManager';
import { DependencyContainer } from './DependencyContainer';
import { EventBus } from './EventBus';
import { HttpClient } from './HttpClient';
import { ApiClient } from './ApiClient';
import { Logger, LogLevel, ComponentLogger } from './Logger';

/**
 * Bootstrap options for the application
 */
export interface AppBootstrapOptions {
  /**
   * Config file path
   */
  configPath?: string;
  
  /**
   * Minimum log level
   */
  logLevel?: LogLevel;
  
  /**
   * Whether to initialize components automatically
   */
  autoInitialize?: boolean;
  
  /**
   * Whether to register default services
   */
  registerDefaultServices?: boolean;
  
  /**
   * Default API URL
   */
  apiUrl?: string;
}

/**
 * Default bootstrap options
 */
const DEFAULT_OPTIONS: AppBootstrapOptions = {
  configPath: '/config/app-config.json',
  logLevel: LogLevel.INFO,
  autoInitialize: true,
  registerDefaultServices: true,
  apiUrl: '/api',
};

/**
 * Component initialization status
 */
export enum InitStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Application bootstrapper for initializing all components
 */
export class AppBootstrapper implements Component {
  private static instance: AppBootstrapper;
  private options: AppBootstrapOptions;
  private dependencyContainer: DependencyContainer;
  private logger: ComponentLogger;
  private initStatus: Map<string, InitStatus> = new Map();
  private eventBus: EventBus;
  private isBootstrapped: boolean = false;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AppBootstrapper {
    if (!AppBootstrapper.instance) {
      AppBootstrapper.instance = new AppBootstrapper();
    }
    return AppBootstrapper.instance;
  }
  
  /**
   * Private constructor
   */
  private constructor() {
    this.options = { ...DEFAULT_OPTIONS };
    this.logger = Logger.getLogger('AppBootstrapper');
    this.dependencyContainer = DependencyContainer.getInstance();
    this.eventBus = EventBus.getInstance();
    
    // Set initial status for core components
    this.initStatus.set('logger', InitStatus.NOT_STARTED);
    this.initStatus.set('config', InitStatus.NOT_STARTED);
    this.initStatus.set('eventBus', InitStatus.NOT_STARTED);
    this.initStatus.set('dependencyContainer', InitStatus.NOT_STARTED);
    this.initStatus.set('httpClient', InitStatus.NOT_STARTED);
    this.initStatus.set('apiClient', InitStatus.NOT_STARTED);
  }
  
  /**
   * Implementation of Component interface
   * Initializes the application by bootstrapping it
   */
  public initialize(): void {
    if (!this.isBootstrapped) {
      this.bootstrap(this.options).catch(error => {
        console.error('Failed to initialize application:', error);
      });
    }
  }
  
  /**
   * Bootstrap the application
   * @param options Bootstrap options
   */
  public async bootstrap(options: AppBootstrapOptions = {}): Promise<void> {
    if (this.isBootstrapped) {
      this.logger.warn('Application already bootstrapped', 'Bootstrap operation skipped');
      return;
    }
    
    // Merge options
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    
    try {
      // Initialize logger first
      await this.initializeLogger();
      
      // Initialize config
      await this.initializeConfig();
      
      // Initialize event bus
      await this.initializeEventBus();
      
      // Initialize dependency container
      await this.initializeDependencyContainer();
      
      // Initialize HTTP client
      await this.initializeHttpClient();
      
      // Initialize API client
      await this.initializeApiClient();
      
      // Register default services if enabled
      if (this.options.registerDefaultServices) {
        this.registerDefaultServices();
      }
      
      this.isBootstrapped = true;
      this.logger.info('Application bootstrapped successfully', 'All components initialized');
      
      // Emit bootstrap complete event
      this.eventBus.publish('app:bootstrapped', {
        timestamp: new Date(),
        status: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to bootstrap application', errorMessage);
      
      // Emit bootstrap failed event
      this.eventBus.publish('app:bootstrap:failed', {
        timestamp: new Date(),
        error,
      });
      
      throw error;
    }
  }
  
  /**
   * Initialize the logger
   */
  private async initializeLogger(): Promise<void> {
    this.updateStatus('logger', InitStatus.IN_PROGRESS);
    
    try {
      // Configure logger with minimum log level
      const loggerInstance = Logger.getInstance();
      
      // Set the log level if provided
      if (this.options.logLevel !== undefined) {
        loggerInstance.setLevel(this.options.logLevel);
      }
      
      this.updateStatus('logger', InitStatus.COMPLETED);
      this.logger.info('Logger initialized', 'Logging system ready');
    } catch (error) {
      this.updateStatus('logger', InitStatus.FAILED);
      console.error('Failed to initialize logger', error);
      throw error;
    }
  }
  
  /**
   * Initialize the config manager
   */
  private async initializeConfig(): Promise<void> {
    this.updateStatus('config', InitStatus.IN_PROGRESS);
    
    try {
      const configManager = ConfigManager.getInstance();
      
      // Load config from path
      if (this.options.configPath) {
        try {
          await configManager.loadConfig(this.options.configPath);
          this.logger.info('Config loaded', `Configuration loaded from ${this.options.configPath}`);
        } catch (error) {
          // Log error but continue - don't fail bootstrap due to config loading failure
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to load config from ${this.options.configPath}`, 
            errorMessage
          );
        }
      }
      
      // Set API URL if provided
      if (this.options.apiUrl) {
        configManager.set('apiUrl', this.options.apiUrl);
      }
      
      this.updateStatus('config', InitStatus.COMPLETED);
      this.logger.info('Config initialized', `Configuration ready`);
    } catch (error) {
      this.updateStatus('config', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize config', errorMessage);
      throw error;
    }
  }
  
  /**
   * Initialize the event bus
   */
  private async initializeEventBus(): Promise<void> {
    this.updateStatus('eventBus', InitStatus.IN_PROGRESS);
    
    try {
      // Nothing special to do here, just mark as completed
      this.updateStatus('eventBus', InitStatus.COMPLETED);
      this.logger.info('EventBus initialized', 'Event system ready');
    } catch (error) {
      this.updateStatus('eventBus', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize event bus', errorMessage);
      throw error;
    }
  }
  
  /**
   * Initialize the dependency container
   */
  private async initializeDependencyContainer(): Promise<void> {
    this.updateStatus('dependencyContainer', InitStatus.IN_PROGRESS);
    
    try {
      // Register core components in the container
      this.dependencyContainer.register('logger', () => Logger.getInstance());
      this.dependencyContainer.register('configManager', () => ConfigManager.getInstance());
      this.dependencyContainer.register('eventBus', () => this.eventBus);
      
      this.updateStatus('dependencyContainer', InitStatus.COMPLETED);
      this.logger.info('DependencyContainer initialized', 'Dependency injection system ready');
    } catch (error) {
      this.updateStatus('dependencyContainer', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize dependency container', errorMessage);
      throw error;
    }
  }
  
  /**
   * Initialize the HTTP client
   */
  private async initializeHttpClient(): Promise<void> {
    this.updateStatus('httpClient', InitStatus.IN_PROGRESS);
    
    try {
      const httpClient = HttpClient.getInstance();
      httpClient.initialize();
      this.dependencyContainer.register('httpClient', () => httpClient);
      
      this.updateStatus('httpClient', InitStatus.COMPLETED);
      this.logger.info('HttpClient initialized', 'HTTP client ready');
    } catch (error) {
      this.updateStatus('httpClient', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize HTTP client', errorMessage);
      throw error;
    }
  }
  
  /**
   * Initialize the API client
   */
  private async initializeApiClient(): Promise<void> {
    this.updateStatus('apiClient', InitStatus.IN_PROGRESS);
    
    try {
      const configManager = ConfigManager.getInstance();
      const apiUrl = configManager.get('apiUrl') as string || this.options.apiUrl;
      
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }
      
      const apiClient = ApiClient.getInstance();
      apiClient.initialize({
        baseUrl: apiUrl
      });
      
      this.dependencyContainer.register('apiClient', () => apiClient);
      
      this.updateStatus('apiClient', InitStatus.COMPLETED);
      this.logger.info('ApiClient initialized', `API client ready with base URL: ${apiUrl}`);
    } catch (error) {
      this.updateStatus('apiClient', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize API client', errorMessage);
      throw error;
    }
  }
  
  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    // Register core services
    this.dependencyContainer.register('appBootstrapper', () => this);
    
    this.logger.info('Default services registered', 'Core services available in dependency container');
  }
  
  /**
   * Update component initialization status
   * @param component Component name
   * @param status New status
   */
  private updateStatus(component: string, status: InitStatus): void {
    this.initStatus.set(component, status);
    
    // Emit status change event
    this.eventBus.publish('app:component:status', {
      component,
      status,
      timestamp: new Date(),
    });
  }
  
  /**
   * Get initialization status
   * @param component Component name
   */
  public getStatus(component: string): InitStatus {
    return this.initStatus.get(component) || InitStatus.NOT_STARTED;
  }
  
  /**
   * Check if application is bootstrapped
   */
  public isBootstrapComplete(): boolean {
    return this.isBootstrapped;
  }
} 