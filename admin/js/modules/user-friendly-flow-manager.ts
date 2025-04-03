// Types improved by ts-improve-types
/**
 * User-Friendly Flow Manager
 * Manages API flows in a way that's easier to understand for non-technical users
 */

import { Flow, StepType } from '../types/flow-types';
import { ComponentLogger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
// Remove FlowManager import if not extending
// import { FlowManager, FlowManagerOptions as BaseFlowManagerOptions } from '../modules/flow-manager';

export type FlowCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
};

export type CategorizedFlow = Flow & {
  categoryId: string;
  userFriendlyDescription?: string;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
};

/**
 * Options for the UserFriendlyFlowManager
 */
export interface UserFriendlyFlowManagerOptions {
  /** API client instance */
  apiClient?: unknown;
  /** Endpoint manager instance */
  endpointManager?: unknown;
  /** Variable manager instance */
  variableManager?: unknown;
  /** History manager instance */
  historyManager?: unknown;
  /** Optional UI manager instance */
  uiManager?: unknown;
  /** Event bus instance */
  eventBus?: EventBus;
  /** Logger instance */
  logger?: ComponentLogger;
  /** Storage key for flows */
  storageKey?: string;
  /** Whether to load from local storage */
  loadFromLocalStorage?: boolean;
  /** Default categories */
  defaultCategories?: FlowCategory[];
  /** Optional debug flag */
  debug?: boolean;
}

/**
 * Manages flows in user-friendly categories
 */
export class UserFriendlyFlowManager {
  private categories: FlowCategory[] = [];
  private flows: CategorizedFlow[] = [];
  private storageKey: string;
  // Add options if needed independently from FlowManager
  private options: UserFriendlyFlowManagerOptions;
  private eventBus: EventBus;
  private logger?: ComponentLogger;

  constructor(options: UserFriendlyFlowManagerOptions = {}) {
    // No super() call needed now
    this.options = options; // Store options
    this.storageKey = options.storageKey || 'user_friendly_flows';
    this.eventBus = options.eventBus || EventBus.getInstance();
    this.logger = options.logger;
    
    // We need a way to load flows now - let's call loadFromStorage
    if (options.loadFromLocalStorage !== false) {
      this.loadFromStorage();
    }

    if (this.categories.length === 0 && options.defaultCategories) {
      this.categories = [...options.defaultCategories]; // Property added
    } else if (this.categories.length === 0) {
      this.initializeDefaultCategories();
    }
    
    this.logger?.debug('UserFriendlyFlowManager initialized', {
      categoriesCount: this.categories.length,
      flowsCount: this.flows.length,
    });
  }

  /**
   * Initialize default categories
   */
  private initializeDefaultCategories(): void {
    this.categories = [
      {
        id: 'authentication',
        name: 'Authentication',
        description: 'User login, registration, and token management',
        icon: 'lock',
        order: 10,
      },
      {
        id: 'users',
        name: 'User Management',
        description: 'Creating and managing user profiles',
        icon: 'user',
        order: 20,
      },
      {
        id: 'challenges',
        name: 'Challenges',
        description: 'Working with game challenges and puzzles',
        icon: 'puzzle',
        order: 30,
      },
      {
        id: 'game',
        name: 'Game Flow',
        description: 'Game progression and state management',
        icon: 'gamepad',
        order: 40,
      },
      {
        id: 'system',
        name: 'System',
        description: 'System health, status, and configuration',
        icon: 'cog',
        order: 50,
      },
    ];

    this.saveToStorage();
  }

