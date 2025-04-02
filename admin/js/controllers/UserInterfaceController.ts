import { logger } from '../utils/logger';
import { DomService } from '../services/DomService';
import { StorageService } from '../services/StorageService';
import { LoggingService } from '../services/LoggingService';

interface UserInterfaceControllerOptions {
  domService: DomService;
  storageService: StorageService;
  loggingService: LoggingService;
  uiOptions?: UIOptions;
}

interface UIOptions {
  theme?: string;
  layout?: string;
  fonts?: string;
  animations?: boolean;
  compactMode?: boolean;
  defaultExpand?: boolean;
}

/**
 * UserInterfaceController handles DOM manipulations for the application UI
 * Uses service abstractions for DOM manipulation and storage
 */
export class UserInterfaceController {
  private domService: DomService;
  private storageService: StorageService;
  private loggingService: LoggingService;
  private options: UIOptions;
  private elements: Record<string, HTMLElement | null> = {};
  private eventHandlers: Map<string, (event: Event) => void> = new Map();
  private initialized = false;

  /**
   * Create a new UserInterfaceController
   * @param options Configuration options
   */
  constructor(options: UserInterfaceControllerOptions) {
    this.domService = options.domService;
    this.storageService = options.storageService;
    this.loggingService = options.loggingService;
    this.options = options.uiOptions || this.loadStoredOptions() || {
      theme: 'light',
      layout: 'default',
      animations: true,
      compactMode: false,
      defaultExpand: true
    };

    this.loggingService.info('UserInterfaceController initialized');
  }

  /**
   * Initialize the UI components
   */
  public initialize(): void {
    if (this.initialized) {
      this.loggingService.warn('UserInterfaceController already initialized');
      return;
    }

    try {
      // Cache important DOM elements
      this.cacheElements();
      
      // Apply stored UI preferences
      this.applyTheme(this.options.theme || 'light');
      this.applyLayout(this.options.layout || 'default');
      this.toggleAnimations(this.options.animations !== false);
      this.toggleCompactMode(this.options.compactMode === true);
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      this.loggingService.info('UI initialized with options', this.options);
    } catch (error) {
      this.loggingService.error('Failed to initialize UI', error);
    }
  }

  /**
   * Cache frequently accessed DOM elements
   */
  private cacheElements(): void {
    try {
      // Main areas
      this.elements.header = this.domService.getElementById('header');
      this.elements.sidebar = this.domService.getElementById('sidebar');
      this.elements.main = this.domService.getElementById('main-content');
      this.elements.footer = this.domService.getElementById('footer');
      
      // Theme controls
      this.elements.themeToggle = this.domService.getElementById('theme-toggle');
      this.elements.layoutSelector = this.domService.getElementById('layout-selector');
      this.elements.compactModeToggle = this.domService.getElementById('compact-mode-toggle');
      this.elements.animationsToggle = this.domService.getElementById('animations-toggle');
      
      // Configuration panels
      this.elements.configPanel = this.domService.getElementById('config-panel');
      this.elements.uiSettingsPanel = this.domService.getElementById('ui-settings-panel');
      
      this.loggingService.debug('UI elements cached');
    } catch (error) {
      this.loggingService.error('Failed to cache UI elements', error);
    }
  }

  /**
   * Setup event listeners for UI controls
   */
  private setupEventListeners(): void {
    try {
      // Theme toggle
      if (this.elements.themeToggle) {
        const themeHandler = (e: Event) => this.toggleTheme();
        this.elements.themeToggle.addEventListener('click', themeHandler);
        this.eventHandlers.set('theme-toggle', themeHandler);
      }
      
      // Compact mode toggle
      if (this.elements.compactModeToggle) {
        const compactHandler = (e: Event) => this.toggleCompactMode();
        this.elements.compactModeToggle.addEventListener('click', compactHandler);
        this.eventHandlers.set('compact-mode-toggle', compactHandler);
      }
      
      // Animations toggle
      if (this.elements.animationsToggle) {
        const animationsHandler = (e: Event) => this.toggleAnimations();
        this.elements.animationsToggle.addEventListener('click', animationsHandler);
        this.eventHandlers.set('animations-toggle', animationsHandler);
      }
      
      // Layout selector
      if (this.elements.layoutSelector) {
        const layoutHandler = (e: Event) => {
          const select = e.target as HTMLSelectElement;
          this.applyLayout(select.value);
        };
        this.elements.layoutSelector.addEventListener('change', layoutHandler);
        this.eventHandlers.set('layout-selector', layoutHandler);
      }
      
      this.loggingService.debug('UI event listeners setup');
    } catch (error) {
      this.loggingService.error('Failed to setup UI event listeners', error);
    }
  }

