/**
 * Central API Types
 * 
 * This file exports all API types for the frontend to use,
 * based on the generated Zod schemas from the OpenAPI specification.
 */

import { z } from 'zod';
import { schemas } from '../../lib/api/generated-zodios-client';

// Re-export the schemas for direct use
export { schemas };

// Basic API types inferred from schemas
export type User = z.infer<typeof schemas.User>;
export type Challenge = z.infer<typeof schemas.Challenge>;
export type Evaluation = z.infer<typeof schemas.Evaluation>;
export type UserJourneyEvent = z.infer<typeof schemas.UserJourneyEvent>;
export type AdaptiveRecommendation = z.infer<typeof schemas.AdaptiveRecommendation>;
export type FocusArea = z.infer<typeof schemas.FocusArea>;

// Personality-related types
export type Trait = {
  id: string;
  name: string;
  score?: number;
  description?: string;
  category?: string;
};

export type AIAttitude = {
  id: string;
  attitude: string;
  strength: number;
};

// Request/Response types
export type GenerateChallengeRequest = z.infer<typeof schemas.generateDynamicChallenge_Body>;
export type UpdateChallengeRequest = z.infer<typeof schemas.updateChallenge_Body>;

/**
 * Profile update request type
 */
export interface UpdateProfileRequest {
  userId: string;
  fullName: string;
  email: string;
  bio?: string;
  professionalTitle?: string;
  location?: string;
}

/**
 * Frontend-specific types that extend the base API types
 * These types add UI-specific properties that may not exist in the API
 */

// UI-specific Evaluation Category type
export interface EvaluationCategory {
  id: string;
  name: string;
  score: number;
  feedback: string;
}

/**
 * UI Evaluation extends the API Evaluation with UI-specific properties
 */
export interface UIEvaluation extends Omit<Evaluation, 'metrics'> {
  metrics?: Record<string, unknown> | string;
  roundNumber?: number;
  overallScore?: number;
  strengths?: string[];
  areasForImprovement?: string[];
  categories?: EvaluationCategory[];
  summary?: string;
  timestamp?: string; // Added for UI purposes
}

/**
 * Helper function to map an API Evaluation to a UI Evaluation
 */
export function mapToUIEvaluation(evaluation: Evaluation): UIEvaluation {
  // Extract metrics data - assuming metrics is a JSON string or object
  let metricsData: Record<string, unknown> = {};
  if (typeof evaluation.metrics === 'string') {
    try {
      metricsData = JSON.parse(evaluation.metrics);
    } catch (e) {
      console.error('Failed to parse evaluation metrics:', e);
    }
  } else if (evaluation.metrics && typeof evaluation.metrics === 'object') {
    metricsData = evaluation.metrics as Record<string, unknown>;
  }

  return {
    ...evaluation,
    // Map fields based on metrics data
    roundNumber: metricsData.roundNumber ? Number(metricsData.roundNumber) : 1,
    overallScore: metricsData.overallScore ? Number(metricsData.overallScore) : 0,
    strengths: Array.isArray(metricsData.strengths) ? metricsData.strengths as string[] : [],
    areasForImprovement: Array.isArray(metricsData.areasForImprovement) ? metricsData.areasForImprovement as string[] : [],
    categories: Array.isArray(metricsData.categories) ? metricsData.categories as EvaluationCategory[] : [],
    summary: typeof metricsData.summary === 'string' ? metricsData.summary : evaluation.feedback || '',
  };
}

/**
 * Helper function to map multiple API Evaluations to UI Evaluations
 */
export function mapToUIEvaluations(evaluations: Evaluation[]): UIEvaluation[] {
  return evaluations.map(mapToUIEvaluation);
}

/**
 * UI User extends the API User with UI-specific properties
 */
export interface UIUser extends User {
  // UI-specific fields that don't exist in the API 
  avatarUrl?: string;  // URL to user's profile picture
  bio?: string;        // User bio/description
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    fontSize?: 'small' | 'medium' | 'large';
    animationsEnabled?: boolean;
    notifications?: {
      email?: boolean;
      browser?: boolean;
    };
    learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
    preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
}

/**
 * Helper function to map an API User to a UI User
 */
export function mapToUIUser(user: User): UIUser {
  return {
    ...user,
    // Generate default UI fields
    avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(typeof user.fullName === 'string' ? user.fullName : 'User')}`,
    bio: typeof user.bio === 'string' ? user.bio : '',
    preferences: {
      theme: 'system',
      fontSize: 'medium',
      animationsEnabled: true,
      notifications: {
        email: true,
        browser: true
      },
      learningStyle: 'visual',
      preferredDifficulty: 'intermediate'
    }
  };
}

/**
 * Helper function to map multiple API Users to UI Users
 */
export function mapToUIUsers(users: User[]): UIUser[] {
  return users.map(mapToUIUser);
}

/**
 * UI Challenge extends the API Challenge with UI-specific properties
 */
export interface UIChallenge extends Challenge {
  // UI-specific fields that don't exist in the API
  title?: string;       // Derived from content or other fields
  description?: string; // Often mapped from content
  category?: string;    // UI categorization
  estimatedTime?: string; // UI display value
  matchScore?: number;    // For recommendation UI
  tags?: string[];        // For UI filtering/categorization
}

/**
 * Helper function to map an API Challenge to a UI Challenge
 */
export function mapToUIChallenge(challenge: Challenge): UIChallenge {
  return {
    ...challenge,
    // Generate derived fields
    title: challenge.content?.substring(0, 30) + '...' || 'Untitled Challenge',
    description: challenge.content,
    category: challenge.focusArea || 'General',
    estimatedTime: '15 min', // Default value or derive from difficulty
    tags: challenge.challengeType ? [challenge.challengeType] : [],
  };
}

/**
 * Helper function to map multiple API Challenges to UI Challenges
 */
export function mapToUIChallenges(challenges: Challenge[]): UIChallenge[] {
  return challenges.map(mapToUIChallenge);
}

/**
 * Helper function to validate a Challenge with the Zod schema
 */
export function validateChallenge(data: unknown): Challenge | null {
  const result = schemas.Challenge.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Helper function to validate a User with the Zod schema
 */
export function validateUser(data: unknown): User | null {
  const result = schemas.User.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Helper function to validate an Evaluation with the Zod schema
 */
export function validateEvaluation(data: unknown): Evaluation | null {
  const result = schemas.Evaluation.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Authentication and user account related types
 */

// Auth provider type
export type AuthProvider = 'google' | 'email' | 'guest';

/**
 * UI Authentication User type
 * This extends the base User type with authentication specific fields
 */
export interface UIAuthUser extends UIUser {
  provider: AuthProvider; 
  token: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  onboardingCompleted: boolean;
}

/**
 * Login response from the authentication endpoint
 */
export interface LoginResponse {
  user: UIAuthUser;
  token: string;
}

/**
 * Request for signing up with email/password
 */
export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Request for logging in with email/password
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Helper function to map a regular User to an AuthUser
 */
export function mapToAuthUser(user: User, provider: AuthProvider, token: string): UIAuthUser {
  const uiUser = mapToUIUser(user);
  return {
    ...uiUser,
    provider,
    token,
    status: 'active', // Default to active for now
    onboardingCompleted: false // Default to false, should be updated based on user state
  };
} 