import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

const User = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string().optional(),
    professionalTitle: z.string().optional(),
    location: z.string().optional(),
    country: z.string().optional(),
    focusArea: z.string().optional(),
    lastActive: z.string().datetime({ offset: true }).optional(),
    createdAt: z.string().datetime({ offset: true }).optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional().default('active'),
    roles: z
      .array(z.enum(['user', 'admin']))
      .optional()
      .default(['user']),
    onboardingCompleted: z.boolean().optional().default(false),
    isActive: z.boolean().optional(),
    hasCompletedProfile: z.boolean().optional(),
    preferences: z.object({}).partial().passthrough().optional(),
  })
  .passthrough();
const PaginationParams = z
  .object({
    limit: z.number().int().gte(1).lte(100).default(20),
    offset: z.number().int().gte(0).default(0),
    sort: z.string(),
  })
  .partial()
  .passthrough();
const loginUser_Body = z.object({ email: z.string().email(), password: z.string() }).passthrough();
const registerUser_Body = z
  .object({
    email: z.string().email(),
    password: z.string(),
    fullName: z.string(),
    professionalTitle: z.string().optional(),
    location: z.string().optional(),
    country: z.string().optional(),
    focusArea: z.string().optional(),
  })
  .passthrough();
const Challenge = z
  .object({
    id: z.string().uuid(),
    content: z.string(),
    userEmail: z.string().email(),
    focusArea: z.string().optional(),
    challengeType: z.string().optional(),
    formatType: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    status: z.enum(['pending', 'submitted', 'evaluated']),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const createChallenge_Body = z
  .object({
    content: z.string(),
    userEmail: z.string().email(),
    focusArea: z.string().optional(),
    challengeType: z.string().optional(),
    formatType: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  })
  .passthrough();
const updateChallenge_Body = z
  .object({
    content: z.string(),
    focusArea: z.string(),
    challengeType: z.string(),
    formatType: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    status: z.enum(['pending', 'submitted', 'evaluated']),
  })
  .partial()
  .passthrough();
const Evaluation = z
  .object({
    id: z.string().uuid(),
    challengeId: z.string().uuid(),
    userId: z.string().uuid(),
    response: z.string().optional(),
    feedback: z.string().optional(),
    score: z.number().gte(0).lte(100).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    metrics: z
      .object({
        accuracy: z.number().gte(0).lte(100),
        creativity: z.number().gte(0).lte(100),
        reasoning: z.number().gte(0).lte(100),
      })
      .partial()
      .passthrough()
      .optional(),
    createdAt: z.string().datetime({ offset: true }),
    completedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const createEvaluation_Body = z
  .object({ challengeId: z.string().uuid(), userId: z.string().uuid(), response: z.string() })
  .passthrough();
const UserJourneyEvent = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    type: z.enum([
      'login',
      'challenge_started',
      'challenge_completed',
      'evaluation_received',
      'badge_earned',
      'level_up',
    ]),
    data: z.object({}).partial().passthrough().optional(),
    createdAt: z.string().datetime({ offset: true }),
    metadata: z.object({}).partial().passthrough().optional(),
  })
  .passthrough();
const AdaptiveRecommendation = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    type: z.enum(['challenge', 'resource', 'skill_focus', 'difficulty_adjustment']),
    contentId: z.string().uuid().optional(),
    reason: z.string().optional(),
    priority: z.number().int().gte(1).lte(10).optional(),
    status: z.enum(['active', 'dismissed', 'completed']).optional(),
    metadata: z.object({}).partial().passthrough().optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const generateDynamicChallenge_Body = z
  .object({
    focusArea: z.string(),
    preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    includeConcepts: z.array(z.string()),
  })
  .partial()
  .passthrough();
const FocusArea = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    category: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    createdAt: z.string().datetime({ offset: true }).optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const createFocusArea_Body = z
  .object({
    name: z.string(),
    description: z.string(),
    category: z.string().optional().default('general'),
    difficulty: z
      .enum(['beginner', 'intermediate', 'advanced', 'expert'])
      .optional()
      .default('intermediate'),
  })
  .passthrough();
const updateFocusArea_Body = z
  .object({
    name: z.string(),
    description: z.string(),
    category: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  })
  .partial()
  .passthrough();
const setFocusAreasForUser_Body = z
  .object({ focusAreas: z.array(z.string().uuid()) })
  .passthrough();
const generateFocusArea_Body = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional().default('general'),
    difficulty: z
      .enum(['beginner', 'intermediate', 'advanced', 'expert'])
      .optional()
      .default('intermediate'),
  })
  .passthrough();
