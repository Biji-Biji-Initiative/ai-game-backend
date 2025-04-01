/**
 * API Admin UI
 * Main entry point for the application
 */

import { AppController } from './controllers/AppController';
import { FlowController } from './controllers/FlowController';
import { Config } from './config/config';
import { ResponseViewer } from './components/ResponseViewer';
import { DomainStateViewer } from './components/DomainStateViewer';
import { UIManager } from './components/UIManagerNew';
import LogsViewer from './components/LogsViewer';
import { EndpointManager } from './modules/endpoint-manager';
import { DomainStateManager } from './modules/domain-state-manager';
import { VariableManager } from './modules/variable-manager';
import { BackendLogsManager } from './modules/backend-logs-manager';
import { StatusManager } from './modules/status-manager';
import { HistoryManager } from './modules/history-manager';
import { logger } from './utils/logger';
import { AppBootstrapper } from './core/AppBootstrapper';
import { LogLevel } from './core/Logger';

// Import types
import { 
  ResponseViewerOptions, 
  DomainStateViewerOptions,
  UIManagerOptions,
  EndpointManagerOptions,
  VariableManagerOptions,
  DomainStateManagerOptions,
  StatusManagerOptions,
  HistoryManagerOptions,
  FlowControllerOptions
} from './types/app-types';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Get the bootstrapper
    const bootstrapper = AppBootstrapper.getInstance();
    
    // Bootstrap the application with default settings
    await bootstrapper.bootstrap({
      logLevel: LogLevel.DEBUG,
      configPath: '/config/app-config.json',
      apiUrl: '/api/v1',
      registerDefaultServices: true
    });
    
    // Log bootstrap status
    console.log('Application bootstrap complete');
    
    // Application is now initialized and ready to use
    console.log('Application ready');
    
  } catch (error) {
    // Log any bootstrap errors
    console.error('Failed to start application:', error);
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', main);

// Export main function for testing or direct invocation
export { main };

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    logger.info('Initializing API Admin Interface...');
    
    // Initialize configuration
    const config = new Config();
    
    // Initialize UI components
    const responseViewerOptions: ResponseViewerOptions = {
      containerId: 'response-container',
      responseHeadersId: 'response-headers',
      responseBodyId: 'response-body',
      responseStatusId: 'response-status'
    };
    const responseViewer = new ResponseViewer(responseViewerOptions);
    
    const domainStateViewerOptions: DomainStateViewerOptions = {
      containerId: 'domain-state-container'
    };
    const domainStateViewer = new DomainStateViewer(domainStateViewerOptions as any);
    
    const uiManagerOptions: UIManagerOptions = {
      containerId: 'app',
      responseViewer,
      toastContainerId: 'toast-container',
      loadingOverlayId: 'loading-overlay',
      modalContainerId: 'modal-container'
    };
    const uiManager = new UIManager(uiManagerOptions);
    
    // Initialize modules
    const endpointManagerOptions: EndpointManagerOptions = {
      useLocalEndpoints: true,
      supportMultipleFormats: true
    };
    const endpointManager = new EndpointManager(endpointManagerOptions);
    
    const variableManagerOptions: VariableManagerOptions = {
      storageKey: 'api_variables',
      variablePrefix: '$',
      persistVariables: true,
      storageType: 'localStorage',
      maxVariables: 100
    };
    const variableManager = new VariableManager(variableManagerOptions);
    
    const domainStateManagerOptions: DomainStateManagerOptions = {
      apiClient: null,
      localStorageKey: 'domain_state',
      autoSave: true,
      diffingEnabled: true
    };
    const domainStateManager = new DomainStateManager(domainStateManagerOptions);
    
    const backendLogsManager = new BackendLogsManager({
      logsEndpoint: config.get('endpoints.logsEndpoint', '/api/v1/logs')
    });
    
    // Initialize the new LogsViewer component
    const logsViewer = new LogsViewer({
      logsContainerId: 'logs-container',
      backendLogsManager: backendLogsManager,
      maxFrontendLogs: 500,
      showFrontendLogs: true,
      showBackendLogs: true,
      enableAiLogFormatting: true,
      enableDomainEventFormatting: true,
      enableCorrelationIdFiltering: true,
      enableSearchFiltering: true,
      autoRefreshBackendLogs: true,
      refreshInterval: 30000 // 30 seconds
    });
    
    const statusManagerOptions: StatusManagerOptions = {
      updateInterval: 30000,
      statusEndpoint: config.get('endpoints.statusEndpoint', '/api/v1/status'),
      containerId: 'status-container',
      apiClient: null
    };
    const statusManager = new StatusManager(statusManagerOptions);
    
    const historyManagerOptions: HistoryManagerOptions = {
      maxEntries: config.get('maxHistoryItems', 50),
      persistHistory: true,
      storageKey: 'api_history',
      storageType: 'localStorage',
      maxItems: config.get('maxHistoryItems', 50)
    };
    const historyManager = new HistoryManager(historyManagerOptions);
    
    // Initialize controllers (AppController doesn't accept options in constructor anymore)
    const appController = new AppController();
    
    const flowControllerOptions: FlowControllerOptions = {
      endpointManager,
      uiManager,
      variableManager,
      historyManager,
      appController
    };
    const flowController = new FlowController(flowControllerOptions);
    
    // Initialize the application
    appController.initialize(config);
    flowController.initialize();
    
    // Set up tab switching
    const flowsTabBtn = document.getElementById('flows-tab-btn');
    const stateTabBtn = document.getElementById('state-tab-btn');
    const logsTabBtn = document.getElementById('logs-tab-btn');
    
    const flowsTab = document.getElementById('flows-tab');
    const stateTab = document.getElementById('state-tab');
    const logsTab = document.getElementById('logs-tab');
    
    const switchTab = (tabId: string) => {
      // Hide all tabs
      if (flowsTab) flowsTab.classList.add('hidden');
      if (stateTab) stateTab.classList.add('hidden');
      if (logsTab) logsTab.classList.add('hidden');
      
      // Reset all tab buttons
      if (flowsTabBtn) flowsTabBtn.classList.remove('bg-primary-600');
      if (stateTabBtn) stateTabBtn.classList.remove('bg-primary-600');
      if (logsTabBtn) logsTabBtn.classList.remove('bg-primary-600');
      
      // Show selected tab
      const selectedTab = document.getElementById(tabId);
      if (selectedTab) selectedTab.classList.remove('hidden');
      
      // Highlight selected tab button
      switch (tabId) {
        case 'flows-tab':
          if (flowsTabBtn) flowsTabBtn.classList.add('bg-primary-600');
          break;
        case 'state-tab':
          if (stateTabBtn) stateTabBtn.classList.add('bg-primary-600');
          break;
        case 'logs-tab':
          if (logsTabBtn) logsTabBtn.classList.add('bg-primary-600');
          // Refresh logs when tab is activated
          if (backendLogsManager) {
            backendLogsManager.fetchLogs();
          }
          break;
      }
    };
    
    // Add tab click handlers
    if (flowsTabBtn) {
      flowsTabBtn.addEventListener('click', () => switchTab('flows-tab'));
    }
    
    if (stateTabBtn) {
      stateTabBtn.addEventListener('click', () => switchTab('state-tab'));
    }
    
    if (logsTabBtn) {
      logsTabBtn.addEventListener('click', () => switchTab('logs-tab'));
    }
    
    // Add refresh logs button handler
    const refreshLogsBtn = document.getElementById('refresh-logs-btn');
    if (refreshLogsBtn) {
      refreshLogsBtn.addEventListener('click', () => {
        if (backendLogsManager) {
          backendLogsManager.fetchLogs();
        }
      });
    }
    
    // Set up error handling
    window.onerror = (message, source, lineno, colno, error) => {
      logger.error('Global error:', error || message);
      uiManager.showError('Application Error', `${message}\nLine: ${lineno}, Column: ${colno}`);
      return true;
    };
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection:', event.reason);
      uiManager.showError('Application Error', String(event.reason));
    });
    
    logger.info('API Admin Interface initialized successfully');
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