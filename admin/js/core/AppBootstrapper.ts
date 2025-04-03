// Types improved by ts-improve-types
import { Component } from '../types/component-base';
import { ConfigManager } from './ConfigManager';
import { DependencyContainer } from './DependencyContainer';
import { EventBus } from './EventBus';
import { Logger, LogLevel, ComponentLogger } from './Logger';
import { UIController } from '../types/ui-controller';
import { AppController } from '../types/app-controller';
import { APIClient, ApiErrorHandler } from '../api/api-client';
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
import { UserFriendlyFlowManager } from '../components/UserFriendlyFlowManager';
import { VariableExtractor } from '../components/VariableExtractor';
import { BrowserDomService } from '../services/DomService';
import {
  LocalStorageService,
  SessionStorageService,
  MemoryStorageService,
} from '../services/StorageService';
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
  VariableExtractorOptions,
  OpenApiServiceOptions,
  UIManagerOptions,
  AuthManagerOptions,
  FlowControllerOptions,
  ResponseControllerOptions,
  UserInterfaceControllerOptions,
  LogsViewerOptions,
} from '../types/service-options';
import { ResponseController } from '../controllers/ResponseController';
import { UserInterfaceController } from '../controllers/UserInterfaceController';
import { OpenApiService } from '../services/OpenApiService';

