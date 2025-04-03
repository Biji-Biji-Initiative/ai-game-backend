/**
 * Core API models used throughout the application
 */

export interface User {
  id: string;
  email: string;
  fullName?: string;
  displayName?: string;
  professionalTitle?: string;
  location?: string;
  country?: string;
  focusArea?: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  roles?: ('user' | 'admin')[];
  onboardingCompleted?: boolean;
  isActive?: boolean;
  hasCompletedProfile?: boolean;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    language?: string;
    appearance?: {
      colorScheme?: string;
      fontSize?: string;
      reduceMotion?: boolean;
      highContrast?: boolean;
    };
    learning?: {
      pacePreference?: string;
      contentComplexity?: string;
      preferredFormats?: string[];
    };
    notificationSettings?: {
      email?: boolean;
      push?: boolean;
      newsletter?: boolean;
      marketingUpdates?: boolean;
    };
    [key: string]: unknown;
  };
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  difficulty: string;
  tags: string[];
  responses?: {
    userId: string;
    response: Record<string, unknown>;
    createdAt: string;
  }[];
}

export interface Game {
  id: string;
  challengeId: string;
  players: {
    id: string;
    name: string;
    joinedAt: string;
    status?: 'waiting' | 'ready' | 'playing' | 'finished';
  }[];
  status: 'waiting' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  winner?: string;
  moves: {
    id: string;
    playerId: string;
    action: string;
    data: Record<string, unknown>;
    timestamp: string;
  }[];
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  userId: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Leaderboard {
  userId: string;
  username: string;
  wins: number;
  losses: number;
  rank: number;
  avatarUrl?: string;
}

export interface GameResult {
  gameId: string;
  challengeId: string;
  winner: string;
  players: {
    userId: string;
    score: number;
  }[];
  createdAt: string;
}

/**
 * Focus Area model
 */
export interface FocusArea {
  id: string;
  name: string;
  description: string;
  traits: string[];
}

/**
 * Human Edge Profile model
 */
/**
 * Format for traits as stored in the database
 */
export interface HumanEdgeTraits {
  [key: string]: number;
}

/**
 * Format for traits as needed by UI components
 */
export interface FormattedHumanEdgeTrait {
  name: string;
  score: number;
  description: string;
}

/**
 * Human Edge Profile containing user traits and strengths
 */
export interface HumanEdgeProfile {
  id: string;
  userId: string;
  focusArea: FocusArea;
  /** 
   * Raw traits stored as key-value pairs in the API,
   * but converted to array format for UI components
   */
  traits: FormattedHumanEdgeTrait[];
  insights: string[];
  strengthAreas: {
    name: string;
    description: string;
    score: number;
  }[];
  shareableUrl: string;
  createdAt: string;
  updatedAt: string;
}
