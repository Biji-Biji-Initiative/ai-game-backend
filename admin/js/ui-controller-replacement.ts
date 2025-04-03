import { Component } from './types/component-base';
import { StorageService } from './services/StorageService';
import { DomService } from './services/DomService';
import { LoggingService } from './services/LoggingService';

/**
 * Options for the UIController
 */
interface UIControllerOptions {
  domService: DomService;
  storageService: StorageService;
  loggingService: LoggingService;
  uiOptions?: {
    theme?: string;
    layout?: string;
    animations?: boolean;
    compactMode?: boolean;
  };
}

/**
 * UI Controller for managing the application interface
 * Uses service abstractions for DOM manipulation and storage
 */
export class UIController implements Component {
  private domService: DomService;
  private storageService: StorageService;
  private loggingService: LoggingService;
  private uiOptions: {
    theme: string;
    layout: string;
    animations: boolean;
    compactMode: boolean;
  };
  private elements: Record<string, HTMLElement | null> = {};
  private isInitialized = false;
  private isLoading = false;

  /**
   * Create a new UIController
   * @param options The controller options
   */
  constructor(options: UIControllerOptions) {
    this.domService = options.domService;
    this.storageService = options.storageService;
    this.loggingService = options.loggingService;

    // Set default options and override with provided options
    this.uiOptions = {
      theme: options.uiOptions?.theme || 'light',
      layout: options.uiOptions?.layout || 'default',
      animations: options.uiOptions?.animations !== false,
      compactMode: options.uiOptions?.compactMode === true,
    };

    this.loggingService.info('UIController initialized with options', this.uiOptions);
  }

  /**
   * Initialize the controller
   */
  public initialize(): void {
    if (this.isInitialized) {
      this.loggingService.warn('UIController already initialized');
      return;
    }

    try {
      // Cache important DOM elements
      this.cacheElements();

      // Apply stored UI preferences
      this.applyTheme(this.uiOptions.theme);
      this.applyLayout(this.uiOptions.layout);
      this.toggleAnimations(this.uiOptions.animations);
      this.toggleCompactMode(this.uiOptions.compactMode);

      this.isInitialized = true;
      this.loggingService.info('UIController initialized');
    } catch (error) {
      this.loggingService.error('Failed to initialize UI', error);
    }
  }

  /**
   * Cache frequently accessed DOM elements
   */
  private cacheElements(): void {
    this.elements.header = this.domService.getElementById('header');
    this.elements.sidebar = this.domService.getElementById('sidebar');
    this.elements.content = this.domService.getElementById('main-content');
    this.elements.footer = this.domService.getElementById('footer');
    this.elements.loading = this.domService.getElementById('loading-indicator');

    this.loggingService.debug('DOM elements cached');
  }

  /**
   * Apply a theme
   * @param theme The theme to apply
   */
  public applyTheme(theme: string): void {
    const htmlElement = document.documentElement;

    // Remove existing theme classes
    htmlElement.classList.remove('theme-light', 'theme-dark');

    // Add new theme class
    htmlElement.classList.add(`theme-${theme}`);

    // Update options and save
    this.uiOptions.theme = theme;
    this.saveOptions();

    this.loggingService.info(`Theme changed to ${theme}`);
  }

  /**
   * Apply a layout
   * @param layout The layout to apply
   */
  public applyLayout(layout: string): void {
    const contentElement = this.elements.content;

    if (!contentElement) {
      this.loggingService.warn('Content element not found');
      return;
    }

    // Remove existing layout classes
    contentElement.classList.remove('layout-default', 'layout-compact', 'layout-expanded');

    // Add new layout class
    contentElement.classList.add(`layout-${layout}`);

    // Update options and save
    this.uiOptions.layout = layout;
    this.saveOptions();

    this.loggingService.info(`Layout changed to ${layout}`);
  }

