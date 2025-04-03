/**
 * Router
 * 
 * Handles client-side navigation for Single Page Applications
 */

import { Service } from './ServiceManager';
import { EventBus } from './EventBus';
import { logger } from '../utils/logger';

/**
 * Route configuration
 */
export interface RouteConfig {
  /**
   * Path pattern (can include parameters using :param syntax)
   */
  path: string;
  
  /**
   * Route title for page title
   */
  title?: string;
  
  /**
   * Whether this route requires authentication
   */
  requiresAuth?: boolean;
  
  /**
   * Required roles for accessing this route
   */
  roles?: string[];
  
  /**
   * Required permissions for accessing this route
   */
  permissions?: string[];
  
  /**
   * Component render function
   */
  component?: () => HTMLElement | Promise<HTMLElement>;
  
  /**
   * Handler function for the route
   */
  handler?: (params: RouteParams) => void | Promise<void>;
  
  /**
   * Container element ID where the route component should be rendered
   */
  containerId?: string;
  
  /**
   * Lazy load module path
   */
  lazyModule?: string;
  
  /**
   * Additional metadata for the route
   */
  meta?: Record<string, unknown>;
}

/**
 * Route parameters
 */
export interface RouteParams {
  /**
   * Route parameters from path
   */
  [key: string]: string;
}

/**
 * Route match result
 */
export interface RouteMatch {
  /**
   * Route configuration
   */
  route: RouteConfig;
  
  /**
   * Extracted parameters
   */
  params: RouteParams;
}

/**
 * Navigation options
 */
export interface NavigateOptions {
  /**
   * Replace current history entry instead of creating a new one
   */
  replace?: boolean;
  
  /**
   * State object to pass to history
   */
  state?: Record<string, unknown>;
  
  /**
   * Query parameters
   */
  query?: Record<string, string>;
  
  /**
   * Scroll to top after navigation
   */
  scrollToTop?: boolean;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  /**
   * Base path for all routes
   */
  base?: string;
  
  /**
   * Default route (path to navigate when no route matches)
   */
  defaultRoute?: string;
  
  /**
   * Route to navigate when authentication is required but user is not authenticated
   */
  authRoute?: string;
  
  /**
   * Default container ID for rendering components
   */
  defaultContainerId?: string;
  
  /**
   * Use hash-based routing (#/path) instead of history API
   */
  useHash?: boolean;
  
  /**
   * Automatically handle link clicks for navigation
   */
  handleLinks?: boolean;
}

/**
 * Router for handling client-side navigation
 */
export class Router implements Service {
  private routes: RouteConfig[];
  private currentRoute: RouteMatch | null;
  private eventBus: EventBus;
  private config: RouterConfig;
  private initialized: boolean;
  private authCallback?: (route: RouteConfig) => boolean | Promise<boolean>;
  
  /**
   * Constructor
   * @param config Router configuration
   */
  constructor(config: RouterConfig = {}) {
    this.routes = [];
    this.currentRoute = null;
    this.eventBus = EventBus.getInstance();
    this.initialized = false;
    
    // Set default configuration
    this.config = {
      base: '',
      defaultRoute: '/',
      authRoute: '/login',
      defaultContainerId: 'app',
      useHash: false,
      handleLinks: true,
      ...config,
    };
  }
  
  /**
   * Initialize the router
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Setup event listeners
    this.setupEvents();
    
    // Initial route handling
    await this.handleInitialRoute();
    
    this.initialized = true;
    logger.debug('Router initialized');
  }
  
  /**
   * Register a route
   * @param route Route configuration
   */
  public register(route: RouteConfig): void {
    this.routes.push(route);
    logger.debug(`Registered route: ${route.path}`);
  }
  
  /**
   * Register multiple routes
   * @param routes Array of route configurations
   */
  public registerRoutes(routes: RouteConfig[]): void {
    routes.forEach(route => this.register(route));
  }
  
  /**
   * Handle initial route
   */
  private async handleInitialRoute(): Promise<void> {
    const path = this.getCurrentPath();
    await this.navigateTo(path, { replace: true });
  }
  
  /**
   * Set authentication callback
   * @param callback Function to check if user is authorized for a route
   */
  public setAuthCallback(callback: (route: RouteConfig) => boolean | Promise<boolean>): void {
    this.authCallback = callback;
    logger.debug('Auth callback set for router');
  }
  
