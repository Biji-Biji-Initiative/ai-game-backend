// Types improved by ts-improve-types
import { Component } from '../types/component-base';
import { ComponentLogger, Logger } from './Logger';

/**
 * Configuration options
 */
export interface ConfigOptions {
  apiBasePath?: string;
  debug?: boolean;
  theme?: string;
  endpointsUrl?: string;
  useLocalEndpoints?: boolean;
  useOfflineMode?: boolean;
  useStorage?: boolean;
  persistVariables?: boolean;
  animationsEnabled?: boolean;
  showLogsPanel?: boolean;
  [key: string]: unknown;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ConfigOptions = {
  apiBasePath: '/api',
  debug: false,
  theme: 'light',
  endpointsUrl: '/endpoints.json',
  useLocalEndpoints: true,
  useOfflineMode: false,
  useStorage: true,
  persistVariables: true,
  animationsEnabled: true,
  showLogsPanel: false,
};

/**
 * Configuration Manager
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: ConfigOptions = {};
  private listeners: Array<(config: ConfigOptions) => void> = [];
  private logger: ComponentLogger;

  /**
   * Get the singleton instance
   * @returns The instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Private constructor
   */
  private constructor() {
    this.logger = Logger.getLogger('ConfigManager');
    this.loadDefaultConfig();
  }

  /**
   * Load the default configuration
   */
  private loadDefaultConfig(): void {
    this.config = { ...DEFAULT_CONFIG };

    // Try to load from localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedConfig = window.localStorage.getItem('api_tester_config');
        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig);
          this.config = { ...this.config, ...parsedConfig };
          this.logger.debug('Loaded config from localStorage');
        }
      } catch (error) {
        this.logger.error('Error loading config from localStorage:', error);
      }
    }
  }

  /**
   * Get the current configuration
   * @returns The configuration
   */
  public getConfig(): ConfigOptions {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   * @param key The configuration key
   * @param defaultValue Default value if the key doesn't exist
   * @returns The configuration value
   */
  public get<T>(key: string, defaultValue?: T): T {
    return (this.config[key] as T) ?? (defaultValue as T);
  }

  /**
   * Set a configuration value
   * @param key The configuration key
   * @param value The value to set
   */
  public set<T>(key: string, value: T): void {
    this.config[key] = value;
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Update configuration with new values
   * @param option New configuration
   */
  public update(option: ConfigOptions): void {
    Object.assign(this.config, option);
    this.saveConfig();

    // Apply theme if it changed
    if (option.theme) {
      document.documentElement.setAttribute('data-theme', option.theme);
    }

    // Notify listeners of the update
    this.notifyListeners();
    if (this.config.debug) {
      this.logger.debug('ConfigManager updated with:', option);
    }
  }

  /**
   * Register a listener for configuration changes
   * @param listener Callback function
   */
  public onChange(listener: (config: ConfigOptions) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   * @param listener Callback function to remove
   */
  public offChange(listener: (config: ConfigOptions) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Load configuration from a URL
   * @param path URL path
   */
  public async loadConfig(path: string): Promise<void> {
    try {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(
          `Failed to load config from ${path}: ${response.status} ${response.statusText}`,
        );
      }

      const config = await response.json();

      // Merge with existing config
      this.update(config);

      if (this.config.debug) {
        this.logger.debug(`ConfigManager loaded config from ${path}:`, config);
      }
    } catch (error) {
      this.logger.error(`Error loading config from ${path}:`, error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    if (typeof window !== 'undefined' && window.localStorage && this.config.useStorage) {
      try {
        window.localStorage.setItem('api_tester_config', JSON.stringify(this.config));
      } catch (error) {
        this.logger.error('Error saving config to localStorage:', error);
      }
    }
  }

  /**
   * Notify all registered listeners of configuration changes
   */
  private notifyListeners(): void {
    const configCopy = { ...this.config };
    this.listeners.forEach(listener => {
      try {
        listener(configCopy);
      } catch (error) {
        this.logger.error('Error in config change listener:', error);
      }
    });
  }

  /**
   * Get all configuration
   * @returns The complete configuration object
   */
  public getAll(): ConfigOptions {
    return { ...this.config };
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
   * Remove a configuration key
   * @param key Configuration key
   */
  public remove(key: string): void {
    delete this.config[key];
  }
}
