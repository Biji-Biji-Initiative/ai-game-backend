'use strict';

import { Logger } from "./logger.js";
import { EventEmitter } from 'events';
import chalk from 'chalk';

/**
 * StartupLogger extends the existing Winston-based logging system
 * to provide enhanced visualization of the application startup process.
 */
class StartupLogger {
  /**
   * Create a new StartupLogger instance
   * @param {Object} options - Configuration options
   * @param {Logger} options.logger - Base logger instance to use
   */
  constructor(options = {}) {
    this.logger = options.logger || new Logger('startup');
    this.startupTree = {
      server: { status: 'pending', startTime: Date.now(), children: {} },
      middleware: { status: 'pending', startTime: Date.now(), children: {} },
      routes: { status: 'pending', startTime: Date.now(), children: {} },
      controllers: { status: 'pending', startTime: Date.now(), children: {} },
      services: { status: 'pending', startTime: Date.now(), children: {} },
      repositories: { status: 'pending', startTime: Date.now(), children: {} },
      domains: { status: 'pending', startTime: Date.now(), children: {} },
      di: { status: 'pending', startTime: Date.now(), children: {} } // Added DI section
    };
    
    // Add all core domains to the startup tree
    this.initializeDomains();
    
    this.events = new EventEmitter();
    this.startTime = Date.now();
    
    // Initialize middleware section with common middleware
    this.initializeMiddleware();
    
    // Initialize DI section with component types
    this.initializeDI();
    
    // Print startup header to terminal
    this.printStartupHeader();
  }
  
  /**
   * Initialize domain nodes in the startup tree
   */
  initializeDomains() {
    const domains = [
      'user', 
      'personality', 
      'challenge', 
      'evaluation', 
      'focusArea', 
      'progress', 
      'adaptive', 
      'userJourney',
      'rival',
      'badge',
      'leaderboard',
      'network'
    ];
    
    domains.forEach(domain => {
      this.startupTree.domains.children[domain] = { 
        status: 'pending', 
        startTime: Date.now(), 
        children: {} 
      };
    });
  }
  
  /**
   * Initialize middleware section with common middleware components
   */
  initializeMiddleware() {
    const middlewareComponents = [
      'helmet',
      'cors',
      'bodyParser',
      'cookieParser',
      'requestId',
      'correlationId',
      'requestLogger',
      'responseFormatter',
      'versioning',
      'authentication',
      'rateLimit',
      'cache',
      'compression',
      'static',
      'monitoring'
    ];
    
    middlewareComponents.forEach(middleware => {
      this.startupTree.middleware.children[middleware] = {
        status: 'pending',
        startTime: Date.now(),
        children: {}
      };
    });
  }
  
  /**
   * Initialize DI section with component types
   */
  initializeDI() {
    const diComponents = [
      'constants',
      'infrastructure',
      'repositories',
      'services',
      'ai',
      'coordinators',
      'controllers',
      'mappers'
    ];
    
    diComponents.forEach(component => {
      this.startupTree.di.children[component] = {
        status: 'pending',
        startTime: Date.now(),
        children: {},
        registrations: []
      };
    });
  }
  
  /**
   * Print a visually appealing startup header to the terminal
   */
  printStartupHeader() {
    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│            AI FIGHT CLUB API SERVER                │');
    console.log('└─────────────────────────────────────────────────┘\n');
    console.log(chalk.blue('🚀 Starting server...') + chalk.gray(` [${new Date().toISOString()}]`));
    console.log(chalk.blue('📊 Detailed startup visualization enabled\n'));
  }
  
