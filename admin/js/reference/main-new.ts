/**
 * API Admin UI - Legacy Bridge
 * 
 * This file serves as a temporary bridge between the old monolithic codebase
 * and the new modular TypeScript architecture. It will be eventually removed
 * once all functionality has been migrated.
 */

// Import core modules and components
import { AppController } from './controllers/AppController';
import { FlowController } from './controllers/FlowController';
import { Config } from './config/config';
import { EndpointManager } from './modules/endpoint-manager';
import { BackendLogsManager } from './modules/backend-logs-manager';
import { VariableManager } from './modules/variable-manager';
import { StatusManager } from './modules/status-manager';
import { HistoryManager } from './modules/history-manager';
import { DomainStateManager } from './modules/domain-state-manager';
import { DomainEventManager } from './modules/domain-event-manager';
import { FlowManager } from './modules/flow-manager';
import { AuthManager } from './modules/auth-manager';

// Import UI components
import { ResponseViewer } from './components/ResponseViewer';
import { VariableExtractor } from './components/VariableExtractor';
import { DomainStateViewer } from './components/DomainStateViewer';
import { UIManager as NewUIManager } from './components/UIManager';
import { UIManager as LegacyUIManager } from './ui/UIManagerAdapter';

// Import utilities
import { logger } from './utils/logger';
import { FormUtils } from './utils/form-utils';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    logger.info('Initializing API Admin Interface...');
    
    // Initialize configuration
    const config = new Config();
    
    // Initialize UI components
    const responseViewer = new ResponseViewer({
      containerId: 'response-container'
    });
    
    const domainStateViewer = new DomainStateViewer({
      containerId: 'domain-state-container'
    });
    
    // Create new UI manager
    const newUIManager = new NewUIManager({
      containerId: 'app',
      responseViewer
    });
    
    // Create legacy UI manager adapter for backwards compatibility
    const uiManager = new LegacyUIManager(newUIManager);
    
    // Initialize auth manager
    const authManager = new AuthManager({
      storageKey: 'api_auth_token',
      onAuthStateChanged: (isAuthenticated) => {
        logger.info(`Auth state changed: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
      }
    });
    
    // Initialize modules
    const endpointManager = new EndpointManager();
    
    const variableManager = new VariableManager({
      storageKey: 'api_variables'
    });
    
    const domainEventManager = new DomainEventManager({
      onEventReceived: (event) => {
        logger.debug('Domain event received:', event);
      }
    });
    
    const domainStateManager = new DomainStateManager({
      viewer: domainStateViewer
    });
    
    const backendLogsManager = new BackendLogsManager({
      logsEndpoint: config.get('endpoints.logsEndpoint', '/api/v1/logs')
    });
    
    // Set up backend logs processing
    (backendLogsManager as any).on('logsReceived', (logs: any[]) => {
      // Process domain events from logs
      domainEventManager.handleBackendLogs(logs);
    });
    
    const statusManager = new StatusManager({
      healthEndpoint: config.get('endpoints.statusEndpoint', '/api/v1/status')
    });
    
    const historyManager = new HistoryManager({
      maxEntries: config.get('maxHistoryItems', 50)
    });
    
    // Initialize flow manager
    const flowManager = new FlowManager({
      variableManager,
      endpointManager,
      storageKey: 'api_flows',
      onFlowsChanged: (flows) => {
        logger.debug(`Flows updated: ${flows.length} flows available`);
      },
      onStepExecuted: (step, response) => {
        // Show response in viewer
        (responseViewer as any).showResponse(response);
      }
    });
    
    // Initialize controllers
    const appController = new AppController();
    
    const flowController = new FlowController({
      endpointManager,
      uiManager: uiManager as any, // Type cast to avoid type conflict
      variableManager,
      historyManager
    });
    
    // Initialize the application - using the AppController initialization method
    // which accepts the appropriate configuration
    appController.initialize(config);
    flowController.initialize();
    
    // Set up error handling
    window.onerror = (message, source, lineno, colno, error) => {
      logger.error('Global error:', error || message);
      newUIManager.showError('Application Error', `${message}\nLine: ${lineno}, Column: ${colno}`);
      return true;
    };
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection:', event.reason);
      newUIManager.showError('Promise Error', String(event.reason));
    });
    
    logger.info('API Admin Interface initialized successfully');
    
    // Export key modules to window for debugging and legacy compatibility
    if (process.env.NODE_ENV !== 'production') {
      (window as any).app = {
        config,
        uiManager: newUIManager,
        legacyUIManager: uiManager,
        endpointManager,
        variableManager,
        domainEventManager,
        domainStateManager,
        backendLogsManager,
        statusManager,
        historyManager,
        flowManager,
        authManager,
        appController,
        flowController,
        formUtils: FormUtils
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle initialization errors
    console.error('Error initializing application:', error);
    
    // Display error in UI
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4">
          <h2 class="font-bold">Application Initialization Error</h2>
          <p class="whitespace-pre-wrap">${errorMessage}</p>
        </div>
      `;
    }
  }
}); 