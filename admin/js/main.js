/**
 * Main entry point for Admin UI
 */

import { StatusManager } from './modules/status-manager';
import { DomainStateManager } from './modules/domain-state-manager';
import { DomainStateViewer } from './components/DomainStateViewer';
import { logger } from './utils/logger';

// Initialize components when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  initUI();
});

/**
 * Initialize UI components
 */
function initUI() {
  try {
    // Initialize theme
    initTheme();
    
    // Initialize tab navigation
    initTabs();
    
    // Initialize API status manager
    initStatusManager();
    
    // Initialize domain state manager
    initDomainStateManager();
    
    logger.info('Admin UI initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize UI:', errorMessage);
  }
}

/**
 * Initialize theme (light/dark mode)
 */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('admin_ui_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply theme
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
  }
  
  // Theme toggle
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      
      // Save preference
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('admin_ui_theme', isDark ? 'dark' : 'light');
    });
  }
  
  logger.debug('Theme initialized');
}

/**
 * Initialize tab navigation
 */
function initTabs() {
  const tabButtons = [
    document.getElementById('flows-tab-btn'),
    document.getElementById('state-tab-btn'),
    document.getElementById('logs-tab-btn')
  ];
  
  const tabContents = [
    document.getElementById('flows-tab'),
    document.getElementById('state-tab'),
    document.getElementById('logs-tab')
  ];
  
  // Set up tab switching
  tabButtons.forEach((button, index) => {
    if (button) {
      button.addEventListener('click', () => {
        // Update active tab button
        tabButtons.forEach(btn => {
          if (btn) {
            btn.classList.remove('bg-primary-600');
          }
        });
        button.classList.add('bg-primary-600');
        
        // Show selected tab content
        tabContents.forEach(content => {
          if (content) {
            content.classList.add('hidden');
          }
        });
        
        if (tabContents[index]) {
          tabContents[index].classList.remove('hidden');
        }
      });
    }
  });
  
  logger.debug('Tab navigation initialized');
}

/**
 * Initialize StatusManager
 */
function initStatusManager() {
  const statusManager = new StatusManager({
    statusEndpoint: '/api/health',
    containerId: 'api-status',
    updateInterval: 10000 // Check every 10 seconds
  });
  
  statusManager.start();
  
  // Store in window for access from console (for debugging)
  window.adminUI = window.adminUI || {};
  window.adminUI.statusManager = statusManager;
  
  logger.debug('Status manager initialized');
}

/**
 * Initialize DomainStateManager
 */
function initDomainStateManager() {
  // Create state viewer
  const stateViewer = new DomainStateViewer({
    containerId: 'domain-state-container'
  });
  
  stateViewer.initialize();
  
  // Create state manager
  const stateManager = new DomainStateManager({
    viewer: stateViewer,
    storageKey: 'domain_state',
    stateEndpoint: '/api/v1/state'
  });
  
  stateManager.initialize();
  
  // Set up refresh button listener
  document.addEventListener('domainstate:refresh', () => {
    stateManager.fetchStateFromApi()
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to fetch domain state:', errorMessage);
      });
  });
  
  // Store in window for access from console (for debugging)
  window.adminUI = window.adminUI || {};
  window.adminUI.stateManager = stateManager;
  
  logger.debug('Domain state manager initialized');
  
  // Initial fetch of state
  setTimeout(() => {
    stateManager.fetchStateFromApi()
      .catch(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to fetch initial domain state:', errorMessage);
      });
  }, 1000);
} 