  /**
   * Toggle between light and dark themes
   */
  public toggleTheme(): void {
    const currentTheme = this.options.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  /**
   * Apply a specific theme
   * @param theme Theme name to apply
   */
  public applyTheme(theme: string): void {
    try {
      const rootElement = this.domService.querySelector('html');
      if (!rootElement) {
        this.loggingService.error('Root HTML element not found');
        return;
      }
      
      // Remove existing theme classes
      (rootElement as HTMLElement).classList.remove('theme-light', 'theme-dark');
      
      // Add new theme class
      (rootElement as HTMLElement).classList.add(`theme-${theme}`);
      
      // Update stored preferences
      this.options.theme = theme;
      this.saveOptions();
      
      this.loggingService.info(`Theme changed to ${theme}`);
    } catch (error) {
      this.loggingService.error('Failed to apply theme', error);
    }
  }

  /**
   * Apply a specific layout
   * @param layout Layout name to apply
   */
  public applyLayout(layout: string): void {
    try {
      const mainElement = this.elements.main;
      if (!mainElement) {
        this.loggingService.error('Main content element not found');
        return;
      }
      
      // Remove existing layout classes
      mainElement.classList.remove('layout-default', 'layout-compact', 'layout-expanded');
      
      // Add new layout class
      mainElement.classList.add(`layout-${layout}`);
      
      // Update stored preferences
      this.options.layout = layout;
      this.saveOptions();
      
      this.loggingService.info(`Layout changed to ${layout}`);
    } catch (error) {
      this.loggingService.error('Failed to apply layout', error);
    }
  }

  /**
   * Toggle compact mode
   * @param enable Optional parameter to force state
   */
  public toggleCompactMode(enable?: boolean): void {
    try {
      const newState = enable !== undefined ? enable : !this.options.compactMode;
      const rootElement = this.domService.querySelector('html');
      
      if (rootElement) {
        if (newState) {
          (rootElement as HTMLElement).classList.add('compact-mode');
        } else {
          (rootElement as HTMLElement).classList.remove('compact-mode');
        }
      }
      
      // Update stored preferences
      this.options.compactMode = newState;
      this.saveOptions();
      
      this.loggingService.info(`Compact mode ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.loggingService.error('Failed to toggle compact mode', error);
    }
  }

  /**
   * Toggle animations
   * @param enable Optional parameter to force state
   */
  public toggleAnimations(enable?: boolean): void {
    try {
      const newState = enable !== undefined ? enable : !this.options.animations;
      const rootElement = this.domService.querySelector('html');
      
      if (rootElement) {
        if (newState) {
          (rootElement as HTMLElement).classList.remove('no-animations');
        } else {
          (rootElement as HTMLElement).classList.add('no-animations');
        }
      }
      
      // Update stored preferences
      this.options.animations = newState;
      this.saveOptions();
      
      this.loggingService.info(`Animations ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.loggingService.error('Failed to toggle animations', error);
    }
  }

  /**
   * Show an element by ID
   * @param id Element ID
   */
  public showElement(id: string): void {
    try {
      const element = this.domService.getElementById(id);
      if (element) {
        element.style.display = '';
        this.loggingService.debug(`Element ${id} shown`);
      } else {
        this.loggingService.warn(`Element ${id} not found`);
      }
    } catch (error) {
      this.loggingService.error(`Failed to show element ${id}`, error);
    }
  }

  /**
   * Hide an element by ID
   * @param id Element ID
   */
  public hideElement(id: string): void {
    try {
      const element = this.domService.getElementById(id);
      if (element) {
        element.style.display = 'none';
        this.loggingService.debug(`Element ${id} hidden`);
      } else {
        this.loggingService.warn(`Element ${id} not found`);
      }
    } catch (error) {
      this.loggingService.error(`Failed to hide element ${id}`, error);
    }
  }

  /**
   * Toggle element visibility by ID
   * @param id Element ID
   */
  public toggleElement(id: string): void {
    try {
      const element = this.domService.getElementById(id);
      if (element) {
        if (element.style.display === 'none') {
          element.style.display = '';
          this.loggingService.debug(`Element ${id} shown`);
        } else {
          element.style.display = 'none';
          this.loggingService.debug(`Element ${id} hidden`);
        }
      } else {
        this.loggingService.warn(`Element ${id} not found`);
      }
    } catch (error) {
      this.loggingService.error(`Failed to toggle element ${id}`, error);
    }
  }

  /**
   * Set text content of an element
   * @param id Element ID
   * @param text Text to set
   */
  public setTextContent(id: string, text: string): void {
    try {
      const element = this.domService.getElementById(id);
      if (element) {
        this.domService.setTextContent(element, text);
        this.loggingService.debug(`Set text content for ${id}`);
      } else {
        this.loggingService.warn(`Element ${id} not found`);
      }
    } catch (error) {
      this.loggingService.error(`Failed to set text content for ${id}`, error);
    }
  }

  /**
   * Set HTML content of an element
   * @param id Element ID
   * @param html HTML to set
   */
  public setInnerHTML(id: string, html: string): void {
    try {
      const element = this.domService.getElementById(id);
      if (element) {
        this.domService.setInnerHTML(element, html);
        this.loggingService.debug(`Set HTML content for ${id}`);
      } else {
        this.loggingService.warn(`Element ${id} not found`);
      }
    } catch (error) {
      this.loggingService.error(`Failed to set HTML content for ${id}`, error);
    }
  }

  /**
   * Load stored UI options from storage
   * @returns UI options or null if not found
   */
  private loadStoredOptions(): UIOptions | null {
    try {
      const storedOptions = this.storageService.get<string>('ui_options');
      if (storedOptions) {
        return JSON.parse(storedOptions);
      }
      return null;
    } catch (error) {
      this.loggingService.error('Failed to load UI options', error);
      return null;
    }
  }

  /**
   * Save current UI options to storage
   */
  private saveOptions(): void {
    try {
      this.storageService.set('ui_options', JSON.stringify(this.options));
      this.loggingService.debug('UI options saved');
    } catch (error) {
      this.loggingService.error('Failed to save UI options', error);
    }
  }

  /**
   * Clean up event listeners and references
   */
  public destroy(): void {
    try {
      // Remove event listeners
      this.eventHandlers.forEach((handler, key) => {
        const element = this.domService.getElementById(key);
        if (element) {
          if (key.includes('toggle')) {
            element.removeEventListener('click', handler);
          } else if (key.includes('selector')) {
            element.removeEventListener('change', handler);
          }
        }
      });
      
      // Clear maps and caches
      this.eventHandlers.clear();
      this.elements = {};
      
      this.initialized = false;
      this.loggingService.info('UserInterfaceController destroyed');
    } catch (error) {
      this.loggingService.error('Failed to destroy UserInterfaceController', error);
    }
  }
} 