/**
 * Admin Application Main Entry Point
 * 
 * Initializes the application architecture and services
 */

import { ServiceManager, ServiceState } from './core/ServiceManager';
import { DependencyContainer } from './core/DependencyContainer';
import { EventBus } from './core/EventBus';
import { ApiClient } from './api/ApiClient';
import { AuthService, AuthConfig } from './services/AuthService';
import { UserService } from './services/UserService';
import { Router, RouteConfig } from './core/Router';
import { UIManager } from './ui/UIManager';
import { logger, LogLevel } from './utils/logger';
import { StorageType } from './utils/storage-utils';

/**
 * Application configuration
 */
interface AppConfig {
  /**
   * API base URL
   */
  apiBaseUrl: string;
  
  /**
   * Debug mode flag
   */
  debug: boolean;
}

/**
 * Initialize the application
 * @param config Application configuration
 */
async function initializeApp(config: AppConfig): Promise<void> {
  try {
    // Configure logger
    if (config.debug) {
      // Set log level to debug in development
      logger.setLevel(LogLevel.DEBUG);
    }
    
    logger.info('Initializing admin application...');

    // Get core instances
    const serviceManager = ServiceManager.getInstance();
    const container = DependencyContainer.getInstance();
    const eventBus = EventBus.getInstance();
    
    // Setup event listeners for debugging
    if (config.debug) {
      eventBus.on('service:initializing', (data) => {
        const { name } = data as { name: string };
        logger.debug(`Initializing service: ${name}`);
      });
      
      eventBus.on('service:ready', (data) => {
        const { name } = data as { name: string };
        logger.debug(`Service ready: ${name}`);
      });
      
      eventBus.on('service:error', (data) => {
        const { name, error } = data as { name: string; error: Error };
        logger.error(`Service error (${name}):`, error);
      });
      
      // Router event listeners
      eventBus.on('router:changed', (data) => {
        const { path, route } = data as { path: string; route: RouteConfig };
        logger.debug(`Route changed: ${path}`, route);
      });
      
      eventBus.on('router:error', (data) => {
        const { path, error } = data as { path: string; error: Error };
        logger.error(`Router error (${path}):`, error);
      });
    }
    
    // Register API client
    container.register('apiClient', () => {
      return new ApiClient(config.apiBaseUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    }, { singleton: true });
    
    // Get API client instance
    const apiClient = container.get<ApiClient>('apiClient');
    
    // Create auth service with configuration
    const authConfig: AuthConfig = {
      endpoints: {
        login: '/auth/login',
        logout: '/auth/logout',
        me: '/auth/me',
        refresh: '/auth/refresh',
      },
      storageKeys: {
        token: 'auth_token',
        user: 'auth_user',
        refreshToken: 'auth_refresh_token',
      },
      tokenStorage: StorageType.LOCAL,
      userStorage: StorageType.LOCAL,
    };
    
    // Register auth service with the service manager
    serviceManager.register('authService', () => {
      return new AuthService(apiClient, authConfig);
    }, {
      dependencies: ['apiClient'],
      autoInit: true,
    });
    
    // Register user service with the service manager
    serviceManager.register('userService', () => {
      return new UserService(apiClient, '/api/users');
    }, {
      dependencies: ['apiClient', 'authService'],
      autoInit: true,
    });
    
    // Register UI manager with the service manager
    serviceManager.register('uiManager', () => {
      return UIManager.getInstance();
    }, {
      autoInit: true,
    });
    
    // Register router with the service manager
    serviceManager.register('router', () => {
      const router = new Router({
        defaultContainerId: 'main-content',
        authRoute: '/login',
        defaultRoute: '/dashboard',
      });
      
      // Register routes
      registerRoutes(router);
      
      // Setup auth callback
      const authService = serviceManager.getService<AuthService>('authService');
      router.setAuthCallback((route) => {
        const isAuthenticated = authService.isAuthenticated();
        
        if (route.requiresAuth && !isAuthenticated) {
          return false;
        }
        
        // Check roles if specified
        if (route.roles && route.roles.length > 0) {
          return route.roles.some(role => authService.hasRole(role));
        }
        
        // Check permissions if specified
        if (route.permissions && route.permissions.length > 0) {
          return route.permissions.some(permission => authService.hasPermission(permission));
        }
        
        return true;
      });
      
      return router;
    }, {
      dependencies: ['authService', 'userService', 'uiManager'],
      autoInit: true,
    });
    
    // Initialize all services
    const readyServices = await initializeServices(serviceManager);
    logger.info(`${readyServices.length} services initialized successfully`);
    
    // Emit application ready event
    eventBus.emit('app:ready', { services: readyServices });
    
    // Setup listeners for UI events in development mode
    if (config.debug) {
      eventBus.on('ui:toast', (eventData) => {
        const data = eventData as { type: string; message: string };
        logger.debug(`Toast shown: ${data.type} - ${data.message}`);
      });
      
      eventBus.on('ui:modalOpen', (eventData) => {
        const data = eventData as { id: string; title?: string };
        logger.debug(`Modal opened: ${data.id} - ${data.title || 'No title'}`);
      });
    }
    
    logger.info('Admin application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    EventBus.getInstance().emit('app:error', { error });
    
    // Re-throw the error to allow the caller to handle it
    throw error;
  }
}

/**
 * Register application routes
 * @param router Router instance
 */
function registerRoutes(router: Router): void {
  // Get UIManager for showing notifications
  const uiManager = ServiceManager.getInstance().getService<UIManager>('uiManager');
  
  // Public routes
  router.register({
    path: '/login',
    title: 'Login',
    handler: (params) => {
      // Handle login route
      const container = document.getElementById('main-content');
      if (container) {
        container.innerHTML = `
          <div class="login-form">
            <h1>Login</h1>
            <form id="login-form">
              <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="remember-me" name="rememberMe">
                  Remember me
                </label>
              </div>
              <button type="submit" class="btn">Login</button>
            </form>
            <p style="margin-top: 20px;">
              <a href="/register">Don't have an account? Register</a>
            </p>
          </div>
        `;
        
        // Add form submit handler
        const form = document.getElementById('login-form') as HTMLFormElement;
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
              const username = (document.getElementById('username') as HTMLInputElement).value;
              const password = (document.getElementById('password') as HTMLInputElement).value;
              const rememberMe = (document.getElementById('remember-me') as HTMLInputElement).checked;
              
              // Show loading indicator
              const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
              const originalText = submitBtn.textContent || 'Login';
              submitBtn.disabled = true;
              submitBtn.textContent = 'Logging in...';
              
              // Get auth service
              const authService = ServiceManager.getInstance().getService<AuthService>('authService');
              
              // Attempt login
              const user = await authService.login({
                username,
                password,
                rememberMe,
              });
              
              // Show success message
              uiManager.success(`Welcome back, ${user.displayName}!`);
              
              // Redirect to dashboard
              router.navigateTo('/dashboard');
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
              uiManager.error(errorMessage);
              
              // Reset form
              const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
              submitBtn.disabled = false;
              submitBtn.textContent = 'Login';
            }
          });
        }
      }
    },
  });
  
  router.register({
    path: '/register',
    title: 'Register',
    handler: (params) => {
      // Handle register route
      const container = document.getElementById('main-content');
      if (container) {
        container.innerHTML = `
          <div class="register-form">
            <h1>Register</h1>
            <form id="register-form">
              <div class="form-group">
                <label for="fullName">Full Name</label>
                <input type="text" id="fullName" name="fullName" required>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
              </div>
              <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
              </div>
              <button type="submit" class="btn">Register</button>
            </form>
            <p style="margin-top: 20px;">
              <a href="/login">Already have an account? Login</a>
            </p>
          </div>
        `;
        
        // Add form validation and submission logic
        const form = document.getElementById('register-form') as HTMLFormElement;
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Perform validation
            const password = (document.getElementById('password') as HTMLInputElement).value;
            const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;
            
            if (password !== confirmPassword) {
              uiManager.error('Passwords do not match');
              return;
            }
            
            // Show success message for demo
            uiManager.success('Registration successful! You can now log in.');
            setTimeout(() => {
              router.navigateTo('/login');
            }, 1500);
          });
        }
      }
    },
  });
  
  // Protected routes
  router.register({
    path: '/dashboard',
    title: 'Dashboard',
    requiresAuth: true,
    handler: (params) => {
      // Handle dashboard route
      const container = document.getElementById('main-content');
      if (container) {
        // Get current user
        const authService = ServiceManager.getInstance().getService<AuthService>('authService');
        const user = authService.getCurrentUser();
        
        container.innerHTML = `
          <div class="dashboard">
            <h1>Dashboard</h1>
            <p>Welcome to your dashboard, ${user?.displayName || 'User'}!</p>
            
            <div class="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
              <div class="stat-card" style="background-color: #3498db; color: white; padding: 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h3>Users</h3>
                <p style="font-size: 24px; font-weight: bold;">254</p>
                <p>Total registered users</p>
              </div>
              
              <div class="stat-card" style="background-color: #2ecc71; color: white; padding: 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h3>Activity</h3>
                <p style="font-size: 24px; font-weight: bold;">128</p>
                <p>Active users today</p>
              </div>
              
              <div class="stat-card" style="background-color: #e74c3c; color: white; padding: 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h3>Errors</h3>
                <p style="font-size: 24px; font-weight: bold;">7</p>
                <p>Reported issues</p>
              </div>
              
              <div class="stat-card" style="background-color: #f39c12; color: white; padding: 20px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h3>Tasks</h3>
                <p style="font-size: 24px; font-weight: bold;">42</p>
                <p>Pending tasks</p>
              </div>
            </div>
            
            <div class="dashboard-actions" style="margin-top: 30px;">
              <h2>Quick Actions</h2>
              <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button id="refresh-btn" class="btn" style="background-color: #3498db;">Refresh Data</button>
                <button id="show-modal-btn" class="btn" style="background-color: #2ecc71;">Show Dialog</button>
                <button id="show-toast-btn" class="btn" style="background-color: #f39c12;">Show Notification</button>
              </div>
            </div>
          </div>
        `;
        
        // Add button event handlers
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
          uiManager.info('Refreshing dashboard data...');
          setTimeout(() => {
            uiManager.success('Dashboard data refreshed!');
          }, 1000);
        });
        
        document.getElementById('show-modal-btn')?.addEventListener('click', () => {
          uiManager.showModal({
            title: 'Demo Modal',
            content: `
              <div>
                <p>This is a demo modal dialog from our UIManager service.</p>
                <p>It demonstrates how our architecture components work together.</p>
              </div>
            `,
          });
        });
        
        document.getElementById('show-toast-btn')?.addEventListener('click', () => {
          const toastTypes = [
            { type: 'success', message: 'Success notification example' },
            { type: 'info', message: 'Info notification example' },
            { type: 'warning', message: 'Warning notification example' },
            { type: 'error', message: 'Error notification example' },
          ];
          
          const randomType = toastTypes[Math.floor(Math.random() * toastTypes.length)];
          
          switch (randomType.type) {
            case 'success':
              uiManager.success(randomType.message);
              break;
            case 'info':
              uiManager.info(randomType.message);
              break;
            case 'warning':
              uiManager.warning(randomType.message);
              break;
            case 'error':
              uiManager.error(randomType.message);
              break;
          }
        });
      }
    },
  });
  
  router.register({
    path: '/users',
    title: 'User Management',
    requiresAuth: true,
    roles: ['admin'],
    handler: async (params) => {
      // Handle users route
      const container = document.getElementById('main-content');
      if (container) {
        container.innerHTML = '<div class="users-list"><h1>Users</h1><p>Loading users...</p></div>';
        
        try {
          // Get user service
          const userService = DependencyContainer.getInstance().get<UserService>('userService');
          const users = await userService.getUsers();
          
          // Render users
          container.innerHTML = `
            <div class="users-list">
              <h1>Users</h1>
              <p>Total users: ${users.total}</p>
              <ul>
                ${users.items.map(user => `<li>${user.displayName} (${user.username})</li>`).join('')}
              </ul>
            </div>
          `;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          container.innerHTML = `<div class="users-list"><h1>Users</h1><p>Error loading users: ${errorMessage}</p></div>`;
        }
      }
    },
  });
  
  router.register({
    path: '/users/:id',
    title: 'User Details',
    requiresAuth: true,
    handler: async (params) => {
      // Handle user details route
      const container = document.getElementById('main-content');
      if (container) {
        container.innerHTML = `<div class="user-details"><h1>User Details</h1><p>Loading user ${params.id}...</p></div>`;
        
        try {
          // Get user service
          const userService = DependencyContainer.getInstance().get<UserService>('userService');
          const user = await userService.getUserById(params.id);
          
          // Render user details
          container.innerHTML = `
            <div class="user-details">
              <h1>User: ${user.displayName}</h1>
              <dl>
                <dt>Username:</dt>
                <dd>${user.username}</dd>
                <dt>ID:</dt>
                <dd>${user.id}</dd>
                <dt>Roles:</dt>
                <dd>${user.roles.join(', ') || 'None'}</dd>
              </dl>
              <div class="actions">
                <a href="/users/${user.id}/edit" class="btn">Edit User</a>
              </div>
            </div>
          `;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          container.innerHTML = `<div class="user-details"><h1>User Details</h1><p>Error loading user: ${errorMessage}</p></div>`;
        }
      }
    },
  });
  
  router.register({
    path: '/settings',
    title: 'Settings',
    requiresAuth: true,
    handler: (params) => {
      // Handle settings route
      const container = document.getElementById('main-content');
      if (container) {
        container.innerHTML = '<div class="settings"><h1>Settings</h1><p>Your account settings</p></div>';
      }
    },
  });
  
  // Catch-all route for 404
  router.register({
    path: '*',
    title: 'Page Not Found',
    handler: (params) => {
      // Handle 404 route
      const container = document.getElementById('main-content');
      if (container) {
        container.innerHTML = `
          <div class="not-found">
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <a href="/" class="btn">Go to Home</a>
          </div>
        `;
      }
    },
  });
}

