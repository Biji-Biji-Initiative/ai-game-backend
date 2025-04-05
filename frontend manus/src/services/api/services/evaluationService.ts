'use client';

/**
 * Evaluation Service
 * 
 * Provides React Query hooks for evaluation-related API operations
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { UIEvaluation } from '../../../types/api';
import { schemas } from '../../../lib/api/generated-zodios-client';
import { z } from 'zod';

// Import from schema
export type Evaluation = z.infer<typeof schemas.Evaluation>;

/**
 * Types for request parameters
 */
export interface GetEvaluationRequest {
  userEmail?: string;
  roundNumber: number;
  challengeId?: string;
}

// --- Mock Data ---
const mockRound1Eval: UIEvaluation = {
  id: 'eval-1',
  challengeId: 'challenge-1',
  userId: 'user-1',
  roundNumber: 1,
  overallScore: 75,
  strengths: ["Clearly defined the problem", "Identified key stakeholders"],
  areasForImprovement: ["Could explore alternative solutions more deeply"],
  categories: [
    { id: 'cat-clarity-1', name: 'Clarity', score: 80, feedback: "Good initial definition of the challenge."},
    { id: 'cat-crit-1', name: 'Critical Thinking', score: 70, feedback: "Stakeholder analysis was relevant."}
  ],
  summary: "Solid start, showed good understanding of the core issue.",
  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // ~2 hours ago
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  metrics: JSON.stringify({
    clarity: 80,
    criticalThinking: 70,
    roundNumber: 1,
    strengths: ["Clearly defined the problem", "Identified key stakeholders"],
    areasForImprovement: ["Could explore alternative solutions more deeply"]
  }),
  feedback: "Solid start, showed good understanding of the core issue."
};

const mockRound2Eval: UIEvaluation = {
  id: 'eval-2',
  challengeId: 'challenge-1',
  userId: 'user-1',
  roundNumber: 2,
  overallScore: 85,
  strengths: ["Strong empathetic response", "Considered AI limitations effectively"],
  areasForImprovement: ["Could provide more specific action steps"],
  categories: [
    { id: 'cat-empathy-2', name: 'Empathy', score: 90, feedback: "Showed excellent understanding of user perspective."},
    { id: 'cat-adapt-2', name: 'Adaptability', score: 80, feedback: "Responded well to changing constraints."}
  ],
  summary: "Great improvement in considering the human element and AI's role.",
  timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // ~1 hour ago
  createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  metrics: JSON.stringify({
    empathy: 90,
    adaptability: 80,
    roundNumber: 2,
    strengths: ["Strong empathetic response", "Considered AI limitations effectively"],
    areasForImprovement: ["Could provide more specific action steps"]
  }),
  feedback: "Great improvement in considering the human element and AI's role."
};

const mockRound3Eval: UIEvaluation = {
  id: 'eval-3',
  challengeId: 'challenge-1',
  userId: 'user-1',
  roundNumber: 3,
  overallScore: 80,
  strengths: ["Provided concrete examples", "Logical flow of argument"],
  areasForImprovement: ["Could refine the final recommendation slightly"],
  categories: [
    { id: 'cat-logic-3', name: 'Logical Reasoning', score: 85, feedback: "Argument was well-structured."},
    { id: 'cat-conc-3', name: 'Concreteness', score: 75, feedback: "Examples helped illustrate the point."}
  ],
  summary: "Strong finish, demonstrating practical application of insights.",
  timestamp: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), // ~30 mins ago
  createdAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(),
  metrics: JSON.stringify({
    logicalReasoning: 85,
    concreteness: 75,
    roundNumber: 3,
    strengths: ["Provided concrete examples", "Logical flow of argument"],
    areasForImprovement: ["Could refine the final recommendation slightly"]
  }),
  feedback: "Strong finish, demonstrating practical application of insights."
};

const allMockEvaluations: UIEvaluation[] = [mockRound1Eval, mockRound2Eval, mockRound3Eval];
// --- End Mock Data ---

/**
 * Hook to fetch evaluation data for a specific round (MOCKED)
 */
export const useGetRoundEvaluation = (roundNumber: number, enabled: boolean = true) => {
  return useQuery<ApiResponse<UIEvaluation>, Error>({
    queryKey: ['evaluation', roundNumber],
    queryFn: async (): Promise<ApiResponse<UIEvaluation>> => {
       // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      const mockData = allMockEvaluations.find(ev => ev.roundNumber === roundNumber);
      if (mockData) {
        return { data: mockData, status: 200, success: true, error: undefined };
      } else {
         // Simulate not found
         return { 
           data: undefined as unknown as UIEvaluation, 
           status: 404, 
           success: false, 
           error: { 
             code: 'NOT_FOUND',
             message: `Evaluation for round ${roundNumber} not found.` 
           } 
         };
      }
    },
    enabled: enabled && !!roundNumber,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch all round evaluations for the current user (MOCKED)
 */
export const useGetAllEvaluations = (enabled: boolean = true) => {
  return useQuery<ApiResponse<UIEvaluation[]>, Error>({
    queryKey: ['evaluations'],
    queryFn: async (): Promise<ApiResponse<UIEvaluation[]>> => {
       // Simulate API call delay
       await new Promise(resolve => setTimeout(resolve, 600));
       // Simulate success
       return { data: allMockEvaluations, status: 200, success: true, error: undefined };
    },
    enabled,
    refetchOnWindowFocus: false,
  });
};
