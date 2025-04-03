/**
 * basic-application.ts
 * 
 * This example demonstrates how to set up a small application using the new architecture.
 * It includes proper dependency injection, service registration, and component initialization.
 */

import { DependencyContainer } from '../core/DependencyContainer';
import { ConfigManager } from '../core/ConfigManager';
import { StorageService } from '../services/StorageService';
import { DomService } from '../services/DomService';
import { NetworkService } from '../services/NetworkService';
import { LoggingService } from '../services/LoggingService';
import { Logger, LogLevel, ComponentLogger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { APIClient, ApiErrorHandler } from '../api/api-client';

// 1. Create a custom component
interface CounterComponentOptions {
  domService: DomService;
  eventBus: EventBus;
  logger: ComponentLogger;
  container: HTMLElement;
}

class CounterComponent {
  private domService: DomService;
  private eventBus: EventBus;
  private logger: ComponentLogger;
  private container: HTMLElement;
  private count: number = 0;
  private counterElement!: HTMLElement; // Using definite assignment assertion
  
  constructor(options: CounterComponentOptions) {
    this.domService = options.domService;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.container = options.container;
    
    this.logger.debug('CounterComponent initialized');
    this.initialize();
  }
  
  private initialize(): void {
    // Create UI elements
    this.container.innerHTML = `
      <div class="counter-container">
        <h2>Counter Example</h2>
        <div class="counter-display">0</div>
        <div class="counter-controls">
          <button id="counter-increment-btn">Increment</button>
          <button id="counter-decrement-btn">Decrement</button>
          <button id="counter-reset-btn">Reset</button>
        </div>
      </div>
    `;
    
    // Get references to DOM elements
    const displayElement = this.domService.querySelector(this.container, '.counter-display');
    if (!displayElement) {
      throw new Error('Counter display element not found');
    }
    this.counterElement = displayElement as HTMLElement;

    const incrementBtn = this.container.querySelector('#counter-increment-btn');
    const decrementBtn = this.container.querySelector('#counter-decrement-btn');
    const resetBtn = this.container.querySelector('#counter-reset-btn');
    
    // Set up event listeners
    if (incrementBtn) {
      incrementBtn.addEventListener('click', () => this.increment());
    }
    if (decrementBtn) {
      decrementBtn.addEventListener('click', () => this.decrement());
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
    
    // Set up event bus subscription
    this.eventBus.subscribe('counter:external-increment', () => this.increment());
    this.eventBus.subscribe('counter:external-reset', () => this.reset());
  }
  
  private updateDisplay(): void {
    this.counterElement.textContent = this.count.toString();
    
    // Publish the updated count
    this.eventBus.publish('counter:changed', { value: this.count });
    this.logger.debug(`Counter updated to ${this.count}`);
  }
  
  public increment(): void {
    this.count++;
    this.updateDisplay();
  }
  
  public decrement(): void {
    this.count--;
    this.updateDisplay();
  }
  
  public reset(): void {
    this.count = 0;
    this.updateDisplay();
  }
}

// 2. Create a data service
interface DataServiceOptions {
  networkService: NetworkService;
  storageService: StorageService;
  configManager: ConfigManager;
  logger: ComponentLogger;
  eventBus: EventBus;
}

class DataService {
  private networkService: NetworkService;
  private storageService: StorageService;
  private configManager: ConfigManager;
  private logger: ComponentLogger;
  private eventBus: EventBus;
  
  constructor(options: DataServiceOptions) {
    this.networkService = options.networkService;
    this.storageService = options.storageService;
    this.configManager = options.configManager;
    this.logger = options.logger;
    this.eventBus = options.eventBus;
    
    this.logger.debug('DataService initialized');
    
    // Subscribe to events
    this.eventBus.subscribe('counter:changed', (data: { value: number }) => {
      this.saveCounterValue(data.value);
    });
  }
  
  private async saveCounterValue(value: number): Promise<void> {
    try {
      // Save to local storage
      this.storageService.set('counter:lastValue', value);
      this.logger.info(`Counter value ${value} saved to storage`);
      
      // Send to API if above threshold
      if (value % 5 === 0 && value !== 0) {
        const apiEndpoint = this.configManager.get('api.endpoints.counter');
        await this.networkService.post(apiEndpoint, { value });
        this.logger.info(`Counter value ${value} sent to API`);
        this.eventBus.publish('counter:milestone-reached', { value });
      }
    } catch (error) {
      this.logger.error('Failed to save counter value', error);
    }
  }
  
  public async initialize(): Promise<void> {
    try {
      // Retrieve last saved value
      const lastValue = this.storageService.get<number>('counter:lastValue', 0);
      if (lastValue && lastValue > 0) {
        this.logger.info(`Retrieved last counter value: ${lastValue}`);
        this.eventBus.publish('data:last-value-loaded', { value: lastValue });
      }
    } catch (error) {
      this.logger.error('Failed to initialize DataService', error);
    }
  }
}

// 3. App initialization
class ExampleApp {
  private container: DependencyContainer;
  private logger: ComponentLogger;
  
  constructor() {
    // Initialize dependency container
    this.container = DependencyContainer.getInstance();
    this.setupDependencies();
    
    // Get logger
    this.logger = Logger.getLogger('ExampleApp');
    this.logger.info('Example application initializing');
  }
  
  private setupDependencies(): void {
    // Register core services
    this.container.register('eventBus', () => EventBus.getInstance());
    
    this.container.register('configManager', () => {
      const config = new ConfigManager();
      config.set('api.baseUrl', 'https://api.example.com');
      config.set('api.endpoints.counter', '/api/counter');
      config.set('app.version', '1.0.0');
      return config;
    });
    
    // Register abstraction services
    this.container.register('storageService', () => {
      return {
        get: <T>(key: string, defaultValue: T): T => {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : defaultValue;
        },
        set: (key: string, value: any): void => {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } as StorageService;
    });
    
    this.container.register('domService', () => {
      return {
        querySelector: (element: HTMLElement | Document, selector: string) => 
          element.querySelector(selector),
        getElementById: (id: string) => document.getElementById(id),
        getElementsByClassName: (className: string) => document.getElementsByClassName(className),
        getElementsByTagName: (tagName: string) => document.getElementsByTagName(tagName),
        querySelectorAll: (selector: string) => document.querySelectorAll(selector),
        createElement: (tagName: string) => document.createElement(tagName),
        appendChild: (parent: HTMLElement, child: HTMLElement) => parent.appendChild(child),
        removeChild: (parent: HTMLElement, child: HTMLElement) => parent.removeChild(child),
        setAttribute: (element: HTMLElement, name: string, value: string) => element.setAttribute(name, value),
        getAttribute: (element: HTMLElement, name: string) => element.getAttribute(name)
      } as unknown as DomService;
    });
    
    this.container.register('networkService', () => {
      return {
        get: async (url: string) => fetch(url).then(r => r.json()),
        post: async (url: string, data: any) => 
          fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
          }).then(r => r.json())
      } as NetworkService;
    });
    
    this.container.register('loggingService', () => {
      return {
        setLogLevel: (level: string) => {},
        getLogLevel: () => 'info',
        trace: (message: string) => console.log(`[TRACE] ${message}`),
        debug: (message: string) => console.log(`[DEBUG] ${message}`),
        info: (message: string) => console.log(`[INFO] ${message}`),
        warn: (message: string) => console.log(`[WARN] ${message}`),
        error: (message: string) => console.log(`[ERROR] ${message}`),
        fatal: (message: string) => console.log(`[FATAL] ${message}`),
        log: (level: string, message: string) => console.log(`[${level}] ${message}`)
      } as unknown as LoggingService;
    });
    
    // Register API client
    this.container.register('apiClient', () => {
      const errorHandler: ApiErrorHandler = {
        processApiError: (error: unknown) => this.handleApiError(error),
        processNetworkError: (error: unknown) => this.handleApiError(error),
        processTimeoutError: (error: unknown) => this.handleApiError(error),
      };
      
      return new APIClient(errorHandler);
    });
    
    // Register application components
    this.container.register('dataService', (c) => {
      return new DataService({
        networkService: c.get('networkService') as NetworkService,
        storageService: c.get('storageService') as StorageService,
        configManager: c.get('configManager') as ConfigManager,
        logger: Logger.getLogger('DataService'),
        eventBus: c.get('eventBus') as EventBus,
      });
    });
    
    this.container.register('counterComponent', (c) => {
      const rootElement = document.getElementById('app-root');
      if (!rootElement) {
        throw new Error('Root element not found');
      }
      
      return new CounterComponent({
        domService: c.get('domService') as DomService,
        eventBus: c.get('eventBus') as EventBus,
        logger: Logger.getLogger('CounterComponent'),
        container: rootElement,
      });
    });
  }
  
  private handleApiError(error: Error): void {
    this.logger.error('API error occurred', error);
    const eventBus = this.container.get<EventBus>('eventBus');
    eventBus.publish('api:error', { error });
  }
  
  public async start(): Promise<void> {
    try {
      this.logger.info('Starting example application');
      
      // Initialize services
      const dataService = this.container.get<DataService>('dataService');
      await dataService.initialize();
      
      // Initialize UI components
      this.container.get('counterComponent');
      
      this.logger.info('Example application started successfully');
      
      // Simulate an external event after 3 seconds
      setTimeout(() => {
        const eventBus = this.container.get<EventBus>('eventBus');
        eventBus.publish('counter:external-increment', {});
        this.logger.info('Triggered external increment');
      }, 3000);
      
    } catch (error) {
      this.logger.error('Failed to start application', error);
    }
  }
}

// Application entry point
document.addEventListener('DOMContentLoaded', () => {
  const app = new ExampleApp();
  app.start().catch(error => {
    console.error('Application failed to start:', error);
  });
});

export { ExampleApp, CounterComponent, DataService }; 