  /**
   * Log a component initialization
   * @param {string} component - Component path (e.g., 'server.http', 'middleware.auth')
   * @param {string} status - Status of the component ('success', 'error', 'pending')
   * @param {Object} metadata - Additional metadata about the component
   */
  logComponentInitialization(component, status = 'success', metadata = {}) {
    if (!component) {
      console.log(chalk.yellow('⚠️ Warning: Attempted to log component initialization with undefined component'));
      return this;
    }
    
    // Create a visually appealing terminal output
    const statusEmoji = 
      status === 'success' ? '✅' : 
      status === 'error' ? '❌' : 
      status === 'pending' ? '⏳' : '❓';
    
    const componentParts = component.split('.');
    const indentation = ' '.repeat(componentParts.length * 2);
    const componentName = componentParts[componentParts.length - 1] || '';
    const parentComponent = componentParts.slice(0, -1).join('.');
    
    // Stringify metadata for console output if it's an object
    const metadataStr = metadata && typeof metadata === 'object' ? 
      Object.entries(metadata).map(([key, value]) => {
        // Handle nested objects
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
        return `${key}: ${valueStr}`;
      }).join(', ') : '';
    
    // Print to terminal with formatting
    const statusColor = 
      status === 'success' ? chalk.green : 
      status === 'error' ? chalk.red : 
      status === 'pending' ? chalk.yellow : chalk.white;
    
    console.log(
      `${indentation}${statusEmoji} ${chalk.cyan(parentComponent)}${parentComponent ? '.' : ''}${chalk.bold(componentName)}: ${statusColor(status)}` +
      (metadata.duration ? chalk.gray(` (${metadata.duration}ms)`) : '') +
      (metadataStr && !metadata.duration ? chalk.gray(` (${metadataStr})`) : '')
    );
    
    // Also log to Winston for file logging
    this.logger.info(`Component initialized: ${component}`, { 
      status,
      component,
      ...metadata
    });
    
    return this;
  }
  
  /**
   * Log a dependency injection registration
   * @param {string} module - Module name (e.g., 'services', 'controllers')
   * @param {string} component - Component name being registered
   * @param {boolean} isSingleton - Whether the component is registered as a singleton
   * @param {string} typeEmoji - Optional emoji to use for the component type
   */
  logDIRegistration(module, component, isSingleton = false, typeEmoji = null) {
    if (!module || !component) {
      console.log(chalk.yellow('⚠️ Warning: Attempted to log DI registration with undefined module or component'));
      return this;
    }
    
    // Log the registration with enhanced terminal output
    const scopeText = isSingleton ? 'singleton' : 'transient';
    
    // Use provided typeEmoji or default based on singleton status
    const emoji = typeEmoji || (isSingleton ? '🔒' : '🔄');
    
    console.log(
      `  ${emoji} ${chalk.blue('[DI]')} ${chalk.cyan(module)} registered ${chalk.bold(component)} as ${isSingleton ? chalk.green(scopeText) : chalk.yellow(scopeText)}`
    );
    
    // Also log to Winston for file logging
    this.logger.info(`DI Registration: ${module}.${component}`, {
      module,
      component,
      isSingleton,
      scope: scopeText
    });
    
    return this;
  }
  
  /**
   * Log middleware initialization
   * @param {string} middleware - Middleware name
   * @param {string} status - Status of the middleware ('success', 'error', 'pending')
   * @param {Object} metadata - Additional metadata about the middleware
   */
  logMiddlewareInitialization(middleware, status = 'success', metadata = {}) {
    if (!middleware) {
      console.log(chalk.yellow('⚠️ Warning: Attempted to log middleware initialization with undefined middleware name'));
      return this;
    }
    
    // Create a visually appealing terminal output
    const statusEmoji = 
      status === 'success' ? '✅' : 
      status === 'error' ? '❌' : 
      status === 'pending' ? '⏳' : '❓';
    
    // Stringify metadata for console output if it's an object
    const metadataStr = metadata && typeof metadata === 'object' ? 
      Object.entries(metadata).map(([key, value]) => {
        // Handle nested objects
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
        return `${key}: ${valueStr}`;
      }).join(', ') : '';
    
    // Print to terminal with formatting
    const statusColor = 
      status === 'success' ? chalk.green : 
      status === 'error' ? chalk.red : 
      status === 'pending' ? chalk.yellow : chalk.white;
    
    console.log(
      `  ${statusEmoji} ${chalk.magenta('middleware')}.${chalk.bold(middleware)}: ${statusColor(status)}` +
      (metadata.type ? chalk.gray(` (${metadata.type})`) : '') +
      (metadataStr && !metadata.type ? chalk.gray(` (${metadataStr})`) : '')
    );
    
    // Also log to Winston for file logging
    this.logger.info(`Middleware initialized: ${middleware}`, { 
      status,
      middleware,
      ...metadata
    });
    
    return this;
  }
  
