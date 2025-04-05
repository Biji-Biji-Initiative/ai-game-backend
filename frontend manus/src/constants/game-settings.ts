/**
 * Game Settings
 * 
 * Central configuration constants for the game application.
 * Using these constants instead of magic numbers/values makes the
 * code more maintainable and easier to adjust across the application.
 */

/**
 * Match threshold percentages for recommendation system
 */
export const MATCH_THRESHOLD = {
  EXCELLENT: 90, // Excellent match (90% or higher)
  GOOD: 70,      // Good match (70-89%)
  AVERAGE: 50,   // Average match (50-69%)
  LOW: 30        // Low match (30-49%)
};

/**
 * Score thresholds for strengths and skills
 */
export const STRENGTH_LEVELS = {
  EXCEPTIONAL: 90, // Exceptional (90% or higher)
  STRONG: 80,      // Strong (80-89%)
  GOOD: 70,        // Good (70-79%)
  MODERATE: 50,    // Moderate (50-69%)
  DEVELOPING: 30   // Developing (30-49%)
};

/**
 * UI text descriptions for displaying strength levels
 */
export const STRENGTH_DESCRIPTIONS = {
  [STRENGTH_LEVELS.EXCEPTIONAL]: 'Exceptional',
  [STRENGTH_LEVELS.STRONG]: 'Strong',
  [STRENGTH_LEVELS.GOOD]: 'Good',
  [STRENGTH_LEVELS.MODERATE]: 'Moderate',
  [STRENGTH_LEVELS.DEVELOPING]: 'Developing'
};

/**
 * Difficulty level type for type safety
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Difficulty level mappings (user-friendly text to system values)
 */
export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  BEGINNER: 'beginner' as DifficultyLevel,
  EASY: 'beginner' as DifficultyLevel,        // Alias
  INTERMEDIATE: 'intermediate' as DifficultyLevel,
  MEDIUM: 'intermediate' as DifficultyLevel,  // Alias
  ADVANCED: 'advanced' as DifficultyLevel,
  HARD: 'advanced' as DifficultyLevel,        // Alias
  EXPERT: 'expert' as DifficultyLevel
};

/**
 * Challenge display settings
 */
export const CHALLENGE_SETTINGS = {
  DEFAULT_ESTIMATED_TIME: '30 min',
  DEFAULT_CATEGORY: 'general',
  DEFAULT_TITLE: 'Untitled Challenge',
  DEFAULT_DESCRIPTION: 'No description provided.',
  DEFAULT_MATCH_SCORE: 85
};

/**
 * Game progression settings
 */
export const PROGRESSION_SETTINGS = {
  ROUNDS_TO_COMPLETE: 3,
  MIN_SCORE_TO_ADVANCE: 50,
  EXPERIENCE_PER_CHALLENGE: 100,
  LEVEL_UP_THRESHOLD: 1000
};

/**
 * UI animation timings
 */
export const ANIMATION_TIMING = {
  FAST: 200,    // Fast animations (e.g., hover)
  MEDIUM: 500,  // Medium animations (e.g., transitions)
  SLOW: 1000    // Slow animations (e.g., celebrations)
};

/**
 * Evaluate a score and return the corresponding strength description
 * @param score Score value (0-100)
 * @returns Description of the strength level
 */
export function getStrengthDescription(score: number): string {
  if (score >= STRENGTH_LEVELS.EXCEPTIONAL) {return STRENGTH_DESCRIPTIONS[STRENGTH_LEVELS.EXCEPTIONAL];}
  if (score >= STRENGTH_LEVELS.STRONG) {return STRENGTH_DESCRIPTIONS[STRENGTH_LEVELS.STRONG];} 
  if (score >= STRENGTH_LEVELS.GOOD) {return STRENGTH_DESCRIPTIONS[STRENGTH_LEVELS.GOOD];}
  if (score >= STRENGTH_LEVELS.MODERATE) {return STRENGTH_DESCRIPTIONS[STRENGTH_LEVELS.MODERATE];}
  return STRENGTH_DESCRIPTIONS[STRENGTH_LEVELS.DEVELOPING];
}

/**
 * Convert a user-friendly difficulty name to the system difficulty value
 * @param difficulty A difficulty string from user input
 * @returns Normalized difficulty value
 */
export function normalizeDifficulty(
  difficulty?: string | null
): DifficultyLevel {
  if (!difficulty) {return DIFFICULTY_LEVELS.INTERMEDIATE;}
  
  const normalized = difficulty.toLowerCase().trim();
  
  if (normalized.includes('begin') || normalized.includes('easy')) 
    {return DIFFICULTY_LEVELS.BEGINNER;}
  if (normalized.includes('advanc') || normalized.includes('hard')) 
    {return DIFFICULTY_LEVELS.ADVANCED;}
  if (normalized.includes('expert')) 
    {return DIFFICULTY_LEVELS.EXPERT;}
  
  return DIFFICULTY_LEVELS.INTERMEDIATE;
} 