'use client';

/**
 * Evaluation Service
 * 
 * Provides React Query hooks for evaluation-related API operations
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ApiResponse } from '../apiResponse';

/**
 * Types for evaluation data structures
 */
export interface EvaluationCategory {
  id: string;
  name: string;
  score: number;
  feedback: string;
}

export interface RoundEvaluation {
  roundNumber: number;
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  categories: EvaluationCategory[];
  summary: string;
  timestamp: string;
}

export interface GetEvaluationRequest {
  userEmail?: string;
  roundNumber: number;
  challengeId?: string;
}

// --- Mock Data ---
const mockRound1Eval: RoundEvaluation = {
  roundNumber: 1,
  overallScore: 75,
  strengths: ["Clearly defined the problem", "Identified key stakeholders"],
  areasForImprovement: ["Could explore alternative solutions more deeply"],
  categories: [
    { id: 'cat-clarity-1', name: 'Clarity', score: 80, feedback: "Good initial definition of the challenge."},
    { id: 'cat-crit-1', name: 'Critical Thinking', score: 70, feedback: "Stakeholder analysis was relevant."}
  ],
  summary: "Solid start, showed good understanding of the core issue.",
  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // ~2 hours ago
};

const mockRound2Eval: RoundEvaluation = {
  roundNumber: 2,
  overallScore: 85,
  strengths: ["Strong empathetic response", "Considered AI limitations effectively"],
  areasForImprovement: ["Could provide more specific action steps"],
  categories: [
    { id: 'cat-empathy-2', name: 'Empathy', score: 90, feedback: "Showed excellent understanding of user perspective."},
    { id: 'cat-adapt-2', name: 'Adaptability', score: 80, feedback: "Responded well to changing constraints."}
  ],
  summary: "Great improvement in considering the human element and AI's role.",
  timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // ~1 hour ago
};

const mockRound3Eval: RoundEvaluation = {
  roundNumber: 3,
  overallScore: 80,
  strengths: ["Provided concrete examples", "Logical flow of argument"],
  areasForImprovement: ["Could refine the final recommendation slightly"],
  categories: [
    { id: 'cat-logic-3', name: 'Logical Reasoning', score: 85, feedback: "Argument was well-structured."},
    { id: 'cat-conc-3', name: 'Concreteness', score: 75, feedback: "Examples helped illustrate the point."}
  ],
  summary: "Strong finish, demonstrating practical application of insights.",
  timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString() // ~30 mins ago
};

const allMockEvaluations: RoundEvaluation[] = [mockRound1Eval, mockRound2Eval, mockRound3Eval];
// --- End Mock Data ---

/**
 * Hook to fetch evaluation data for a specific round (MOCKED)
 */
export const useGetRoundEvaluation = (roundNumber: number, enabled: boolean = true) => {
  return useQuery<ApiResponse<RoundEvaluation>, Error>({
    queryKey: ['evaluation', roundNumber],
    queryFn: async (): Promise<ApiResponse<RoundEvaluation>> => {
       // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      const mockData = allMockEvaluations.find(ev => ev.roundNumber === roundNumber);
      if (mockData) {
        return { data: mockData, status: 200, success: true, error: undefined };
      } else {
         // Simulate not found
         return { data: undefined, status: 404, success: false, error: { message: `Evaluation for round ${roundNumber} not found.` } };
      }
      // Original call: apiClient.get<RoundEvaluation>(`/evaluations/round/${roundNumber}`, { roundNumber: roundNumber.toString() })
    },
    enabled: enabled && !!roundNumber,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch all round evaluations for the current user (MOCKED)
 */
export const useGetAllEvaluations = (enabled: boolean = true) => {
  return useQuery<ApiResponse<RoundEvaluation[]>, Error>({
    queryKey: ['evaluations'],
    queryFn: async (): Promise<ApiResponse<RoundEvaluation[]>> => {
       // Simulate API call delay
       await new Promise(resolve => setTimeout(resolve, 600));
       // Simulate success
       return { data: allMockEvaluations, status: 200, success: true, error: undefined };
      // Original call: apiClient.get<RoundEvaluation[]>('/evaluations')
    },
    enabled,
    refetchOnWindowFocus: false,
  });
};