  /**
   * Log route initialization
   * @param {string} route - Route path
   * @param {string} method - HTTP method
   * @param {string} status - Status of the route ('success', 'error', 'pending')
   * @param {Object} metadata - Additional metadata about the route
   */
  logRouteInitialization(route, method, status = 'success', metadata = {}) {
    if (!route || !method) {
      console.log(chalk.yellow('⚠️ Warning: Attempted to log route initialization with undefined route or method'));
      return this;
    }
    
    // Create a visually appealing terminal output
    const statusEmoji = 
      status === 'success' ? '✅' : 
      status === 'error' ? '❌' : 
      status === 'pending' ? '⏳' : '❓';
    
    // Stringify metadata for console output if it's an object
    const metadataStr = metadata && typeof metadata === 'object' ? 
      Object.entries(metadata).map(([key, value]) => {
        // Handle nested objects
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
        return `${key}: ${valueStr}`;
      }).join(', ') : '';
    
    // Print to terminal with formatting
    const statusColor = 
      status === 'success' ? chalk.green : 
      status === 'error' ? chalk.red : 
      status === 'pending' ? chalk.yellow : chalk.white;
    
    // Color-code HTTP methods
    const methodColor = 
      method.toUpperCase() === 'GET' ? chalk.green : 
      method.toUpperCase() === 'POST' ? chalk.yellow : 
      method.toUpperCase() === 'PUT' ? chalk.blue : 
      method.toUpperCase() === 'DELETE' ? chalk.red : 
      method.toUpperCase() === 'PATCH' ? chalk.magenta : chalk.white;
    
    console.log(
      `  ${statusEmoji} ${chalk.cyan('routes')}.${methodColor(method.toUpperCase())}:${chalk.bold(route)}: ${statusColor(status)}` +
      (metadataStr ? chalk.gray(` (${metadataStr})`) : '')
    );
    
    // Also log to Winston for file logging
    this.logger.info(`Route initialized: ${method.toUpperCase()} ${route}`, { 
      status,
      route,
      method,
      ...metadata
    });
    
    return this;
  }
  
  /**
   * Get the current startup tree
   * @returns {Object} The current startup tree
   */
  getStartupTree() {
    return this.startupTree;
  }
  
  /**
   * Get a formatted string representation of the startup tree
   * @returns {string} Formatted startup tree
   */
  getFormattedTree() {
    return "Startup tree available in logs";
  }
  
  /**
   * Log the current startup progress
   */
  logStartupProgress() {
    this.logger.info('Startup progress:', { 
      elapsedTime: Date.now() - this.startTime
    });
    
    return this;
  }
  
  /**
   * Mark the startup as complete
   * @param {string} status - Final status ('success' or 'error')
   * @param {Object} metadata - Additional metadata
   */
  markStartupComplete(status = 'success', metadata = {}) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const logLevel = status === 'error' ? 'error' : 'info';
    this.logger[logLevel](`Startup ${status === 'success' ? 'completed' : 'failed'}`, {
      status,
      duration,
      ...metadata
    });
    
    // Print a visually appealing startup completion message
    const statusText = status === 'success' ? 'COMPLETED SUCCESSFULLY' : 'FAILED';
    
    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│                SERVER STARTUP                     │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log(`  ${status === 'success' ? chalk.green(statusText) : chalk.red(statusText)} in ${chalk.bold(duration)}ms`);
    console.log(`  ${chalk.blue('Server is now running and ready to accept connections')}`);
    console.log(`  Started at: ${chalk.gray(new Date(this.startTime).toISOString())}`);
    console.log(`  Completed at: ${chalk.gray(new Date(endTime).toISOString())}\n`);
    
    this.events.emit('startup:complete', status, duration, metadata);
    
    return this;
  }
  
  /**
   * Register a listener for startup events
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  on(event, listener) {
    this.events.on(event, listener);
    return this;
  }
  
  /**
   * Create a child logger for a specific component
   * @param {string} component - Component name
   * @returns {Object} Component logger
   */
  forComponent(component) {
    return {
      success: (metadata = {}) => this.logComponentInitialization(component, 'success', metadata),
      error: (metadata = {}) => this.logComponentInitialization(component, 'error', metadata),
      pending: (metadata = {}) => this.logComponentInitialization(component, 'pending', metadata)
    };
  }
}

// Create a singleton instance
const startupLogger = new StartupLogger();

export { StartupLogger, startupLogger };
export default startupLogger;