/**
 * Initialize required services
 * @param serviceManager Service manager instance
 * @returns List of initialized services
 */
async function initializeServices(serviceManager: ServiceManager): Promise<string[]> {
  // Get all registered services
  const serviceNames = serviceManager.getServiceNames();
  
  // Initialize each service
  await Promise.all(
    serviceNames.map(name => serviceManager.initService(name)),
  );
  
  // Return list of ready services
  return serviceManager.getServicesByState(ServiceState.READY);
}

/**
 * Start the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  const config: AppConfig = {
    apiBaseUrl: process.env.API_BASE_URL || '/api',
    debug: process.env.NODE_ENV !== 'production',
  };
  
  initializeApp(config).catch(error => {
    // Display error to user
    console.error('Application initialization failed:', error);
    
    // Show error message in UI
    const errorContainer = document.getElementById('app-error');
    if (errorContainer) {
      errorContainer.style.display = 'block';
      errorContainer.innerHTML = `
        <h2>Application Error</h2>
        <p>Failed to initialize the application. Please try refreshing the page.</p>
        <pre>${error.message || 'Unknown error'}</pre>
      `;
    }
  });
});

/**
 * Handle unhandled errors
 */
window.addEventListener('error', (event) => {
  logger.error('Unhandled error:', event.error);
  EventBus.getInstance().emit('app:unhandledError', { error: event.error });
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
  EventBus.getInstance().emit('app:unhandledRejection', { error: event.reason });
});

// Export for tests
export { initializeApp }; 