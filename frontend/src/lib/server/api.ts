/**
 * Server-side API utilities
 * 
 * Contains functions for fetching data on the server, designed to mimic
 * the client-side hooks in a server-compatible way.
 */

import type { ProgressSummary, SkillProgress, JourneyEvent } from '@/services/api/services/progressService';
import type { ApiResponse } from '@/services/api/apiResponse';

// Base API URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Get progress summary from backend server
 */
export async function getProgressSummary(userId: string): Promise<ApiResponse<ProgressSummary>> {
  if (!userId) {
    // Return mock data for users without IDs
    return getMockProgressSummary("default-user");
  }

  try {
    // In production, this would fetch from your actual backend API
    const response = await fetch(`${API_BASE_URL}/users/${userId}/progress`, {
      headers: {
        'Content-Type': 'application/json',
        // Include auth token here if needed
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch progress: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching progress data:", error);
    // Fallback to mock data if API fails
    return getMockProgressSummary(userId);
  }
}

// Helper to generate mock progress data
function getMockProgressSummary(userId: string): ApiResponse<ProgressSummary> {
  const mockSummary: ProgressSummary = {
    userId,
    overall: 75,
    level: 4,
    totalBadges: 8,
    totalChallenges: 20,
    challengesCompleted: 15,
    streakDays: 5,
    skillLevels: {
      'critical-thinking': 3,
      'problem-solving': 4,
      'ai-collaboration': 3,
    },
    lastActive: new Date().toISOString(),
    overallProgress: 75,
  };
  
  return {
    success: true,
    status: 200,
    data: mockSummary,
  };
}

/**
 * Get skill progress from backend server
 */
export async function getSkillProgress(userId: string): Promise<ApiResponse<SkillProgress>> {
  if (!userId) {
    // Return mock data for users without IDs
    return getMockSkillProgress("default-user");
  }

  try {
    // In production, this would fetch from your actual backend API
    const response = await fetch(`${API_BASE_URL}/users/${userId}/skills`, {
      headers: {
        'Content-Type': 'application/json',
        // Include auth token here if needed
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching skill data:", error);
    // Fallback to mock data if API fails
    return getMockSkillProgress(userId);
  }
}

// Helper to generate mock skill data
function getMockSkillProgress(_userId: string): ApiResponse<SkillProgress> {
  const mockProgress: SkillProgress = {
    progressRecords: [
      {
        id: 'record-1',
        challengeId: 'challenge-1',
        focusArea: 'critical-thinking',
        averageScore: 85,
        completedAt: new Date().toISOString(),
      },
    ],
    skills: [
      {
        id: 'skill-1',
        name: 'Critical Thinking',
        level: 3,
        progress: 75,
      },
      {
        id: 'skill-2',
        name: 'Problem Solving',
        level: 4,
        progress: 85,
      },
      {
        id: 'skill-3',
        name: 'AI Collaboration',
        level: 3,
        progress: 65,
      },
    ],
    count: 1,
    pagination: {
      total: 15,
      perPage: 10,
      currentPage: 1,
      totalPages: 2,
    },
  };
  
  return {
    success: true,
    status: 200,
    data: mockProgress,
  };
}

/**
 * Get user journey events from backend server
 */
export async function getUserJourneyEvents(userId: string): Promise<ApiResponse<JourneyEvent[]>> {
  if (!userId) {
    // Return mock data for users without IDs
    return getMockJourneyEvents("default-user");
  }

  try {
    // In production, this would fetch from your actual backend API
    const response = await fetch(`${API_BASE_URL}/users/${userId}/journey`, {
      headers: {
        'Content-Type': 'application/json',
        // Include auth token here if needed
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch journey events: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching journey data:", error);
    // Fallback to mock data if API fails
    return getMockJourneyEvents(userId);
  }
}

// Helper to generate mock journey events
function getMockJourneyEvents(userId: string): ApiResponse<JourneyEvent[]> {
  const mockEvents: JourneyEvent[] = [
    {
      id: 'event-1',
      userId,
      type: 'CHALLENGE_COMPLETED',
      data: {
        challengeId: 'challenge-1',
        score: 85,
        description: 'Completed Critical Thinking Challenge',
      },
      metadata: {
        difficulty: 'intermediate',
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event-2',
      userId,
      type: 'BADGE_EARNED',
      data: {
        badgeId: 'badge-1',
        description: 'Earned Problem Solver Badge',
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 'event-3',
      userId,
      type: 'LEVEL_UP',
      data: {
        level: 3,
        description: 'Advanced to Level 3',
      },
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ];
  
  return {
    success: true,
    status: 200,
    data: mockEvents,
  };
}

/**
 * For simplicity, we're not using cookies() to extract the userId
 * Since this function is complicated by Next.js version-specific issues.
 * 
 * In a real app, this would use proper server-side auth mechanisms
 * to identify the current user, like:
 * - Reading secure, HTTP-only cookies and validating them
 * - Using NextAuth.js or similar auth libraries
 * - Reading session data from a database
 * 
 * For now, just return null to indicate no user ID was found server-side.
 * The client component will handle auth through its useGameStore.
 */
export function getCurrentUserId(): string | null {
  // For demonstration purposes, return null
  // In a real app, you would implement proper server-side auth here
  return null;
} 