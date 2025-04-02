// Types improved by ts-improve-types
/**
 * API Admin UI
 * Main entry point for the application
 */

import { AppBootstrapper } from './core/AppBootstrapper';
import { LogLevel } from './core/Logger';
import { logger } from './utils/logger';

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
      registerDefaultServices: true,
    });

    // Log bootstrap status
    logger.info('Application bootstrap complete');
    logger.info('Application ready');
  } catch (error) {
    // Log any bootstrap errors
    logger.error('Failed to start application:', error);

    // Display error in UI
    const appContainer = document.getElementById('app');
    if (appContainer) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      appContainer.innerHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4">
          <h2 class="font-bold">Application Initialization Error</h2>
          <p class="whitespace-pre-wrap">${errorMessage}</p>
        </div>
      `;
    }
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', main);

// Export main function for testing or direct invocation
export { main };

// Show loading indicator
const showLoading = (message = 'Loading...') => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingMessage = document.getElementById('loading-message');

  if (loadingIndicator && loadingMessage) {
    loadingMessage.textContent = message;
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.classList.add('flex');
  }
};

// Hide loading indicator
const hideLoading = () => {
  const loadingIndicator = document.getElementById('loading-indicator');

  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
    loadingIndicator.classList.remove('flex');
  }
};

// Show status modal
const showStatusModal = () => {
  const statusModal = document.getElementById('status-modal');

  if (statusModal) {
    statusModal.classList.remove('hidden');
    statusModal.classList.add('flex');
  }
};

// Hide status modal
const hideStatusModal = () => {
  const statusModal = document.getElementById('status-modal');

  if (statusModal) {
    statusModal.classList.add('hidden');
    statusModal.classList.remove('flex');
  }
};
