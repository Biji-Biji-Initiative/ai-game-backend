import { Component } from '../types/component-base';

/**
 * Configuration option types for strong typing
 */
export interface ConfigOptions {
  // Application settings
  appName?: string;
  debug?: boolean;
  version?: string;
  
  // API settings
  apiUrl?: string;
  apiKey?: string;
  useLocalEndpoints?: boolean;
  
  // UI settings
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  
  // Feature flags
  enableHistory?: boolean;
  enableVariables?: boolean;
  enableDomainState?: boolean;
  
  // Storage settings
  storagePrefix?: string;
  persistHistory?: boolean;
  historyMaxItems?: number;
  
  // Advanced settings
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  timeout?: number;
  
  // Any additional configuration
  [key: string]: any;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ConfigOptions = {
  appName: 'API Client',
  debug: false,
  version: '1.0.0',
  apiUrl: '/api',
  useLocalEndpoints: true,
  theme: 'light',
  language: 'en',
  toastPosition: 'top-right',
  enableHistory: true,
  enableVariables: true,
  enableDomainState: true,
  storagePrefix: 'api_client_',
  persistHistory: true,
  historyMaxItems: 50,
  logLevel: 'error',
  timeout: 30000,
};

/**
 * Configuration manager for application settings
 */
export class ConfigManager implements Component {
  private static instance: ConfigManager;
  private config: ConfigOptions;
  private initialized: boolean = false;
  
  /**
   * Get the singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Private constructor to prevent direct creation
   */
  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }
  
  /**
   * Initialize with configuration
   * @param options Configuration options
   */
  public initialize(options: ConfigOptions = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.initialized = true;
    
    // Apply theme if specified
    if (this.config.theme && this.config.theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', this.config.theme);
    }
    
    if (this.config.debug) {
      console.debug('ConfigManager initialized with:', this.config);
    }
  }
  
  /**
   * Get all configuration
   * @returns The complete configuration object
   */
  public getAll(): ConfigOptions {
    return { ...this.config };
  }
  
  /**
   * Get a specific configuration value
   * @param key Configuration key
   * @param defaultValue Default value if not found
   * @returns The configuration value or default
   */
  public get<T>(key: string, defaultValue?: T): T {
    const value = this.config[key];
    return (value !== undefined ? value : defaultValue) as T;
  }
  
  /**
   * Set a configuration value
   * @param key Configuration key
   * @param value New value
   */
  public set<T>(key: string, value: T): void {
    this.config[key] = value;
    
    // Handle special case for theme changes
    if (key === 'theme' && typeof value === 'string') {
      document.documentElement.setAttribute('data-theme', value);
    }
    
    if (this.config.debug) {
      console.debug(`ConfigManager set ${key}:`, value);
    }
  }
  
  /**
   * Check if a configuration value exists
   * @param key Configuration key
   * @returns True if the key exists
   */
  public has(key: string): boolean {
    return key in this.config;
  }
  
  /**
   * Update multiple configuration values
   * @param options Configuration options to update
   */
  public update(options: ConfigOptions): void {
    Object.assign(this.config, options);
    
    // Handle theme change if included
    if (options.theme) {
      document.documentElement.setAttribute('data-theme', options.theme);
    }
    
    if (this.config.debug) {
      console.debug('ConfigManager updated with:', options);
    }
  }
  
  /**
   * Reset configuration to default values
   */
  public reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    
    // Reset theme
    document.documentElement.setAttribute('data-theme', DEFAULT_CONFIG.theme || 'light');
    
    if (this.config.debug) {
      console.debug('ConfigManager reset to defaults');
    }
  }
  
  /**
   * Load configuration from a JSON file path
   * @param path Path to the configuration JSON file
   * @returns Promise that resolves when configuration is loaded
   */
  public async loadConfig(path: string): Promise<void> {
    try {
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`Failed to load config from ${path}: ${response.status} ${response.statusText}`);
      }
      
      const config = await response.json();
      
      // Merge with current config
      this.update(config);
      
      if (this.config.debug) {
        console.debug(`ConfigManager loaded config from ${path}:`, config);
      }
    } catch (error) {
      console.error(`Error loading config from ${path}:`, error);
      throw error;
    }
  }
} 