  /**
   * Setup router events
   */
  private setupEvents(): void {
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', async () => {
      const path = this.getCurrentPath();
      await this.handleRoute(path);
    });
    
    // Handle link clicks if enabled
    if (this.config.handleLinks) {
      document.addEventListener('click', this.handleLinkClick.bind(this));
    }
  }
  
  /**
   * Handle link click for navigation
   */
  private handleLinkClick(event: MouseEvent): void {
    // Find closest anchor element
    const link = (event.target as HTMLElement).closest('a');
    if (!link) return;
    
    // Skip if external link or modified click
    if (
      link.target === '_blank' || 
      link.hasAttribute('download') ||
      link.hasAttribute('rel') && link.getAttribute('rel')?.includes('external') ||
      event.ctrlKey || 
      event.metaKey || 
      event.altKey || 
      event.shiftKey
    ) {
      return;
    }
    
    // Get the href
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) {
      return;
    }
    
    // Check if this link should be handled by the router
    if (link.hasAttribute('data-no-router')) {
      return;
    }
    
    // Handle the navigation
    event.preventDefault();
    this.navigateTo(href, {
      scrollToTop: !link.hasAttribute('data-no-scroll'),
    }).catch(error => {
      logger.error('Navigation error:', error);
    });
  }
  
  /**
   * Get the current path from URL
   */
  private getCurrentPath(): string {
    if (this.config.useHash) {
      // Hash-based routing
      const hash = window.location.hash.substring(1) || '/';
      return hash.startsWith('/') ? hash : `/${hash}`;
    } else {
      // History API based routing
      const base = this.config.base || '';
      const path = window.location.pathname;
      
      if (base && path.startsWith(base)) {
        return path.substring(base.length) || '/';
      }
      
      return path || '/';
    }
  }
  
  /**
   * Navigate to a path
   * @param path Target path
   * @param options Navigation options
   */
  public async navigateTo(path: string, options: NavigateOptions = {}): Promise<boolean> {
    const { replace = false, state = {}, scrollToTop = true } = options;
    
    // Emit before navigation event
    this.eventBus.emit('router:beforeNavigate', { 
      path, 
      from: this.currentRoute?.route.path, 
      options,
    });
    
    try {
      // Handle the route
      const success = await this.handleRoute(path, options);
      
      if (success) {
        // Update browser history
        const url = this.createUrl(path, options.query);
        
        if (this.config.useHash) {
          // Update hash
          const hashPath = path.startsWith('/') ? path.substring(1) : path;
          window.location.hash = hashPath;
        } else {
          // Update history using History API
          if (replace) {
            window.history.replaceState(state, '', url);
          } else {
            window.history.pushState(state, '', url);
          }
        }
        
        // Scroll to top if needed
        if (scrollToTop) {
          window.scrollTo(0, 0);
        }
        
        // Emit after navigation event
        this.eventBus.emit('router:afterNavigate', { 
          path, 
          route: this.currentRoute?.route,
          params: this.currentRoute?.params,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Navigation error to ${path}:`, error);
      this.eventBus.emit('router:error', { path, error });
      return false;
    }
  }
  
  /**
   * Create a URL from path and query parameters
   */
  private createUrl(path: string, query?: Record<string, string>): string {
    let url = path;
    
    // Add base path if not using hash routing
    if (!this.config.useHash && this.config.base) {
      const basePath = this.config.base.endsWith('/') 
        ? this.config.base.slice(0, -1) 
        : this.config.base;
        
      url = `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
    }
    
    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const queryParams = new URLSearchParams();
      
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    return url;
  }
  
  /**
   * Handle routing to a specific path
   * @param path Target path
   * @param options Navigation options
   */
  private async handleRoute(path: string, options: NavigateOptions = {}): Promise<boolean> {
    // Find matching route
    const match = this.findMatchingRoute(path);
    
    if (!match) {
      logger.warn(`No route found for path: ${path}`);
      
      // Navigate to default route if provided
      if (this.config.defaultRoute && path !== this.config.defaultRoute) {
        return this.navigateTo(this.config.defaultRoute, { ...options, replace: true });
      }
      
      this.eventBus.emit('router:notFound', { path });
      return false;
    }
    
    const { route, params } = match;
    
    // Check authentication if needed
    if (route.requiresAuth && this.authCallback) {
      const isAuthorized = await this.authCallback(route);
      
      if (!isAuthorized) {
        logger.warn(`Not authorized to access route: ${path}`);
        
        // Redirect to auth route if provided
        if (this.config.authRoute && path !== this.config.authRoute) {
          return this.navigateTo(this.config.authRoute, {
            ...options,
            replace: true,
            query: { redirect: path },
          });
        }
        
        this.eventBus.emit('router:unauthorized', { path, route });
        return false;
      }
    }
    
    // Update current route
    this.currentRoute = match;
    
    // Update page title if provided
    if (route.title) {
      document.title = route.title;
    }
    
    // Execute route handler if provided
    if (route.handler) {
      await route.handler(params);
    }
    
    // Render component if provided
    if (route.component) {
      const container = document.getElementById(route.containerId || this.config.defaultContainerId || 'app');
      
      if (container) {
        const component = await route.component();
        container.innerHTML = '';
        container.appendChild(component);
      } else {
        logger.warn(`Container not found: ${route.containerId || this.config.defaultContainerId}`);
      }
    }
    
    // Handle lazy loading if specified
    if (route.lazyModule) {
      try {
        await this.loadModule(route.lazyModule);
      } catch (error) {
        logger.error(`Failed to load module: ${route.lazyModule}`, error);
        this.eventBus.emit('router:error', { path, error });
        return false;
      }
    }
    
    // Emit route changed event
    this.eventBus.emit('router:changed', { 
      path, 
      route, 
      params,
    });
    
    return true;
  }
  
  /**
   * Find a route matching the given path
   * @param path URL path
   */
  private findMatchingRoute(path: string): RouteMatch | null {
    for (const route of this.routes) {
      const match = this.matchRoute(route.path, path);
      if (match) {
        return { route, params: match };
      }
    }
    
    return null;
  }
  
  /**
   * Match a route pattern against a path
   * @param pattern Route pattern
   * @param path URL path
   */
  private matchRoute(pattern: string, path: string): RouteParams | null {
    // Normalize paths
    const normalizedPattern = pattern.endsWith('/') ? pattern : `${pattern}/`;
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    
    // Create regex from pattern
    const regexParts = normalizedPattern
      .split('/')
      .map(part => {
        if (part.startsWith(':')) {
          // This is a parameter
          const paramName = part.slice(1);
          return '([^/]+)';
        } else if (part === '*') {
          // Wildcard
          return '.*';
        } else {
          // Regular path component
          return part;
        }
      })
      .join('\\/');
    
    const regex = new RegExp(`^${regexParts}$`);
    const match = normalizedPath.match(regex);
    
    if (!match) {
      return null;
    }
    
    // Extract parameters
    const params: RouteParams = {};
    const paramNames = normalizedPattern
      .split('/')
      .filter(part => part.startsWith(':'))
      .map(part => part.slice(1));
    
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    
    return params;
  }
  
  /**
   * Load a module dynamically
   * @param modulePath Path to the module to load
   */
  private async loadModule(modulePath: string): Promise<unknown> {
    return import(/* webpackChunkName: "[request]" */ `${modulePath}`);
  }
  
  /**
   * Navigate back in history
   */
  public back(): void {
    window.history.back();
  }
  
  /**
   * Navigate forward in history
   */
  public forward(): void {
    window.history.forward();
  }
  
  /**
   * Get the current route
   */
  public getCurrentRoute(): RouteMatch | null {
    return this.currentRoute;
  }
  
  /**
   * Check if a path is active
   * @param path Path to check
   * @param exact Whether the match should be exact
   */
  public isActive(path: string, exact = false): boolean {
    const currentPath = this.getCurrentPath();
    
    if (exact) {
      return path === currentPath;
    }
    
    return currentPath.startsWith(path);
  }
  
  /**
   * Create a link element with router handling
   * @param path Target path
   * @param text Link text
   * @param options Additional options
   */
  public createLink(
    path: string, 
    text: string, 
    options: { className?: string; id?: string; attrs?: Record<string, string> } = {},
  ): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = path;
    link.textContent = text;
    
    if (options.className) {
      link.className = options.className;
    }
    
    if (options.id) {
      link.id = options.id;
    }
    
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => {
        link.setAttribute(key, value);
      });
    }
    
    return link;
  }
  
  /**
   * Dispose of the router
   */
  public async dispose(): Promise<void> {
    if (this.config.handleLinks) {
      document.removeEventListener('click', this.handleLinkClick.bind(this));
    }
    
    this.routes = [];
    this.currentRoute = null;
    this.initialized = false;
    
    logger.debug('Router disposed');
  }
} 