  /**
   * Load flows and categories from storage
   */
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (storedData) {
        const data = JSON.parse(storedData);

        // Validate categories is an array
        if (Array.isArray(data.categories)) {
          this.categories = data.categories; // Property added
        } else {
          this.logger?.warn(
            'Skipping invalid category data: expected array but got',
            typeof data.categories,
          );
          this.categories = []; // Property added
        }

        // Validate flows is an array
        if (Array.isArray(data.flows)) {
          this.flows = data.flows; // Property added
        } else {
          this.logger?.warn('Skipping invalid flows data: expected array but got', typeof data.flows);
          this.flows = []; // Property added
        }
      }
    } catch (error) {
      this.logger?.error('Failed to load categories and flows from storage:', error);
      this.categories = []; // Property added
      this.flows = []; // Property added
    }
  }

  /**
   * Save flows and categories to storage
   */
  private saveToStorage(): void {
    try {
      const data = {
        categories: this.categories,
        flows: this.flows,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      this.logger?.error('Failed to save categories and flows to storage:', error);
    }
  }

  /**
   * Get all categories
   */
  getCategories(): FlowCategory[] {
    return [...this.categories].sort((a, b) => a.order - b.order);
  }

  /**
   * Get all flows
   */
  getAllFlows(): CategorizedFlow[] {
    return [...this.flows];
  }

  /**
   * Get flows by category
   * @param categoryId Category ID
   */
  getFlowsByCategory(categoryId: string): CategorizedFlow[] {
    return this.flows.filter(flow => flow.categoryId === categoryId);
  }

  /**
   * Add a flow to a category
   * @param flow Flow to add
   * @param categoryId Category ID
   */
  addFlow(flow: Flow, categoryId: string): CategorizedFlow {
    const categorizedFlow: CategorizedFlow = {
      ...flow,
      categoryId,
      updatedAt: Date.now(),
    };

    this.flows.push(categorizedFlow);
    this.saveToStorage();

    return categorizedFlow;
  }

  /**
   * Update a flow
   * @param flowId Flow ID
   * @param updates Updates to apply
   */
  updateFlow(flowId: string, updates: Partial<CategorizedFlow>): CategorizedFlow | null {
    const index = this.flows.findIndex(f => f.id === flowId);
    if (index === -1) return null;

    this.flows[index] = {
      ...this.flows[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveToStorage();
    return this.flows[index];
  }

  /**
   * Delete a flow
   * @param flowId Flow ID
   */
  deleteFlow(flowId: string): boolean {
    const initialLength = this.flows.length;
    this.flows = this.flows.filter(f => f.id !== flowId);

    if (this.flows.length !== initialLength) {
      this.saveToStorage();
      return true;
    }

    return false;
  }

  /**
   * Add a category
   * @param category Category to add
   */
  addCategory(category: Omit<FlowCategory, 'id'>): FlowCategory {
    const newCategory: FlowCategory = {
      ...category,
      id: this.generateId(),
    };

    this.categories.push(newCategory);
    this.saveToStorage();

    return newCategory;
  }

  /**
   * Update a category
   * @param categoryId Category ID
   * @param updates Updates to apply
   */
  updateCategory(categoryId: string, updates: Partial<FlowCategory>): FlowCategory | null {
    const index = this.categories.findIndex(c => c.id === categoryId);
    if (index === -1) return null;

    this.categories[index] = {
      ...this.categories[index],
      ...updates,
    };

    this.saveToStorage();
    return this.categories[index];
  }

  /**
   * Deletes a category and all its associated flows.
   * @param categoryId The ID of the category to delete.
   * @returns True if the category was deleted, false otherwise.
   */
  deleteCategory(categoryId: string): boolean {
    const initialLength = this.categories.length; // Keep only this one
    // Remove the category
    this.categories = this.categories.filter(c => c.id !== categoryId);
    // Remove flows associated with this category
    this.flows = this.flows.filter(f => f.categoryId !== categoryId);

    const deleted = this.categories.length < initialLength;
    if (deleted) {
      this.saveToStorage();
      this.eventBus.publish('category:deleted', categoryId);
      this.eventBus.publish('flows:updated');
    }
    return deleted;
  }

  /**
   * Convert regular flows to categorized flows
   * @param flows Regular flows
   */
  importFlows(flows: Flow[]): void {
    // Try to categorize flows based on their name or content
    flows.forEach(flow => {
      const categorizedFlow: CategorizedFlow = {
        ...flow,
        categoryId: this.determineCategory(flow),
        updatedAt: Date.now(),
      };

      this.flows.push(categorizedFlow);
    });

    this.saveToStorage();
  }

  /**
   * Try to determine the appropriate category for a flow
   * @param flow Flow to categorize
   */
  private determineCategory(flow: Flow): string {
    const name = flow.name.toLowerCase();
    const description = (flow.description || '').toLowerCase();

    // Try to match with known keywords
    if (
      name.includes('auth') ||
      name.includes('login') ||
      name.includes('register') ||
      description.includes('token')
    ) {
      return 'authentication';
    }

    if (name.includes('user') || description.includes('profile')) {
      return 'users';
    }

    if (name.includes('challenge') || name.includes('puzzle')) {
      return 'challenges';
    }

    if (name.includes('game') || name.includes('play')) {
      return 'game';
    }

    if (name.includes('system') || name.includes('health') || name.includes('status')) {
      return 'system';
    }

    // Default to uncategorized
    return 'uncategorized';
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Create default user-friendly flows for each category
   */
  createDefaultFlows(): void {
    // Authentication flows
    this.addFlow(
      {
        id: this.generateId(),
        name: 'User Registration',
        description: 'Create a new player account',
        userFriendlyDescription:
          'Follow this step-by-step guide to create a new account that you can use to log in to the AI Game Backend.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'Register New User',
            description: 'Register a new user with email and password',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/auth/register',
            body: JSON.stringify(
              {
                email: 'newuser@example.com',
                password: 'securePassword123',
                username: 'NewPlayer',
              },
              null,
              2,
            ),
          },
          {
            id: this.generateId(),
            name: 'Verify Registration',
            description: 'Verify that the registration was successful',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/users/me',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'authentication',
    );

    this.addFlow(
      {
        id: this.generateId(),
        name: 'User Login',
        description: 'Log in with existing account',
        userFriendlyDescription:
          'Access your account by logging in with your credentials. This will give you a token for making authenticated requests.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'Login',
            description: 'Login with email and password',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/auth/login',
            body: JSON.stringify(
              {
                email: 'user@example.com',
                password: 'password123',
              },
              null,
              2,
            ),
          },
          {
            id: this.generateId(),
            name: 'Verify Login',
            description: 'Check if login was successful',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/users/me',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'authentication',
    );

    this.addFlow(
      {
        id: this.generateId(),
        name: 'Password Reset',
        description: 'Reset your password',
        userFriendlyDescription:
          'Forgot your password? Follow these steps to reset it and regain access to your account.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'Request Password Reset',
            description: 'Request a password reset link to be sent to your email',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/auth/password-reset/request',
            body: JSON.stringify(
              {
                email: 'user@example.com',
              },
              null,
              2,
            ),
          },
          {
            id: this.generateId(),
            name: 'Confirm Password Reset',
            description: 'Use the token from your email to set a new password',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/auth/password-reset/confirm',
            body: JSON.stringify(
              {
                token: 'reset_token_from_email',
                newPassword: 'newSecurePassword123',
              },
              null,
              2,
            ),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'authentication',
    );

    // User Management flows
    this.addFlow(
      {
        id: this.generateId(),
        name: 'Profile Management',
        description: 'View and update your user profile',
        userFriendlyDescription:
          'Check your profile information and make updates to your personal details.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'Get User Profile',
            description: 'Retrieve your current profile information',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/users/me',
          },
          {
            id: this.generateId(),
            name: 'Update Profile',
            description: 'Update your profile information',
            type: StepType.REQUEST,
            method: 'PUT',
            url: '/api/v1/users/me',
            body: JSON.stringify(
              {
                username: 'UpdatedUsername',
                fullName: 'Updated Full Name',
                bio: 'This is my updated bio',
              },
              null,
              2,
            ),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'users',
    );

    this.addFlow(
      {
        id: this.generateId(),
        name: 'Preferences Setup',
        description: 'Set your preferences for the game',
        userFriendlyDescription: 'Customize your game experience by setting your preferences.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'Get Current Preferences',
            description: 'View your current preference settings',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/users/me/preferences',
          },
          {
            id: this.generateId(),
            name: 'Update Preferences',
            description: 'Update your preference settings',
            type: StepType.REQUEST,
            method: 'PUT',
            url: '/api/v1/users/me/preferences',
            body: JSON.stringify(
              {
                difficultyLevel: 'intermediate',
                notificationsEnabled: true,
                themeName: 'dark',
              },
              null,
              2,
            ),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'users',
    );

    // Challenges flows
    this.addFlow(
      {
        id: this.generateId(),
        name: 'Browse Challenges',
        description: 'View available challenges',
        userFriendlyDescription: 'Explore the different challenges available for you to attempt.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'List All Challenges',
            description: 'Get a list of all available challenges',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/challenges',
          },
          {
            id: this.generateId(),
            name: 'Get Challenge Details',
            description: 'View detailed information about a specific challenge',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/challenges/{{challengeId}}',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'challenges',
    );

    this.addFlow(
      {
        id: this.generateId(),
        name: 'Start and Submit Challenge',
        description: 'Start a challenge and submit your solution',
        userFriendlyDescription: 'Begin a challenge, work on it, and submit your solution.',
        difficultyLevel: 'intermediate',
        steps: [
          {
            id: this.generateId(),
            name: 'Start Challenge',
            description: 'Begin a challenge and get the initial data',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/challenges/{{challengeId}}/start',
            body: JSON.stringify({}),
          },
          {
            id: this.generateId(),
            name: 'Submit Solution',
            description: 'Submit your solution to the challenge',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/challenges/{{challengeId}}/submit',
            body: JSON.stringify(
              {
                solution: 'Your solution here',
                timeSpent: 1200, // Time spent in seconds
              },
              null,
              2,
            ),
          },
          {
            id: this.generateId(),
            name: 'View Result',
            description: 'Check the results of your submission',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/challenges/{{challengeId}}/submissions/latest',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'challenges',
    );

    // Game Flow
    this.addFlow(
      {
        id: this.generateId(),
        name: 'Game Progress',
        description: 'Check your game progress and achievements',
        userFriendlyDescription:
          "View your overall progress in the game and see what achievements you've unlocked.",
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'Get Progress Summary',
            description: 'View a summary of your progress in the game',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/game/progress',
          },
          {
            id: this.generateId(),
            name: 'Get Achievements',
            description: 'View all your unlocked achievements',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/game/achievements',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'game',
    );

    this.addFlow(
      {
        id: this.generateId(),
        name: 'Level Management',
        description: 'View and unlock game levels',
        userFriendlyDescription: 'Check available levels and see how to unlock new ones.',
        difficultyLevel: 'intermediate',
        steps: [
          {
            id: this.generateId(),
            name: 'Get Available Levels',
            description: 'See all levels and your progress in each',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/game/levels',
          },
          {
            id: this.generateId(),
            name: 'Unlock Next Level',
            description: 'Attempt to unlock the next level in sequence',
            type: StepType.REQUEST,
            method: 'POST',
            url: '/api/v1/game/levels/unlock',
            body: JSON.stringify(
              {
                currentLevel: 5,
              },
              null,
              2,
            ),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'game',
    );

    // System flows
    this.addFlow(
      {
        id: this.generateId(),
        name: 'System Health Check',
        description: 'Check if all systems are working properly',
        userFriendlyDescription:
          'Verify that all parts of the system are operational and functioning correctly.',
        difficultyLevel: 'beginner',
        steps: [
          {
            id: this.generateId(),
            name: 'API Health Check',
            description: 'Check if API is responding',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/health',
          },
          {
            id: this.generateId(),
            name: 'Database Status',
            description: 'Check database connection',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/health/database',
          },
          {
            id: this.generateId(),
            name: 'Services Status',
            description: 'Check status of all dependent services',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/health/services',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'system',
    );

    this.addFlow(
      {
        id: this.generateId(),
        name: 'Server Configuration',
        description: 'View server configuration settings',
        userFriendlyDescription: 'Check the current configuration of the server and its features.',
        difficultyLevel: 'advanced',
        steps: [
          {
            id: this.generateId(),
            name: 'Get Configuration',
            description: 'View the current server configuration',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/system/config',
          },
          {
            id: this.generateId(),
            name: 'View Feature Flags',
            description: 'Check which features are enabled or disabled',
            type: StepType.REQUEST,
            method: 'GET',
            url: '/api/v1/system/features',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'system',
    );
  }
}