// Service interfaces
import { DomService } from '../services/DomService';
import { StorageService } from '../services/StorageService';
import { NetworkService } from '../services/NetworkService';
import { LoggingService } from '../services/LoggingService';

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
  private container!: HTMLElement;
  private configManager!: ConfigManager;
  private uiController: UIController | null = null;
  private appController: AppController | null = null;

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

      this.isBootstrapped = true;
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

      this.configManager = configManager;
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
      this.dependencyContainer.register('configManager', () => this.configManager);
      this.dependencyContainer.register('eventBus', () => this.eventBus);

      // Register storage services
      this.dependencyContainer.register('localStorage', () => new LocalStorageService());
      this.dependencyContainer.register('sessionStorage', () => new SessionStorageService());
      this.dependencyContainer.register('memoryStorage', () => new MemoryStorageService());

      // Register the default storage service
      this.dependencyContainer.register('storageService', () => new LocalStorageService());

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
   * Initialize API client
   */
  private async initializeApiClient(): Promise<void> {
    this.updateStatus('apiClient', InitStatus.IN_PROGRESS);

    try {
      // Create the API error handler
      const apiErrorHandler: ApiErrorHandler = {
        processApiError: (error: unknown) => {
          this.logger.error('API Error', error);
        },
        processTimeoutError: (error: unknown) => {
          this.logger.error('API Timeout Error', error);
        },
        processNetworkError: (error: unknown) => {
          this.logger.error('API Network Error', error);
        },
      };

      // Get network service for API client
      const networkService = new FetchNetworkService();
      this.dependencyContainer.register('networkService', () => networkService);

      // Create main API client
      const apiConfig = {
        apiBaseUrl: this.options.apiUrl || this.configManager.get('api.baseUrl', '/api'),
        apiVersion: this.configManager.get('api.version', 'v1'),
        useApiVersionPrefix: true,
      };

      const mainApiClient = new APIClient(apiErrorHandler, apiConfig);
      
      // Register main API client
      this.dependencyContainer.register('mainApiClient', () => mainApiClient);

      this.updateStatus('apiClient', InitStatus.COMPLETED);
      this.logger.info('API client initialized successfully');
    } catch (error) {
      this.updateStatus('apiClient', InitStatus.FAILED);
      this.logger.error('Failed to initialize API client', error);
      throw error;
    }
  }

  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    this.logger.info('Registering default services');

    // Register DomService
    this.dependencyContainer.register('domService', () => {
      return new BrowserDomService();
    });

    // Register StorageService implementations
    this.dependencyContainer.register('localStorageService', () => {
      return new LocalStorageService();
    });

    this.dependencyContainer.register('sessionStorageService', () => {
      return new SessionStorageService();
    });

    this.dependencyContainer.register('memoryStorageService', () => {
      return new MemoryStorageService();
    });

    // Register default storage service (localStorage)
    this.dependencyContainer.register('storageService', c => {
      return c.get('localStorageService');
    });

    // Register NetworkService
    this.dependencyContainer.register('networkService', () => {
      return new FetchNetworkService();
    });

    // Register LoggingService
    this.dependencyContainer.register('loggingService', () => {
      return new ConsoleLoggingService(LoggingLevel.INFO.toString());
    });

    // Register OpenAPI service
    this.dependencyContainer.register('openApiService', () => {
      // Create with required properties only to avoid type mismatches
      const networkService = new FetchNetworkService();
      return new OpenApiService({
        apiClient: this.dependencyContainer.get('mainApiClient'),
        networkService,
      });
    });

    // Register theme from config
    const theme = this.configManager.get('ui.theme', 'light');
    this.dependencyContainer.register('theme', () => theme);

    this.registerCoreServices();
    this.registerManagers();
    this.registerControllers();
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

  /**
   * Register core services
   */
  private registerCoreServices(): void {
    // Register EventBus
    this.dependencyContainer.register('eventBus', () => this.eventBus);

    // Register ConfigManager
    this.dependencyContainer.register('configManager', () => this.configManager);

    // Register Logger
    this.dependencyContainer.register('logger', () => this.logger);
  }

  /**
   * Register managers
   */
  private registerManagers(): void {
    // First register UIManager so it's available to components that need it
    // Find the main app container
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      this.logger.warn('Main app container not found, using body as container');
      this.container = document.body;
    }

    // Register UIManager first
    this.dependencyContainer.register('uiManager', c => {
      const uiOptions: UIManagerOptions = {
        container: this.container,
        eventBus: this.eventBus,
        theme: c.get('theme'),
      };
      return new UIManager(uiOptions);
    });

    // Register AuthManager
    this.dependencyContainer.register('authManager', c => {
      const authOptions: AuthManagerOptions = {
        storageService: c.get('storageService'),
        eventBus: this.eventBus,
        logger: Logger.getLogger('AuthManager'),
      };
      return new AuthManager(authOptions);
    });

    // Register EndpointManager
    this.dependencyContainer.register('endpointManager', c => {
      const endpointOptions: EndpointManagerOptions = {
        apiClient: c.get('mainApiClient'),
        storageService: c.get('storageService'),
        eventBus: this.eventBus,
        logger: Logger.getLogger('EndpointManager'),
      };
      return new EndpointManager(endpointOptions);
    });

    // Register VariableManager
    this.dependencyContainer.register('variableManager', c => {
      const variableOptions: VariableManagerOptions = {
        persistVariables: true,
        storageKey: 'admin_api_variables',
        eventBus: this.eventBus,
        logger: Logger.getLogger('VariableManager'),
      };
      return new VariableManager(variableOptions);
    });

    // Register DomainStateManager
    this.dependencyContainer.register('domainStateManager', c => {
      const domainStateOptions: DomainStateManagerOptions = {
        apiBasePath: '/api/v1/domain-state',
        eventBus: this.eventBus,
        logger: Logger.getLogger('DomainStateManager'),
      };
      return new DomainStateManager(domainStateOptions);
    });

    // Register HistoryManager
    this.dependencyContainer.register('historyManager', c => {
      const historyOptions: HistoryManagerOptions = {
        storageService: c.get('storageService'),
        eventBus: this.eventBus,
        maxItems: 100,
        logger: Logger.getLogger('HistoryManager'),
      };
      return new HistoryManager(historyOptions);
    });

    // Register StatusManager
    this.dependencyContainer.register('statusManager', c => {
      const statusOptions: StatusManagerOptions = {
        apiClient: c.get('mainApiClient'),
        eventBus: this.eventBus,
        refreshInterval: 30000,
        logger: Logger.getLogger('StatusManager'),
      };
      return new StatusManager(statusOptions);
    });

    // Register BackendLogsManager
    this.dependencyContainer.register('backendLogsManager', c => {
      const logsOptions: BackendLogsManagerOptions = {
        apiClient: c.get('mainApiClient'),
        eventBus: this.eventBus,
        logger: Logger.getLogger('BackendLogsManager'),
      };
      return new BackendLogsManager(logsOptions);
    });

    // Register UserFriendlyFlowManager if available
    this.dependencyContainer.register('userFriendlyFlowManager', c => {
      const uiManager = c.get('uiManager');
      if (!uiManager) {
        throw new Error('UIManager must be registered before UserFriendlyFlowManager');
      }
      
      // Using type assertion to avoid complex typing issues
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const options = {
        apiClient: c.get('mainApiClient') as any,
        endpointManager: c.get('endpointManager') as any,
        variableManager: c.get('variableManager') as any,
        historyManager: c.get('historyManager') as any,
        uiManager: uiManager as any,
        eventBus: this.eventBus,
        logger: Logger.getLogger('UserFriendlyFlowManager'),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return new UserFriendlyFlowManager(options);
    });
  }

  /**
   * Register controllers
   */
  private registerControllers(): void {
    // Register ResponseViewer
    this.dependencyContainer.register('responseViewer', () => {
      const options = {
        containerId: 'response-content',
      };
      return new ResponseViewer(options);
    });

    // Register DomainStateViewer if available
    this.dependencyContainer.register('domainStateViewer', c => {
      const container = document.querySelector('#domain-state-viewer');
      if (!container) {
        console.warn('No container found for DomainStateViewer');
        return {};
      }
      
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const options = {
        container: container as HTMLElement,
        domainStateManager: c.get('domainStateManager') as DomainStateManager,
        getCurrentRequest: (): Record<string, unknown> => {
          return { id: 'current-request' };
        },
        eventBus: this.eventBus,
        logger: Logger.getLogger('DomainStateViewer'),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return new DomainStateViewer(options);
    });

    // Register LogsViewer
    this.dependencyContainer.register('logsViewer', () => {
      const options = {
        logsContainerId: 'logs-container',
      };
      return new LogsViewer(options);
    });

    // Register VariableExtractor if available
    this.dependencyContainer.register('variableExtractor', c => {
      const container = document.querySelector('#variable-extractor');
      if (!container) {
        console.warn('No container found for VariableExtractor');
        return {};
      }
      
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const options = {
        container: container as HTMLElement,
        variableManager: c.get('variableManager') as any,
        eventBus: this.eventBus,
        logger: Logger.getLogger('VariableExtractor'),
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return new VariableExtractor(options);
    });

    // Get all required services for controllers
    const domService = this.dependencyContainer.get('domService');
    const storageService = this.dependencyContainer.get('storageService');
    const networkService = this.dependencyContainer.get('networkService');
    const loggingService = this.dependencyContainer.get('loggingService');

    // Register FlowController - pass required services directly
    this.dependencyContainer.register('flowController', c => {
      // Pass all required services directly
      return new FlowController({
        apiClient: c.get('mainApiClient'),
        endpointManager: c.get('endpointManager'),
        variableManager: c.get('variableManager'),
        historyManager: c.get('historyManager'),
        // Add required services by the actual constructor
        uiManager: c.get('uiManager'),
        appController: null, // This is optional
      });
    });

    // Register ResponseController
    this.dependencyContainer.register('responseController', c => {
      const options = {
        domService: c.get('domService') as DomService,
        storageService: c.get('storageService') as StorageService,
        networkService: c.get('networkService') as NetworkService,
        loggingService: c.get('loggingService') as LoggingService,
        responseViewerId: 'response-viewer',
      };
      return new ResponseController(options);
    });

    // Register UserInterfaceController
    this.dependencyContainer.register('userInterfaceController', c => {
      const options = {
        domService: c.get('domService') as DomService,
        storageService: c.get('storageService') as StorageService,
        loggingService: c.get('loggingService') as LoggingService,
        uiOptions: {
          theme: 'light',
          layout: 'default',
          animations: true,
          compactMode: false,
          defaultExpand: true,
        },
      };
      return new UserInterfaceController(options);
    });
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
        const typedViewer = domainStateViewer as {
          updateGetCurrentRequest?: (fn: () => Record<string, unknown>) => void;
        };

        // Check if the method exists on the typed object
        if (typedViewer.updateGetCurrentRequest) {
          typedViewer.updateGetCurrentRequest(() => {
            // First convert to unknown, then to Record<string, unknown>
            const requestDetails = appController2.getCurrentRequestDetails();
            return requestDetails ? (requestDetails as unknown as Record<string, unknown>) : { id: 'no-request' };
          });
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