const recordChallengeCompletion_Body = z
  .object({
    challengeId: z.string().uuid(),
    score: z.number().gte(0).lte(100),
    completionTime: z.number().int().optional(),
    skillLevels: z.record(z.number().gte(0).lte(100)).optional(),
  })
  .passthrough();
const Progress = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    challengeId: z.string().uuid().optional(),
    focusArea: z.string().optional(),
    averageScore: z.number().gte(0).lte(100).optional(),
    completionTime: z.number().int().optional(),
    skillLevels: z.record(z.number().gte(0).lte(100)).optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    level: z.number().int().gte(1).optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const updateSkillLevels_Body = z
  .object({ skillLevels: z.record(z.number().gte(0).lte(100)) })
  .passthrough();
const Personality = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    traits: z.record(z.number().gte(0).lte(100)).optional(),
    attitudes: z.record(z.number().gte(0).lte(100)).optional(),
    insights: z
      .object({
        strengths: z.array(z.string()),
        learningStyle: z.string(),
        challengeRecommendations: z.array(z.string()),
        summary: z.string(),
      })
      .partial()
      .passthrough()
      .optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const updatePersonalityTraits_Body = z
  .object({ traits: z.record(z.number().gte(0).lte(100)) })
  .passthrough();
const updateAIAttitudes_Body = z
  .object({ attitudes: z.record(z.number().gte(0).lte(100)) })
  .passthrough();
const generateInsights_Body = z
  .object({
    includeTraits: z.boolean().default(true),
    includeAttitudes: z.boolean().default(true),
    targetAreas: z.array(z.string()),
  })
  .partial()
  .passthrough();
const calculateChallengeCompatibility_Body = z
  .object({ challengeType: z.string(), challengeId: z.string().uuid().optional() })
  .passthrough();
