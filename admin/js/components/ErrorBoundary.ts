import { logger } from '../utils/logger';

interface ErrorBoundaryOptions {
  /**
   * Element to render errors into
   */
  container: HTMLElement;
  
  /**
   * Optional custom error renderer
   */
  errorRenderer?: (error: Error, info: ErrorInfo) => string;
  
  /**
   * Optional callback for when an error occurs
   */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorInfo {
  /**
   * Component stack trace
   */
  componentStack?: string;
  
  /**
   * Additional context information
   */
  context?: Record<string, unknown>;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child components
 * and displays a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary {
  private container: HTMLElement;
  private errorRenderer: (error: Error, info: ErrorInfo) => string;
  private onError?: (error: Error, info: ErrorInfo) => void;
  private hasError = false;
  
  /**
   * Create a new ErrorBoundary
   * @param options Configuration options
   */
  constructor(options: ErrorBoundaryOptions) {
    this.container = options.container;
    this.onError = options.onError;
    
    this.errorRenderer = options.errorRenderer || this.defaultErrorRenderer;
  }
  
  /**
   * Default error renderer
   */
  private defaultErrorRenderer(error: Error, info: ErrorInfo): string {
    return `
      <div class="error-boundary">
        <h2>Something went wrong</h2>
        <details>
          <summary>Click for error details</summary>
          <pre>${error.toString()}</pre>
          ${info.componentStack ? `<pre>${info.componentStack}</pre>` : ''}
        </details>
      </div>
    `;
  }
  
  /**
   * Catch errors during rendering and display a fallback UI
   */
  public catchError(error: Error, info: ErrorInfo = {}): void {
    this.hasError = true;
    
    // Log the error
    logger.error('[ErrorBoundary] Caught error:', error);
    if (info.componentStack) {
      logger.error('[ErrorBoundary] Component stack:', info.componentStack);
    }
    
    // Render the error UI
    this.container.innerHTML = this.errorRenderer(error, info);
    
    // Call the error callback if provided
    if (this.onError) {
      this.onError(error, info);
    }
  }
  
  /**
   * Reset the error state
   */
  public reset(): void {
    this.hasError = false;
    this.container.innerHTML = '';
  }
  
  /**
   * Check if the boundary has caught an error
   */
  public hasErrorState(): boolean {
    return this.hasError;
  }
  
  /**
   * Wrap a function with error handling
   * @param fn Function to wrap
   * @param context Optional context information
   * @returns Wrapped function
   */
  public wrap<T extends(...args: unknown[]) => ReturnType<T>>(
    fn: T,
    context: Record<string, unknown> = {},
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.catchError(error as Error, { context });
        return undefined;
      }
    };
  }
  
  /**
   * Wrap an async function with error handling
   * @param fn Async function to wrap
   * @param context Optional context information
   * @returns Wrapped async function
   */
  public wrapAsync<T extends(...args: unknown[]) => Promise<Awaited<ReturnType<T>>>>(
    fn: T,
    context: Record<string, unknown> = {},
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.catchError(error as Error, { context });
        return undefined;
      }
    };
  }
} 