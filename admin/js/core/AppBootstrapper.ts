// Types improved by ts-improve-types
import { Component } from '../types/component-base';
import { ConfigManager } from './ConfigManager';
import { DependencyContainer } from './DependencyContainer';
import { EventBus } from './EventBus';
import { ApiClient } from './ApiClient';
import { Logger, LogLevel, ComponentLogger } from './Logger';
import { UIController } from '../types/ui-controller';
import { AppController } from '../types/app-controller';
import { APIClient } from '../api/api-client';
import { EndpointManager } from '../modules/endpoint-manager';
import { DomainStateManager } from '../modules/domain-state-manager';
import { VariableManager } from '../modules/variable-manager';
import { BackendLogsManager } from '../modules/backend-logs-manager';
import { StatusManager } from '../modules/status-manager';
import { HistoryManager } from '../modules/history-manager';
import { ResponseViewer } from '../components/ResponseViewer';
import { DomainStateViewer } from '../components/DomainStateViewer';
import { UIManager } from '../components/UIManagerNew';
import LogsViewer from '../components/LogsViewer';
import { FlowController } from '../controllers/FlowController';
import { AuthManager } from '../modules/auth-manager';
import { UserFriendlyFlowManager } from '../modules/user-friendly-flow-manager';
import { UserFriendlyUI } from '../components/UserFriendlyUI';
import { VariableExtractor } from '../components/VariableExtractor';
import { BrowserDomService } from '../services/DomService';
import { LocalStorageService, StorageService } from '../services/StorageService';
import { FetchNetworkService, NetworkRequestOptions } from '../services/NetworkService';
import { ConsoleLoggingService, LogLevel as LoggingLevel } from '../services/LoggingService';
import {
  EndpointManagerOptions,
  VariableManagerOptions,
  DomainStateManagerOptions,
  StatusManagerOptions,
  HistoryManagerOptions,
  BackendLogsManagerOptions,
  UserFriendlyFlowManagerOptions,
  UserFriendlyUIOptions,
  ResponseViewerOptions,
  DomainStateViewerOptions,
  VariableExtractorOptions
} from '../types/service-options';

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
  private isBootstrapped = false;
  private container: HTMLElement;
  private configManager: ConfigManager;
  private uiController: UIController | null = null;
  private appController: AppController | null = null;
  private apiClient: ApiClient | null = null;

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
    this.logger = Logger.getLogger('AppBootstrapper'); // Property added
    this.dependencyContainer = DependencyContainer.getInstance(); // Property added
    this.eventBus = EventBus.getInstance(); // Property added

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
  public async bootstrap(options: Partial<AppBootstrapOptions> = {}): Promise<void> {
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

      // Initialize API client
      await this.initializeApiClient();

      // Register default services if enabled
      if (this.options.registerDefaultServices) {
        this.registerDefaultServices();
      }
      
      // Register all core components
      await this.registerCoreServices();
      
      // Register all managers
      await this.registerManagers();
      
      // Register all controllers
      await this.registerControllers();

      this.isBootstrapped = true; // Property added
      this.logger.info('Application bootstrapped successfully', 'All components initialized');

      // Initialize the application
      await this.initializeApp();

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
          this.logger.warn(`Failed to load config from ${this.options.configPath}`, errorMessage);
        }
      }

      // Set API URL if provided
      if (this.options.apiUrl) {
        configManager.set('apiUrl', this.options.apiUrl);
      }

      this.updateStatus('config', InitStatus.COMPLETED);
      this.logger.info('Config initialized', 'Configuration ready');
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
   * Initialize the API client
   */
  private async initializeApiClient(): Promise<void> {
    this.updateStatus('apiClient', InitStatus.IN_PROGRESS);

    try {
      const configManager = ConfigManager.getInstance();
      const apiUrl = (configManager.get('apiUrl') as string) || this.options.apiUrl;

      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      // Initialize the ApiClient instance (with lowercase 'i')
      const apiClient = ApiClient.getInstance();
      apiClient.initialize({
        baseUrl: apiUrl,
      });

      // Register it in the container
      this.dependencyContainer.register('apiClient', () => apiClient);

      try {
        // Create a new APIClient instance (with uppercase 'I')
        // Use dynamic import to avoid circular dependencies
        const apiClientModule = await import('../api/api-client');
        const APIClient = apiClientModule.APIClient;

        // Create a basic error handler for the new APIClient
        const errorHandler = {
          processApiError: error => {
            this.logger.error('API Error', error);
          },
          processTimeoutError: error => {
            this.logger.error('Timeout Error', error);
          },
          processNetworkError: error => {
            this.logger.error('Network Error', error);
          },
        };

        // Create a new instance with the error handler
        const mainApiClient = new APIClient(errorHandler, {});

        // Configure the client using setter methods (not direct property assignment)
        mainApiClient.setBaseUrl(apiUrl);
        mainApiClient.setApiVersion('v1');
        mainApiClient.setUseApiVersionPrefix(true);

        // Store the API client instance for further use
        // Note: We're ignoring the type mismatch for now as we transition from ApiClient to APIClient
        this.apiClient = apiClient; // Using apiClient (old) for compatibility

        // Register it as the main API client to use in other components
        this.dependencyContainer.register('mainApiClient', () => mainApiClient);
      } catch (importError) {
        this.logger.warn(
          'Failed to initialize APIClient from api/api-client',
          `Using ApiClient as mainApiClient instead: ${importError instanceof Error ? importError.message : String(importError)}`,
        );

        // If the import fails, use the original apiClient for both service names
        this.dependencyContainer.register('mainApiClient', () => apiClient);
        this.apiClient = apiClient;
      }

      this.updateStatus('apiClient', InitStatus.COMPLETED);
      this.logger.info('API clients initialized', `API clients ready with base URL: ${apiUrl}`);
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

    // Make sure mainApiClient is registered
    if (!this.dependencyContainer.has('mainApiClient')) {
      const apiClient = this.dependencyContainer.get('apiClient');
      this.dependencyContainer.register('mainApiClient', () => apiClient);
      this.logger.warn('mainApiClient not found, using apiClient as a fallback');
    }

    // Initialize and register AuthManager synchronously if possible
    try {
      // Use a synchronous import (this should be done before this module is loaded)
      const AuthManagerModulePath = '../modules/auth-manager';
      // This approach allows for synchronous registration but assumes the AuthManager is available
      import(AuthManagerModulePath)
        .then(module => {
          const AuthManager = module.AuthManager;
          const mainApiClient = this.dependencyContainer.get('mainApiClient');
          const storageService = this.dependencyContainer.get<LocalStorageService>('storageService');

          // Create auth manager instance with the proper options
          const authManager = new AuthManager({
            storageService: storageService,
            tokenKey: 'admin_auth_token',
            userKey: 'admin_user_info',
          });

          // Register it in the dependency container
          this.dependencyContainer.register('authManager', () => authManager);
          this.logger.info('AuthManager registered', 'Authentication service available');
        })
        .catch(error => {
          this.logger.error(
            'Failed to load AuthManager module',
            error instanceof Error ? error.message : String(error),
          );
        });
    } catch (error) {
      this.logger.error(
        'Failed to initialize AuthManager',
        error instanceof Error ? error.message : String(error),
      );
    }

    this.logger.info(
      'Default services registered',
      'Core services available in dependency container',
    );
  }

  /**
   * Update component initialization status
   * @param component Component name
   * @param status New status
   */
  private updateStatus(componen: string, status: InitStatus): void {
    this.initStatus.set(componen, status);

    // Emit status change event
    this.eventBus.publish('app:component:status', {
      component: componen,
      status,
      timestamp: new Date(),
    });
  }

  /**
   * Get initialization status
   * @param component Component name
   */
  public getStatus(componen: string): InitStatus {
    return this.initStatus.get(componen) || InitStatus.NOT_STARTED;
  }

  /**
   * Check if application is bootstrapped
   */
  public isBootstrapComplete(): boolean {
    return this.isBootstrapped;
  }

  /**
   * Register core services
   */
  private async registerCoreServices(): Promise<void> {
    this.updateStatus('coreServices', InitStatus.IN_PROGRESS);

    try {
      // Register basic services
      // Storage Service - use the already registered one in bootstrap.ts
      const storageService = this.dependencyContainer.get<LocalStorageService>('storageService');
      
      // DOM Service
      const domService = new BrowserDomService();
      this.dependencyContainer.register('domService', () => domService);
      
      // Network Service
      const networkServiceOptions: NetworkRequestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      };
      const networkService = new FetchNetworkService(networkServiceOptions);
      networkService.setBaseUrl(this.configManager.get('apiUrl') as string);
      this.dependencyContainer.register('networkService', () => networkService);
      
      // Logging Service
      const loggingService = new ConsoleLoggingService({
        minLevel: LoggingLevel.INFO,
        includeTimestamp: true,
        includeSource: true,
      });
      this.dependencyContainer.register('loggingService', () => loggingService);
      
      // Get config manager
      this.configManager = this.dependencyContainer.get<ConfigManager>('configManager');
      
      // Register the API client (which is already initialized)
      if (this.apiClient) {
        this.dependencyContainer.register('mainApiClient', () => this.apiClient);
      }
      
      // Create and register UI Manager
      const uiManagerOptions = {
        debug: this.configManager.get('debug') as boolean || false,
      };
      const uiManager = new UIManager(uiManagerOptions);
      this.dependencyContainer.register('uiManager', () => uiManager);
      
      // Register response and domain state viewers
      const responseContainer = document.getElementById('response-content');
      if (responseContainer) {
        const responseViewer = new ResponseViewer({
          containerId: 'response-content',
        });
        this.dependencyContainer.register('responseViewer', () => responseViewer);
      } else {
        this.logger.warn('Response content container not found');
      }
      
      const stateContainer = document.getElementById('domain-state-content');
      if (stateContainer) {
        // Get domain state manager from container
        const domainStateManager = this.dependencyContainer.get<DomainStateManager>('domainStateManager');
        
        // Create a dummy getCurrentRequest function
        const getCurrentRequest = () => null;
        
        const domainStateViewer = new DomainStateViewer({
          container: stateContainer,
          domainStateManager,
          getCurrentRequest
        });
        this.dependencyContainer.register('domainStateViewer', () => domainStateViewer);
      } else {
        this.logger.warn('Domain state content container not found');
      }
      
      // Variable extractor
      const variableContainer = document.getElementById('variable-extractor');
      if (variableContainer) {
        // Get variable manager from container
        const variableManager = this.dependencyContainer.get<VariableManager>('variableManager');
        
        const variableExtractor = new VariableExtractor({
          container: variableContainer,
          variableManager, // Add required variableManager
          debug: this.configManager.get('debug') as boolean || false
        });
        this.dependencyContainer.register('variableExtractor', () => variableExtractor);
      } else {
        this.logger.warn('Variable extractor container not found');
      }
      
      this.updateStatus('coreServices', InitStatus.COMPLETED);
      this.logger.info('Core services registered', 'All core services are available in the container');
    } catch (error) {
      this.updateStatus('coreServices', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to register core services', errorMessage);
      throw error;
    }
  }

  /**
   * Register managers
   */
  private async registerManagers(): Promise<void> {
    this.updateStatus('managers', InitStatus.IN_PROGRESS);

    try {
      // Get dependencies
      const apiClient = this.dependencyContainer.get<APIClient>('mainApiClient');
      const storageService = this.dependencyContainer.get<LocalStorageService>('storageService');
      const eventBus = this.dependencyContainer.get<EventBus>('eventBus');
      const configManager = this.dependencyContainer.get<ConfigManager>('configManager');
      const uiManager = this.dependencyContainer.get<UIManager>('uiManager');
      
      // Create and register auth manager - use proper options
      const authManager = new AuthManager({
        storageService,
        tokenKey: 'admin_auth_token',
        userKey: 'admin_user_info'
      });
      this.dependencyContainer.register('authManager', () => authManager);
      
      // Create and register endpoint manager with all required options
      const endpointOptions: EndpointManagerOptions = {
        apiClient,
        storageService,
        eventBus,
        useLocalEndpoints: true,
        supportMultipleFormats: true,
        maxRetries: 3,
        endpointsFilePath: 'data/endpoints.json',
        config: configManager,
        // Add missing required properties with default values
        retryDelay: 1000,
        dynamicEndpointsPath: '',
        useDynamicEndpoints: false,
        useStorage: true,
        endpointsUrl: ''
      };
      const endpointManager = new EndpointManager(endpointOptions);
      this.dependencyContainer.register('endpointManager', () => endpointManager);
      
      // Create and register variable manager
      const variableOptions = {
        storageService,
        eventBus,
        storageKey: 'api_variables',
        persistVariables: true,
      };
      const variableManager = new VariableManager(variableOptions);
      this.dependencyContainer.register('variableManager', () => variableManager);
      
      // Create and register domain state manager
      const domainStateOptions = {
        apiClient,
        eventBus,
        apiBasePath: configManager.get('endpoints.domainStateBase', '/api/v1/api-tester'),
      };
      const domainStateManager = new DomainStateManager(domainStateOptions);
      this.dependencyContainer.register('domainStateManager', () => domainStateManager);
      
      // Create and register history manager with proper storage type
      const historyOptions = {
        storageService,
        eventBus,
        maxEntries: configManager.get('maxHistoryItems', 50),
        persistHistory: true,
        storageKey: 'api_history',
        storageType: 'localStorage' as 'localStorage' | 'sessionStorage' | 'memory',
      };
      const historyManager = new HistoryManager(historyOptions);
      this.dependencyContainer.register('historyManager', () => historyManager);
      
      // Create and register status manager
      const statusOptions = {
        apiClient,
        eventBus,
        updateInterval: 30000,
        statusEndpoint: configManager.get('endpoints.statusEndpoint', '/api/v1/status'),
      };
      const statusManager = new StatusManager(statusOptions);
      this.dependencyContainer.register('statusManager', () => statusManager);
      
      // Create and register backend logs manager
      const logsOptions = {
        apiClient,
        eventBus,
        logsEndpoint: configManager.get('endpoints.logsEndpoint', '/api/v1/logs'),
      };
      const backendLogsManager = new BackendLogsManager(logsOptions);
      this.dependencyContainer.register('backendLogsManager', () => backendLogsManager);
      
      // Create and register user friendly flow manager
      // Use type assertion to avoid compatibility issues between interfaces
      const flowManagerOptions = {
        apiClient,
        endpointManager,
        variableManager,
        historyManager,
        uiManager,
      };
      const userFriendlyFlowManager = new UserFriendlyFlowManager(flowManagerOptions as any);
      this.dependencyContainer.register('userFriendlyFlowManager', () => userFriendlyFlowManager);
      
      this.updateStatus('managers', InitStatus.COMPLETED);
      this.logger.info('Managers registered', 'All application managers are available in the container');
    } catch (error) {
      this.updateStatus('managers', InitStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to register managers', errorMessage);
      throw error;
    }
  }

  /**
   * Register controllers
   */
  private async registerControllers(): Promise<void> {
    this.updateStatus('controllers', InitStatus.IN_PROGRESS);

    try {
      // Get dependencies
      const apiClient = this.dependencyContainer.get<APIClient>('mainApiClient');
      const endpointManager = this.dependencyContainer.get<EndpointManager>('endpointManager');
      const variableManager = this.dependencyContainer.get<VariableManager>('variableManager');
      const historyManager = this.dependencyContainer.get<HistoryManager>('historyManager');
      const uiManager = this.dependencyContainer.get<UIManager>('uiManager');
      const statusManager = this.dependencyContainer.get<StatusManager>('statusManager');
      const backendLogsManager = this.dependencyContainer.get<BackendLogsManager>('backendLogsManager');
      const domainStateManager = this.dependencyContainer.get<DomainStateManager>('domainStateManager');
      const responseViewer = this.dependencyContainer.get<ResponseViewer>('responseViewer');
      const variableExtractor = this.dependencyContainer.get<VariableExtractor>('variableExtractor');
      const authManager = this.dependencyContainer.get<AuthManager>('authManager');
      const userFriendlyFlowManager = this.dependencyContainer.get<UserFriendlyFlowManager>('userFriendlyFlowManager');
      
      // Create and register app controller
      const appController = new AppController({
        apiClient,
        endpointManager,
        variableManager,
        historyManager,
        uiManager,
        statusManager,
        backendLogsManager,
        domainStateManager,
        responseViewer,
        variableExtractor,
        authManager,
      });
      this.dependencyContainer.register('appController', () => appController);
      this.appController = appController;
      
      // Create and register flow controller
      const flowController = new FlowController({
        apiClient,
        endpointManager,
        variableManager,
        historyManager,
        uiManager,
        appController,
      });
      this.dependencyContainer.register('flowController', () => flowController);
      
      // Create and register user friendly UI
      // Use type assertion to avoid compatibility issues between interfaces
      const userFriendlyOptions = {
        apiClient,
        endpointManager,
        variableManager,
        historyManager,
        appController,
        userFriendlyFlowManager,
      };
      const userFriendlyUI = new UserFriendlyUI(userFriendlyOptions as any);
      this.dependencyContainer.register('userFriendlyUI', () => userFriendlyUI);
      
      // Create UI Controller
      // Note: This should be refactored to be an interface with multiple implementations
      this.uiController = appController; // For now, reusing AppController as UI controller
      
      this.updateStatus('controllers', InitStatus.COMPLETED);
      this.logger.info('Controllers registered', 'All application controllers are available in the container');
    } catch (error) {
      this.updateStatus('controllers', InitStatus.FAILED); 
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to register controllers', errorMessage);
      throw error;
    }
  }
  
  /**
   * Initialize the application
   */
  private async initializeApp(): Promise<void> {
    this.logger.info('Initializing application');
    
    try {
      // Initialize AppController
      const appController = this.dependencyContainer.get<AppController>('appController');
      if (appController && appController.initialize) {
        appController.initialize();
      }
      
      // Update DomainStateViewer with actual getCurrentRequest
      const domainStateViewer = this.dependencyContainer.get('domainStateViewer');
      const appController2 = this.dependencyContainer.get<AppController>('appController');
      
      if (domainStateViewer && appController2 && appController2.getCurrentRequestDetails) {
        // Use type assertion for domainStateViewer since we know its structure
        const typedViewer = domainStateViewer as { updateGetCurrentRequest?: (fn: () => any) => void };
        
        // Check if the method exists on the typed object
        if (typedViewer.updateGetCurrentRequest) {
          typedViewer.updateGetCurrentRequest(() => appController2.getCurrentRequestDetails());
        } else {
          this.logger.warn('DomainStateViewer does not have updateGetCurrentRequest method');
        }
      }
      
      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application', String(error));
      throw error;
    }
  }

  /**
   * Get the dependency container
   */
  public getDependencyContainer(): DependencyContainer {
    return this.dependencyContainer;
  }
}