const submitAssessment_Body = z
  .object({
    answers: z.array(
      z
        .object({
          questionId: z.string(),
          value: z.union([z.number(), z.string(), z.boolean()]),
          comments: z.string().optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();
const Prompt = z
  .object({
    id: z.string().uuid(),
    type: z.string(),
    content: z.string(),
    systemInstructions: z.string().optional(),
    parameters: z.object({}).partial().passthrough().optional(),
    version: z.string().optional(),
    createdAt: z.string().datetime({ offset: true }).optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const FilterParams = z
  .object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like']),
    value: z.string(),
  })
  .partial()
  .passthrough();

export const schemas = {
  User,
  PaginationParams,
  loginUser_Body,
  registerUser_Body,
  Challenge,
  createChallenge_Body,
  updateChallenge_Body,
  Evaluation,
  createEvaluation_Body,
  UserJourneyEvent,
  AdaptiveRecommendation,
  generateDynamicChallenge_Body,
  FocusArea,
  createFocusArea_Body,
  updateFocusArea_Body,
  setFocusAreasForUser_Body,
  generateFocusArea_Body,
  recordChallengeCompletion_Body,
  Progress,
  updateSkillLevels_Body,
  Personality,
  updatePersonalityTraits_Body,
  updateAIAttitudes_Body,
  generateInsights_Body,
  calculateChallengeCompatibility_Body,
  submitAssessment_Body,
  Prompt,
  FilterParams,
};

const endpoints = makeApi([
  {
    method: 'post',
    path: '/adaptive/dynamic-challenge',
    alias: 'generateDynamicChallenge',
    description: `Generates a challenge dynamically based on user&#x27;s skill level and learning path`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: generateDynamicChallenge_Body,
      },
    ],
    response: z.object({ success: z.boolean(), data: Challenge }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/adaptive/recommendations',
    alias: 'getAdaptiveRecommendations',
    description: `Retrieves personalized adaptive learning recommendations for the current user`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'type',
        type: 'Query',
        schema: z
          .enum(['challenge', 'resource', 'skill_focus', 'difficulty_adjustment'])
          .optional(),
      },
      {
        name: 'status',
        type: 'Query',
        schema: z.enum(['active', 'dismissed', 'completed']).optional(),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z.array(AdaptiveRecommendation),
        pagination: PaginationParams,
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/adaptive/skill-profile',
    alias: 'getUserSkillProfile',
    description: `Retrieves the current user&#x27;s skill profile based on their learning history`,
    requestFormat: 'json',
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            userId: z.string().uuid(),
            skills: z.array(
              z
                .object({
                  name: z.string(),
                  proficiency: z.number().gte(0).lte(100),
                  lastImproved: z.string().datetime({ offset: true }),
                })
                .partial()
                .passthrough()
            ),
            recommendedFocusAreas: z.array(z.string()),
            overallProficiency: z.number().gte(0).lte(100),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/auth/login',
    alias: 'loginUser',
    description: `Authenticates a user and returns a JWT token`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: loginUser_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z.object({ token: z.string(), user: User }).partial().passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Invalid credentials`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/auth/refresh',
    alias: 'refreshToken',
    description: `Uses a refresh token to generate a new JWT access token`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ refreshToken: z.string() }).partial().passthrough().optional(),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z.object({ token: z.string(), user: User }).partial().passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Invalid or expired refresh token`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 403,
        description: `Refresh token has been revoked`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/auth/register',
    alias: 'registerUser',
    description: `Creates a new user account`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: registerUser_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z.object({ token: z.string(), user: User }).partial().passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 409,
        description: `User already exists`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/challenges',
    alias: 'getAllChallenges',
    description: `Retrieves a list of all challenges with pagination`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'sort',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'filter',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({ success: z.boolean(), data: z.array(Challenge), pagination: PaginationParams })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/challenges',
    alias: 'createChallenge',
    description: `Creates a new challenge in the system`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: createChallenge_Body,
      },
    ],
    response: z.object({ success: z.boolean(), data: Challenge }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/challenges/:id',
    alias: 'getChallengeById',
    description: `Retrieves a challenge by its unique identifier`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), data: Challenge }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'put',
    path: '/challenges/:id',
    alias: 'updateChallenge',
    description: `Updates an existing challenge`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: updateChallenge_Body,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), data: Challenge }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'delete',
    path: '/challenges/:id',
    alias: 'deleteChallenge',
    description: `Deletes an existing challenge`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/evaluations',
    alias: 'getAllEvaluations',
    description: `Retrieves a list of all evaluations with pagination`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'sort',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'filter',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({ success: z.boolean(), data: z.array(Evaluation), pagination: PaginationParams })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/evaluations',
    alias: 'createEvaluation',
    description: `Creates a new evaluation for a challenge`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: createEvaluation_Body,
      },
    ],
    response: z.object({ success: z.boolean(), data: Evaluation }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/evaluations/:id',
    alias: 'getEvaluationById',
    description: `Retrieves an evaluation by its unique identifier`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), data: Evaluation }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/focus-areas',
    alias: 'getAllFocusAreas',
    description: `Retrieves a list of all available focus areas`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'sort',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'category',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'difficulty',
        type: 'Query',
        schema: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
      },
    ],
    response: z
      .object({ success: z.boolean(), data: z.array(FocusArea), pagination: PaginationParams })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/focus-areas',
    alias: 'createFocusArea',
    description: `Creates a new focus area (admin only)`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: createFocusArea_Body,
      },
    ],
    response: z.object({ success: z.boolean(), data: FocusArea }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 403,
        description: `Forbidden - requires admin access`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/focus-areas/:id',
    alias: 'getFocusAreaById',
    description: `Retrieves a focus area by its unique identifier`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), data: FocusArea }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'put',
    path: '/focus-areas/:id',
    alias: 'updateFocusArea',
    description: `Updates an existing focus area (admin only)`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: updateFocusArea_Body,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), data: FocusArea }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 403,
        description: `Forbidden - requires admin access`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'delete',
    path: '/focus-areas/:id',
    alias: 'deleteFocusArea',
    description: `Deletes an existing focus area (admin only)`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 403,
        description: `Forbidden - requires admin access`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/focus-areas/generate',
    alias: 'generateFocusArea',
    description: `Uses AI to generate a new focus area (admin only)`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: generateFocusArea_Body,
      },
    ],
    response: z.object({ success: z.boolean(), data: FocusArea }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 403,
        description: `Forbidden - requires admin access`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/health',
    alias: 'getHealth',
    description: `Returns detailed health status of the API including database and OpenAI service availability`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'format',
        type: 'Query',
        schema: z.enum(['json', 'text']).optional().default('json'),
      },
    ],
    response: z
      .object({
        status: z.enum(['success', 'error']),
        message: z.string(),
        timestamp: z.string().datetime({ offset: true }),
        uptime: z.number(),
        dependencies: z
          .object({
            database: z
              .object({
                status: z.enum(['healthy', 'unhealthy', 'error', 'unknown']),
                message: z.string(),
              })
              .partial()
              .passthrough(),
            openai: z
              .object({
                status: z.enum(['healthy', 'unhealthy', 'error', 'unknown']),
                message: z.string(),
              })
              .partial()
              .passthrough(),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 500,
        description: `Error during health check`,
        schema: z.object({ status: z.string(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 503,
        description: `API is unhealthy`,
        schema: z
          .object({
            status: z.string(),
            message: z.string(),
            timestamp: z.string().datetime({ offset: true }),
            dependencies: z
              .object({
                database: z
                  .object({ status: z.string(), message: z.string() })
                  .partial()
                  .passthrough(),
                openai: z.object({}).partial().passthrough(),
              })
              .partial()
              .passthrough(),
          })
          .partial()
          .passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/personality/assessment',
    alias: 'submitAssessment',
    description: `Submits answers to a personality assessment questionnaire`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: submitAssessment_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            id: z.string().uuid(),
            status: z.enum(['pending', 'processing', 'completed', 'failed']),
            profileUpdated: z.boolean(),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'put',
    path: '/personality/attitudes',
    alias: 'updateAIAttitudes',
    description: `Updates the user&#x27;s attitudes towards AI`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: updateAIAttitudes_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            attitudes: z.record(z.number()),
            updatedAt: z.string().datetime({ offset: true }),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/personality/compatibility',
    alias: 'calculateChallengeCompatibility',
    description: `Calculates compatibility between user personality and challenge types`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: calculateChallengeCompatibility_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            compatibility: z.number().gte(0).lte(100),
            strengths: z.array(z.string()),
            challenges: z.array(z.string()),
            recommendedApproach: z.string(),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `Personality profile not found`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/personality/insights',
    alias: 'getInsights',
    description: `Retrieves previously generated insights for the user`,
    requestFormat: 'json',
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            insights: z
              .object({
                strengths: z.array(z.string()),
                learningStyle: z.string(),
                challengeRecommendations: z.array(z.string()),
                summary: z.string(),
              })
              .partial()
              .passthrough(),
            generatedAt: z.string().datetime({ offset: true }),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `No insights found`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'post',
    path: '/personality/insights/generate',
    alias: 'generateInsights',
    description: `Generates insights based on the user&#x27;s personality profile`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: generateInsights_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            insights: z
              .object({
                strengths: z.array(z.string()),
                learningStyle: z.string(),
                challengeRecommendations: z.array(z.string()),
                summary: z.string(),
              })
              .partial()
              .passthrough(),
            generatedAt: z.string().datetime({ offset: true }),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `No personality data found`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'get',
    path: '/personality/profile',
    alias: 'getPersonalityProfile',
    description: `Retrieves the current user&#x27;s personality profile and insights`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeInsights',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
      {
        name: 'includeTraits',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
      {
        name: 'includeAttitudes',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: z.object({ success: z.boolean(), data: Personality }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `Profile not found`,
        schema: z.void(),
      },
    ],
  },
  {
    method: 'put',
    path: '/personality/traits',
    alias: 'updatePersonalityTraits',
    description: `Updates the user&#x27;s personality traits`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: updatePersonalityTraits_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            traits: z.record(z.number()),
            updatedAt: z.string().datetime({ offset: true }),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/progress',
    alias: 'getUserProgress',
    description: `Retrieves the overall progress for the current user`,
    requestFormat: 'json',
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            progress: z
              .object({
                overall: z.number().gte(0).lte(100),
                level: z.number().int(),
                skillLevels: z.record(z.number()),
                challengesCompleted: z.number().int(),
                lastActive: z.string().datetime({ offset: true }),
              })
              .partial()
              .passthrough(),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/progress/all',
    alias: 'getAllUserProgress',
    description: `Retrieves all progress records for the current user`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'sort',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            progressRecords: z.array(
              z
                .object({
                  id: z.string().uuid(),
                  challengeId: z.string().uuid(),
                  focusArea: z.string(),
                  averageScore: z.number(),
                  completedAt: z.string().datetime({ offset: true }),
                })
                .partial()
                .passthrough()
            ),
            count: z.number().int(),
            pagination: PaginationParams,
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/progress/challenge/:challengeId',
    alias: 'getChallengeProgress',
    description: `Retrieves the user&#x27;s progress for a specific challenge`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'challengeId',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            challengeId: z.string().uuid(),
            score: z.number(),
            completionTime: z.number().int(),
            skillLevels: z.record(z.number()),
            strengths: z.array(z.string()),
            weaknesses: z.array(z.string()),
            completedAt: z.string().datetime({ offset: true }),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'post',
    path: '/progress/complete',
    alias: 'recordChallengeCompletion',
    description: `Records the completion of a challenge for the current user`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: recordChallengeCompletion_Body,
      },
    ],
    response: z.object({ success: z.boolean(), data: Progress }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'put',
    path: '/progress/focus-area',
    alias: 'setFocusArea',
    description: `Sets the user&#x27;s current focus area`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ focusArea: z.string() }).passthrough(),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({ focusArea: z.string(), updatedAt: z.string().datetime({ offset: true }) })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'put',
    path: '/progress/skills',
    alias: 'updateSkillLevels',
    description: `Updates the user&#x27;s skill levels`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: updateSkillLevels_Body,
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            skillLevels: z.record(z.number()),
            updatedAt: z.string().datetime({ offset: true }),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/prompts',
    alias: 'getAllPrompts',
    description: `Retrieves a list of all available prompts with pagination`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'sort',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'type',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({ success: z.boolean(), data: z.array(Prompt), pagination: PaginationParams })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/user-journey/events',
    alias: 'getUserJourneyEvents',
    description: `Retrieves all events in the current user&#x27;s journey`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'type',
        type: 'Query',
        schema: z
          .enum([
            'login',
            'challenge_started',
            'challenge_completed',
            'evaluation_received',
            'badge_earned',
            'level_up',
          ])
          .optional(),
      },
      {
        name: 'fromDate',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'toDate',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z.array(UserJourneyEvent),
        pagination: PaginationParams,
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/user-journey/progress',
    alias: 'getUserProgress',
    description: `Retrieves the user&#x27;s overall progress in their learning journey`,
    requestFormat: 'json',
    response: z
      .object({
        success: z.boolean(),
        data: z
          .object({
            userId: z.string().uuid(),
            totalChallenges: z.number().int(),
            totalPoints: z.number().int(),
            rank: z.string(),
            level: z.number().int(),
            badges: z.array(
              z
                .object({
                  id: z.string().uuid(),
                  name: z.string(),
                  description: z.string(),
                  earnedAt: z.string().datetime({ offset: true }),
                })
                .partial()
                .passthrough()
            ),
            nextMilestone: z
              .object({ description: z.string(), progress: z.number().gte(0).lte(100) })
              .partial()
              .passthrough(),
          })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/user-journey/timeline',
    alias: 'getUserTimeline',
    description: `Retrieves a chronological timeline of the user&#x27;s journey`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'includeDetails',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
    ],
    response: z
      .object({
        success: z.boolean(),
        data: z.array(
          z
            .object({ date: z.string(), events: z.array(UserJourneyEvent) })
            .partial()
            .passthrough()
        ),
        pagination: PaginationParams,
      })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/users',
    alias: 'getAllUsers',
    description: `Retrieves a list of all users with pagination`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'limit',
        type: 'Query',
        schema: z.number().int().gte(1).lte(100).optional().default(20),
      },
      {
        name: 'offset',
        type: 'Query',
        schema: z.number().int().gte(0).optional().default(0),
      },
      {
        name: 'sort',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'filter',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z
      .object({ success: z.boolean(), data: z.array(User), pagination: PaginationParams })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/users/:id',
    alias: 'getUserById',
    description: `Retrieves a user by their unique identifier`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), data: User }).partial().passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'get',
    path: '/users/:userId/focus-areas',
    alias: 'getFocusAreasForUser',
    description: `Retrieves the focus areas assigned to a specific user`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'userId',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z
      .object({ success: z.boolean(), data: z.array(FocusArea) })
      .partial()
      .passthrough(),
    errors: [
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
  {
    method: 'put',
    path: '/users/:userId/focus-areas',
    alias: 'setFocusAreasForUser',
    description: `Assigns focus areas to a specific user`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: setFocusAreasForUser_Body,
      },
      {
        name: 'userId',
        type: 'Path',
        schema: z.string().uuid(),
      },
    ],
    response: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `The request data failed validation`,
        schema: z
          .object({
            success: z.boolean(),
            message: z.string(),
            errors: z.array(
              z.object({ field: z.string(), message: z.string() }).partial().passthrough()
            ),
          })
          .partial()
          .passthrough(),
      },
      {
        status: 401,
        description: `Authentication information is missing or invalid`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
      {
        status: 404,
        description: `The specified resource was not found`,
        schema: z.object({ success: z.boolean(), message: z.string() }).partial().passthrough(),
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
