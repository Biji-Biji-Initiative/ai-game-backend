/**
 * API Services Mocks
 * 
 * This file contains mock implementations for all API service hooks.
 * These mocks can be imported directly in test files.
 */

import { vi } from 'vitest';

// Mock refetch functions
export const mockGetAIResponseRefetch = vi.fn();
export const mockGenerateChallengeRefetch = vi.fn();
export const mockSubmitResponseMutate = vi.fn();
export const mockGenerateProfileMutate = vi.fn();

// Mock API response getters
export const getMockAIResponse = (override = {}) => ({
  data: { 
    success: true, 
    data: { 
      content: 'Mock AI Response',
      analysis: { clarity: 8, depth: 7 }
    } 
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: mockGetAIResponseRefetch,
  ...override
});

export const getMockSubmitResponse = (override = {}) => ({
  mutateAsync: mockSubmitResponseMutate,
  isLoading: false,
  isError: false,
  error: null,
  ...override
});

export const getMockGenerateChallenge = (override = {}) => ({
  mutateAsync: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'mock-challenge-1',
      title: 'Mock Challenge',
      description: 'This is a mock challenge',
      difficulty: 'intermediate',
      focusArea: 'creativity'
    }
  }),
  isLoading: false,
  ...override
});

export const getMockGenerateProfile = (override = {}) => ({
  mutateAsync: mockGenerateProfileMutate.mockResolvedValue({
    success: true,
    data: {
      id: 'profile-1',
      strengths: ['Creativity', 'Empathy'],
      insights: 'Mock insights',
      recommendations: ['Rec 1', 'Rec 2']
    }
  }),
  isLoading: false,
  ...override
});

// Reset all mocks
export const resetApiMocks = () => {
  mockGetAIResponseRefetch.mockReset();
  mockGenerateChallengeRefetch.mockReset();
  mockSubmitResponseMutate.mockReset().mockResolvedValue({ success: true });
  mockGenerateProfileMutate.mockReset().mockResolvedValue({
    success: true,
    data: {
      id: 'profile-1',
      strengths: ['Creativity', 'Empathy'],
      insights: 'Mock insights',
      recommendations: ['Rec 1', 'Rec 2']
    }
  });
}; 