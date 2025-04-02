// Types improved by ts-improve-types
/**
 * Configuration Manager
 * Handles application configuration
 */

interface ConfigValues {
  apiBaseUrl: string;
  apiVersion: string;
  useApiVersionPrefix: boolean;
  requestTimeout: number;
  maxHistoryItems: number;
  theme: 'light' | 'dark' | 'auto';
  endpoints?: {
    customEndpointsPath?: string;
    [key: string]: unknown;
  };
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class Config {
  private config: ConfigValues;

  /**
   * Creates a new Config instance
   * @param initialConfig - Initial configuration values
   */
  constructor(initialConfig: Partial<ConfigValues> = {}) {
    this.config = {
      // Default configuration
      apiBaseUrl: 'http://localhost:3000', // Base URL for API requests
      apiVersion: 'v1', // API version
      useApiVersionPrefix: true, // Whether to use API version in URL
      requestTimeout: 30000, // Request timeout in milliseconds
      maxHistoryItems: 50, // Maximum number of history items to store
      theme: 'light', // UI theme (light, dark, auto)
      ...initialConfig, // Override with provided values
    };

    // Load configuration from storage
    this._loadFromStorage();
  }

  /**
   * Gets a configuration value using dot notation
   * @param key - The configuration key (supports dot notation)
   * @param defaultValue - Default value if key not found
   * @returns The configuration value
   */
  get(key: string, defaultValue: unknown = null): unknown {
    // Handle dot notation (e.g., 'endpoints.customEndpointsPath')
    const parts = key.split('.');
    let current: unknown = this.config;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return defaultValue;
      }

      const currentObj = current as Record<string, unknown>;
      if (!(part in currentObj)) {
        return defaultValue;
      }

      current = currentObj[part];
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Sets a configuration value with support for dot notation
   * @param key - The configuration key
   * @param value - The configuration value
   */
  set(key: string, value: unknown): void {
    // Handle dot notation (e.g., 'endpoints.customEndpointsPath')
    const parts = key.split('.');
    let current: Record<string, unknown> | unknown = this.config;

    // Navigate to the correct object, creating objects as needed
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (current === null || typeof current !== 'object') {
        console.warn(`Cannot set nested property on non-object for key: ${key}`);
        return;
      }

      const currentObj = current as Record<string, unknown>;
      if (!(part in currentObj) || currentObj[part] === null || typeof currentObj[part] !== 'object') {
        currentObj[part] = {};
      }

      current = currentObj[part];
    }

    if (current !== null && typeof current === 'object') {
      (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
    } else {
      console.warn(`Cannot set final property on non-object for key: ${key}`);
      return;
    }

    // Save to storage
    this._saveToStorage();
  }

  /**
   * Sets multiple configuration values
   * @param values - The configuration values
   */
  setMultiple(values: Partial<ConfigValues>): void {
    Object.assign(this.config, values);

    // Save to storage
    this._saveToStorage();
  }

  /**
   * Gets all configuration values
   * @returns The configuration object
   */
  getAll(): ConfigValues {
    return { ...this.config };
  }

  /**
   * Resets configuration to defaults
   * @returns Promise that resolves when reset is complete
   */
  async reset(): Promise<void> {
    // Reset to defaults
    this.config = {
      apiBaseUrl: 'http://localhost:3000',
      apiVersion: 'v1',
      useApiVersionPrefix: true,
      requestTimeout: 30000,
      maxHistoryItems: 50,
      theme: 'light',
    };

    // Save to storage
    this._saveToStorage();
  }

  /**
   * Loads configuration from storage
   * @private
   */
  private _loadFromStorage(): void {
    try {
      const storedConfig = localStorage.getItem('api-tester-config');
      if (storedConfig) {
        this.config = {
          ...this.config,
          ...JSON.parse(storedConfig),
        };
      }
    } catch (error) {
      console.error('Error loading configuration from storage:', error);
    }
  }

  /**
   * Saves configuration to storage
   * @private
   */
  private _saveToStorage(): void {
    try {
      localStorage.setItem('api-tester-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving configuration to storage:', error);
    }
  }
}