  /**
   * Toggle animations
   * @param enable Whether to enable animations
   */
  public toggleAnimations(enable?: boolean): void {
    const newState = enable !== undefined ? enable : !this.uiOptions.animations;
    const htmlElement = document.documentElement;

    if (newState) {
      htmlElement.classList.remove('no-animations');
    } else {
      htmlElement.classList.add('no-animations');
    }

    // Update options and save
    this.uiOptions.animations = newState;
    this.saveOptions();

    this.loggingService.info(`Animations ${newState ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle compact mode
   * @param enable Whether to enable compact mode
   */
  public toggleCompactMode(enable?: boolean): void {
    const newState = enable !== undefined ? enable : !this.uiOptions.compactMode;
    const htmlElement = document.documentElement;

    if (newState) {
      htmlElement.classList.add('compact-mode');
    } else {
      htmlElement.classList.remove('compact-mode');
    }

    // Update options and save
    this.uiOptions.compactMode = newState;
    this.saveOptions();

    this.loggingService.info(`Compact mode ${newState ? 'enabled' : 'disabled'}`);
  }

  /**
   * Show loading indicator
   */
  public showLoading(): void {
    this.isLoading = true;

    const loadingElement = this.elements.loading;
    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }

    this.loggingService.debug('Loading indicator shown');
  }

  /**
   * Hide loading indicator
   */
  public hideLoading(): void {
    this.isLoading = false;

    const loadingElement = this.elements.loading;
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    this.loggingService.debug('Loading indicator hidden');
  }

  /**
   * Show an element
   * @param id Element ID
   */
  public showElement(id: string): void {
    const element = this.domService.getElementById(id);

    if (element) {
      element.style.display = '';
      this.loggingService.debug(`Element ${id} shown`);
    } else {
      this.loggingService.warn(`Element ${id} not found`);
    }
  }

  /**
   * Hide an element
   * @param id Element ID
   */
  public hideElement(id: string): void {
    const element = this.domService.getElementById(id);

    if (element) {
      element.style.display = 'none';
      this.loggingService.debug(`Element ${id} hidden`);
    } else {
      this.loggingService.warn(`Element ${id} not found`);
    }
  }

  /**
   * Toggle element visibility
   * @param id Element ID
   */
  public toggleElement(id: string): void {
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
  }

  /**
   * Set text content
   * @param id Element ID
   * @param text Text to set
   */
  public setTextContent(id: string, text: string): void {
    const element = this.domService.getElementById(id);

    if (element) {
      this.domService.setTextContent(element, text);
      this.loggingService.debug(`Text content set for ${id}`);
    } else {
      this.loggingService.warn(`Element ${id} not found`);
    }
  }

  /**
   * Set HTML content
   * @param id Element ID
   * @param html HTML to set
   */
  public setInnerHTML(id: string, html: string): void {
    const element = this.domService.getElementById(id);

    if (element) {
      this.domService.setInnerHTML(element, html);
      this.loggingService.debug(`HTML content set for ${id}`);
    } else {
      this.loggingService.warn(`Element ${id} not found`);
    }
  }

  /**
   * Show error message
   * @param title Error title
   * @param message Error message
   */
  public showError(title: string, message: string): void {
    this.loggingService.error(`${title}: ${message}`);

    // Here we would normally trigger a toast or modal
    // For now, just log the error
    console.error(`${title}: ${message}`);
  }

  /**
   * Show success message
   * @param title Success title
   * @param message Success message
   */
  public showSuccess(title: string, message: string): void {
    this.loggingService.info(`${title}: ${message}`);

    // Here we would normally trigger a toast or modal
    // For now, just log the success
    console.log(`${title}: ${message}`);
  }

  /**
   * Update variables list in the UI
   * @param variables Variables to display
   */
  public updateVariablesList(variables: Record<string, unknown>): void {
    // Implementation would update the variables display in the UI
    this.loggingService.debug('Variables list updated', variables);
  }

  /**
   * Update authentication state in the UI
   * @param authState Current authentication state
   */
  public updateAuthState(authState: unknown): void {
    // Implementation would update auth-related UI elements
    this.loggingService.debug('Auth state updated', authState);
  }

  /**
   * Save UI options to storage
   */
  private saveOptions(): void {
    this.storageService.set('ui_options', this.uiOptions);
    this.loggingService.debug('UI options saved', this.uiOptions);
  }

  /**
   * Load UI options from storage
   * @returns Loaded options or null if not found
   */
  private loadOptions(): typeof this.uiOptions | null {
    const options = this.storageService.get<string>('ui_options');

    if (options) {
      try {
        return JSON.parse(options);
      } catch (error) {
        this.loggingService.error('Failed to parse UI options', error);
      }
    }

    return null;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.isInitialized = false;
    this.elements = {};

    this.loggingService.info('UIController destroyed');
  }
}
