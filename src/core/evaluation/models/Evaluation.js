/**
 * Enhanced Evaluation Domain Model
 * 
 * Core entity for evaluations of user challenge responses with enhanced user context,
 * growth tracking, and personalized feedback.
 * 
 * @module Evaluation
 */

const { v4: uuidv4 } = require('uuid');
const evaluationCategoryRepository = require('../repositories/evaluationCategoryRepository');

/**
 * Enhanced Evaluation class representing comprehensive assessment of a user's challenge response
 */
class Evaluation {
  /**
   * Create an Evaluation instance
   * @param {Object} data - Evaluation data
   * @param {string} data.userId - User ID
   * @param {string} data.challengeId - Challenge ID
   * @param {number} data.score - Overall score (0-100)
   * @param {Object} data.categoryScores - Category scores
   * @param {string} [data.id] - Unique identifier (generated if not provided)
   * @param {string} [data.overallFeedback] - Comprehensive feedback on the response
   * @param {Array<string>} [data.strengths] - Identified strengths in the response
   * @param {Array<Object>} [data.strengthAnalysis] - Detailed analysis of strengths
   * @param {Array<string>} [data.areasForImprovement] - Areas for improvement identified
   * @param {Array<Object>} [data.improvementPlans] - Detailed plans for each improvement area
   * @param {string} [data.nextSteps] - Recommended next steps for the user
   * @param {Array<string>} [data.recommendedResources] - Resources to help improve
   * @param {Array<string>} [data.recommendedChallenges] - Next challenges to try
   * @param {string} [data.responseId] - OpenAI response ID for tracking
   * @param {string} [data.threadId] - Thread ID for stateful conversations
   * @param {Object} [data.userContext] - User-specific context for personalized evaluations
   * @param {Object} [data.growthMetrics] - Tracking metrics for user's growth over time
   * @param {Object} [data.metrics] - Additional evaluation metrics
   * @param {Object} [data.metadata] - Additional evaluation metadata
   * @throws {Error} If required data is missing
   */
  constructor(data = {}) {
    if (!data || typeof data !== 'object') {
      throw new Error('Evaluation data must be an object');
    }
    
    // Validate required fields
    if (!data.userId) {
      throw new Error('User ID is required for evaluation');
    }
    
    if (!data.challengeId) {
      throw new Error('Challenge ID is required for evaluation');
    }
    
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
      throw new Error('Valid score (0-100) is required for evaluation');
    }
    
    if (!data.categoryScores || Object.keys(data.categoryScores).length === 0) {
      throw new Error('Category scores are required for evaluation');
    }
    
    // Core properties
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.challengeId = data.challengeId;
    this.score = data.score;
    this.scorePercent = 0;
    
    // Category scores
    this.categoryScores = data.categoryScores;
    this.relevantScores = {}; // Initialize relevantScores
    
    // Feedback properties
    this.overallFeedback = data.overallFeedback || '';
    this.strengths = data.strengths || [];
    this.strengthAnalysis = data.strengthAnalysis || [];
    this.areasForImprovement = data.areasForImprovement || [];
    this.improvementPlans = data.improvementPlans || [];
    this.nextSteps = data.nextSteps || '';
    
    // User growth and recommendations
    this.recommendedResources = data.recommendedResources || [];
    this.recommendedChallenges = data.recommendedChallenges || [];
    
    // User context and growth tracking - NEW
    this.userContext = data.userContext || {
      skillLevel: 'unknown',
      focusAreas: [],
      learningGoals: [],
      previousScores: {},
      completedChallengeCount: 0
    };
    
    this.growthMetrics = data.growthMetrics || {
      scoreChange: 0,
      categoryScoreChanges: {},
      improvementRate: 0,
      consistentStrengths: [],
      persistentWeaknesses: [],
      lastEvaluationId: null
    };
    
    // Optional properties
    this.responseId = data.responseId || null;
    this.threadId = data.threadId || null;
    this.metrics = data.metrics || this.calculateMetrics();
    this.metadata = data.metadata || {
      version: '2.0',
      evaluationType: 'enhanced',
      evaluationTimestamp: new Date().toISOString()
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Challenge context - NEW
    this.challengeContext = data.challengeContext || {
      title: '',
      type: '',
      focusArea: '',
      difficulty: 'intermediate',
      categoryWeights: {}
    };
    
    // Calculate metrics if we have enough data
    if (this.score > 0 && Object.keys(this.categoryScores).length > 0) {
      this.calculateMetrics();
    }
  }
  
  /**
   * Calculate derived metrics from the evaluation
   * @returns {Object} Metrics calculated from evaluation data
   * @private
   */
  calculateMetrics() {
    // Normalize score to 0-100 if needed
    const normalizedScore = this.score <= 10 ? Math.round(this.score * 10) : this.score;
    
    // Determine performance level with more nuanced gradations
    let performanceLevel;
    if (normalizedScore >= 95) performanceLevel = 'exceptional';
    else if (normalizedScore >= 85) performanceLevel = 'excellent';
    else if (normalizedScore >= 75) performanceLevel = 'very good';
    else if (normalizedScore >= 65) performanceLevel = 'good';
    else if (normalizedScore >= 55) performanceLevel = 'satisfactory';
    else if (normalizedScore >= 45) performanceLevel = 'average';
    else if (normalizedScore >= 35) performanceLevel = 'needs improvement';
    else if (normalizedScore >= 25) performanceLevel = 'below average';
    else performanceLevel = 'poor';

    // Calculate category performance levels with more detail
    const categoryPerformanceLevels = {};
    const categoryStrengths = [];
    const categoryWeaknesses = [];
    
    if (this.categoryScores) {
      Object.entries(this.categoryScores).forEach(([category, score]) => {
        let level;
        // More granular performance levels
        if (score >= 95) level = 'exceptional';
        else if (score >= 85) level = 'excellent';
        else if (score >= 75) level = 'very good';
        else if (score >= 65) level = 'good';
        else if (score >= 55) level = 'satisfactory';
        else if (score >= 45) level = 'average';
        else if (score >= 35) level = 'needs improvement';
        else if (score >= 25) level = 'below average';
        else level = 'poor';
        
        categoryPerformanceLevels[category] = level;
        
        // Identify top strengths and weaknesses by category
        if (score >= 80) categoryStrengths.push(category);
        if (score <= 50) categoryWeaknesses.push(category);
      });
    }
    
    // Calculate weighted score if category scores and weights are available
    let weightedScore = null;
    if (Object.keys(this.categoryScores).length > 0 && 
        (this.metadata?.categoryWeights || this.challengeContext?.categoryWeights)) {
        
      const weights = this.metadata?.categoryWeights || this.challengeContext?.categoryWeights || {};
      let total = 0;
      let weightSum = 0;
      
      Object.entries(this.categoryScores).forEach(([category, score]) => {
        if (weights[category]) {
          total += score * weights[category];
          weightSum += weights[category];
        }
      });
      
      if (weightSum > 0) {
        weightedScore = Math.round(total / weightSum);
      }
    }
    
    // Growth-related metrics - NEW
    const previousScores = this.userContext?.previousScores || {};
    const focusAreaScores = {};
    let focusAreaAverage = 0;
    
    // Calculate focus area performance
    if (this.userContext?.focusAreas && Array.isArray(this.userContext.focusAreas)) {
      const relevantCategories = this.mapFocusAreasToCategories(this.userContext.focusAreas);
      let totalFocusScore = 0;
      let countFocusCategories = 0;
      
      relevantCategories.forEach(category => {
        if (this.categoryScores[category] !== undefined) {
          focusAreaScores[category] = this.categoryScores[category];
          totalFocusScore += this.categoryScores[category];
          countFocusCategories++;
        }
      });
      
      if (countFocusCategories > 0) {
        focusAreaAverage = Math.round(totalFocusScore / countFocusCategories);
      }
    }
    
    // Calculate improvement from previous evaluations - NEW
    const improvementMetrics = this.calculateImprovementMetrics(previousScores);
    
    // Calculate percent of maximum possible score
    if (this.categoryScores && Object.keys(this.categoryScores).length > 0) {
      const totalScore = Object.values(this.categoryScores).reduce((sum, score) => sum + score, 0);
      const maxPossibleScore = 100; // Assuming normalized scores
      this.scorePercent = Math.round((this.score / maxPossibleScore) * 100);
    } else {
      this.scorePercent = 0;
    }
    
    // Calculate relevance to focus areas if user context is available
    if (this.userContext?.focusAreas && Array.isArray(this.userContext.focusAreas)) {
      const relevantCategories = this.mapFocusAreasToCategories(this.userContext.focusAreas);
      
      // Ensure relevantCategories is an array before using forEach
      if (relevantCategories && Array.isArray(relevantCategories)) {
        relevantCategories.forEach(category => {
          if (this.categoryScores[category]) {
            this.relevantScores[category] = this.categoryScores[category];
          }
        });
      }
    }
    
    return {
      normalizedScore,
      performanceLevel,
      categoryPerformanceLevels,
      categoryStrengths,
      categoryWeaknesses,
      weightedScore,
      focusAreaScores,
      focusAreaAverage,
      strengthsCount: this.strengths.length,
      strengthAnalysisCount: this.strengthAnalysis.length,
      improvementAreasCount: this.areasForImprovement.length,
      improvementPlansCount: this.improvementPlans?.length || 0,
      recommendationsCount: (this.recommendedResources?.length || 0) + (this.recommendedChallenges?.length || 0),
      hasDetailedAnalysis: this.strengthAnalysis.length > 0,
      // Include improvement metrics
      ...improvementMetrics
    };
  }
  
  /**
   * Calculate improvement metrics based on previous scores
   * @param {Object} previousScores - Category scores from previous evaluations
   * @returns {Object} Improvement metrics
   * @private
   */
  calculateImprovementMetrics(previousScores) {
    const metrics = {
      overallImprovement: 0,
      categoryImprovements: {},
      mostImprovedCategory: null,
      mostImprovedValue: 0,
      leastImprovedCategory: null,
      leastImprovedValue: 0,
      hasImproved: false
    };
    
    // Calculate overall improvement if previous overall score exists
    if (previousScores.overall !== undefined) {
      metrics.overallImprovement = this.score - previousScores.overall;
      metrics.hasImproved = metrics.overallImprovement > 0;
    }
    
    // Calculate category-specific improvements
    if (this.categoryScores && Object.keys(previousScores).length > 0) {
      Object.entries(this.categoryScores).forEach(([category, score]) => {
        if (previousScores[category] !== undefined) {
          const improvement = score - previousScores[category];
          metrics.categoryImprovements[category] = improvement;
          
          // Track most and least improved categories
          if (metrics.mostImprovedCategory === null || improvement > metrics.mostImprovedValue) {
            metrics.mostImprovedCategory = category;
            metrics.mostImprovedValue = improvement;
          }
          
          if (metrics.leastImprovedCategory === null || improvement < metrics.leastImprovedValue) {
            metrics.leastImprovedCategory = category;
            metrics.leastImprovedValue = improvement;
          }
        }
      });
    }
    
    return metrics;
  }
  
  /**
   * Map focus areas to evaluation categories
   * 
   * NOTE: This is a synchronous implementation that returns a default set of categories.
   * For accurate mapping that requires database access, use the EvaluationDomainService.mapFocusAreasToCategories method instead.
   * 
   * @private
   * @param {Array} focusAreas - User focus areas
   * @returns {Array} Default set of relevant evaluation categories
   */
  mapFocusAreasToCategories(focusAreas) {
    // If no focus areas, return an empty array
    if (!focusAreas || !Array.isArray(focusAreas) || focusAreas.length === 0) {
      return [];
    }
    
    // This is a simplified synchronous implementation
    // Return default categories based on common focus areas
    const defaultMappings = {
      'ai_ethics': ['ethical_reasoning', 'comprehensiveness', 'balanced_view'],
      'ai_literacy': ['conceptual_understanding', 'application', 'communication'],
      'ai_capabilities': ['accuracy', 'technical_understanding', 'critical_thinking'],
      'ai_limitations': ['critical_analysis', 'balanced_view', 'technical_understanding'],
      'ai_impact': ['impact_analysis', 'stakeholder_consideration', 'systemic_thinking'],
      'general': ['accuracy', 'clarity', 'reasoning', 'creativity']
    };
    
    // Collect categories for all focus areas
    const categories = [];
    focusAreas.forEach(area => {
      const normalizedArea = area.toLowerCase().replace(/\s+/g, '_');
      const mappedCategories = defaultMappings[normalizedArea] || defaultMappings['general'];
      categories.push(...mappedCategories);
    });
    
    // Remove duplicates and return
    return [...new Set(categories)];
  }
  
  /**
   * Validate if evaluation is in valid state
   * @returns {boolean}
   */
  isValid() {
    return !!(
      this.id &&
      this.userId &&
      this.challengeId &&
      this.score !== undefined &&
      this.score >= 0
    );
  }
  
  /**
   * Get normalized score (0-100)
   * @returns {number}
   */
  getNormalizedScore() {
    return this.metrics.normalizedScore || 
           (this.score <= 10 ? Math.round(this.score * 10) : this.score);
  }
  
  /**
   * Get performance level based on score
   * @returns {string}
   */
  getPerformanceLevel() {
    return this.metrics.performanceLevel || 'average';
  }
  
  /**
   * Get weighted score (if category weights are available)
   * @returns {number|null} Weighted score or null if not available
   */
  getWeightedScore() {
    return this.metrics.weightedScore || this.score;
  }
  
  /**
   * Get category level performance
   * @param {string} category - Category to get performance level for
   * @returns {string} Performance level for category
   */
  getCategoryPerformanceLevel(category) {
    return this.metrics.categoryPerformanceLevels?.[category] || 'not rated';
  }
  
  /**
   * Get detailed analysis for a specific strength
   * @param {string} strength - Strength to get analysis for
   * @returns {Object|null} Strength analysis or null if not found
   */
  getStrengthAnalysis(strength) {
    return this.strengthAnalysis.find(item => item.strength === strength) || null;
  }
  
  /**
   * Get improvement plan for a specific area
   * @param {string} area - Area to get improvement plan for
   * @returns {Object|null} Improvement plan or null if not found
   */
  getImprovementPlan(area) {
    return this.improvementPlans?.find(plan => plan.area === area) || null;
  }
  
  /**
   * Get personalized feedback based on user context
   * @returns {Object} Personalized feedback object
   */
  getPersonalizedFeedback() {
    // Basic feedback based on score and performance level
    const performanceLevel = this.getPerformanceLevel();
    
    // Start with basic feedback object
    const feedback = {
      feedback: this.overallFeedback,
      performanceLevel,
      skillLevelFeedback: '',
      focusAreaRelevance: '',
      growthInsights: ''
    };
    
    // Add skill level specific feedback
    if (this.userContext?.skillLevel) {
      switch (this.userContext.skillLevel) {
        case 'beginner':
          feedback.skillLevelFeedback = `As a beginner, you're showing good progress. ${this.strengths.length > 0 ? `Your strengths in ${this.strengths.slice(0, 2).join(' and ')} are particularly notable.` : ''}`;
          break;
        case 'intermediate':
          feedback.skillLevelFeedback = `At your intermediate skill level, this is ${performanceLevel === 'excellent' ? 'impressive work' : 'solid progress'}. Consider focusing on deeper analysis in future responses.`;
          break;
        case 'advanced':
          feedback.skillLevelFeedback = `For your advanced level, this response ${performanceLevel === 'excellent' ? 'meets high standards' : 'has room for the nuance I know you can achieve'}.`;
          break;
        default:
          feedback.skillLevelFeedback = `Your response demonstrates ${performanceLevel} performance overall.`;
      }
    }
    
    // Add focus area relevance feedback
    if (this.userContext?.focusAreas && Array.isArray(this.userContext.focusAreas) && this.userContext.focusAreas.length > 0) {
      // Use synchronous mapping function
      const relevantCategories = this.mapFocusAreasToCategories(this.userContext.focusAreas);
      
      // Get scores for relevant categories
      const relevantScores = {};
      relevantCategories.forEach(category => {
        if (this.categoryScores[category]) {
          relevantScores[category] = this.categoryScores[category];
        }
      });
      
      const relevantAverage = Object.values(relevantScores).length > 0 
        ? Object.values(relevantScores).reduce((sum, score) => sum + score, 0) / Object.values(relevantScores).length 
        : 0;
      
      // Add focus area specific feedback
      feedback.focusAreaRelevance = `In your focus areas (${this.userContext.focusAreas.join(', ')}), you scored ${Math.round(relevantAverage)}/100. ${relevantAverage > 80 ? 'This shows particular strength in your areas of interest.' : 'These are areas you may want to concentrate on developing further.'}`;
    }
    
    // Add growth insights based on evaluation history
    if (this.userContext?.previousScores && Object.keys(this.userContext.previousScores).length > 0) {
      const previousOverall = this.userContext.previousScores.overall || 0;
      const improvement = this.score - previousOverall;
      
      if (improvement > 5) {
        feedback.growthInsights = `You've shown significant improvement (+${improvement} points) from your previous evaluations. Keep building on this progress!`;
      } else if (improvement > 0) {
        feedback.growthInsights = `You're showing steady improvement (+${improvement} points) from previous work.`;
      } else if (improvement === 0) {
        feedback.growthInsights = `You're maintaining a consistent performance level. Consider trying new approaches to continue growing.`;
      } else {
        feedback.growthInsights = `This score is slightly lower than your previous work. Review the improvement suggestions to identify opportunities.`;
      }
    }
    
    return feedback;
  }
  
  /**
   * Update evaluation with new data
   * @param {Object} updates - Data to update
   * @returns {Evaluation} Updated evaluation instance
   */
  update(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Update data must be an object');
    }
    
    // Prevent modification of core identifiers
    const protectedFields = ['id', 'userId', 'challengeId', 'createdAt'];
    
    Object.keys(updates).forEach(key => {
      if (!protectedFields.includes(key)) {
        this[key] = updates[key];
      }
    });
    
    // Recalculate metrics if key data changed
    if (updates.score !== undefined || 
        updates.categoryScores !== undefined ||
        updates.strengths !== undefined || 
        updates.strengthAnalysis !== undefined ||
        updates.areasForImprovement !== undefined ||
        updates.userContext !== undefined ||
        updates.challengeContext !== undefined) {
      this.metrics = this.calculateMetrics();
    }
    
    this.updatedAt = new Date().toISOString();
    return this;
  }
  
  /**
   * Add a category score
   * @param {string} category - Category name
   * @param {number} score - Score for category (0-100)
   * @returns {Evaluation} Updated evaluation instance
   */
  addCategoryScore(category, score) {
    if (!category || typeof category !== 'string') {
      throw new Error('Category must be a non-empty string');
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }
    
    this.categoryScores = this.categoryScores || {};
    this.categoryScores[category] = score;
    this.metrics = this.calculateMetrics();
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add improvement plan for an area
   * @param {Object} plan - Plan with area, description, and action items
   * @returns {Evaluation} Updated evaluation instance
   */
  addImprovementPlan(plan) {
    if (!plan || typeof plan !== 'object') {
      throw new Error('Plan must be an object');
    }
    
    if (!plan.area || typeof plan.area !== 'string') {
      throw new Error('Plan must include an area string');
    }
    
    // Initialize if necessary
    this.improvementPlans = this.improvementPlans || [];
    
    // Check if plan for this area already exists
    const existingIndex = this.improvementPlans.findIndex(
      item => item.area === plan.area
    );
    
    if (existingIndex >= 0) {
      this.improvementPlans[existingIndex] = plan;
    } else {
      this.improvementPlans.push(plan);
    }
    
    // Add to areas for improvement if not already there
    if (!this.areasForImprovement.includes(plan.area)) {
      this.areasForImprovement.push(plan.area);
    }
    
    this.metrics = this.calculateMetrics();
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add user context information
   * @param {Object} userContext - User context data
   * @returns {Evaluation} Updated evaluation instance
   */
  addUserContext(userContext) {
    if (!userContext || typeof userContext !== 'object') {
      throw new Error('User context must be an object');
    }
    
    this.userContext = {
      ...this.userContext,
      ...userContext
    };
    
    this.metrics = this.calculateMetrics();
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add challenge context information
   * @param {Object} challengeContext - Challenge context data
   * @returns {Evaluation} Updated evaluation instance
   */
  addChallengeContext(challengeContext) {
    if (!challengeContext || typeof challengeContext !== 'object') {
      throw new Error('Challenge context must be an object');
    }
    
    this.challengeContext = {
      ...this.challengeContext,
      ...challengeContext
    };
    
    this.metrics = this.calculateMetrics();
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add a recommended resource
   * @param {Object} resource - Resource with title, type, and url
   * @returns {Evaluation} Updated evaluation instance
   */
  addRecommendedResource(resource) {
    if (!resource || typeof resource !== 'object') {
      throw new Error('Resource must be an object');
    }
    
    if (!resource.title || typeof resource.title !== 'string') {
      throw new Error('Resource must include a title');
    }
    
    this.recommendedResources = this.recommendedResources || [];
    this.recommendedResources.push(resource);
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add a recommended challenge
   * @param {Object} challenge - Challenge with id, title, and relevance
   * @returns {Evaluation} Updated evaluation instance
   */
  addRecommendedChallenge(challenge) {
    if (!challenge || typeof challenge !== 'object') {
      throw new Error('Challenge must be an object');
    }
    
    if (!challenge.title || typeof challenge.title !== 'string') {
      throw new Error('Challenge must include a title');
    }
    
    this.recommendedChallenges = this.recommendedChallenges || [];
    this.recommendedChallenges.push(challenge);
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Convert to plain object for storage in Supabase
   * @returns {Object} Supabase-compatible object
   */
  toObject() {
    return {
      user_id: this.userId,
      challenge_id: this.challengeId,
      score: this.score,
      score_percent: this.scorePercent,
      category_scores: this.categoryScores,
      relevant_scores: this.relevantScores,
      overall_feedback: this.overallFeedback,
      strengths: this.strengths,
      strength_analysis: this.strengthAnalysis,
      areas_for_improvement: this.areasForImprovement,
      improvement_plans: this.improvementPlans,
      next_steps: this.nextSteps,
      recommended_resources: this.recommendedResources,
      recommended_challenges: this.recommendedChallenges,
      user_context: this.userContext,
      challenge_context: this.challengeContext,
      growth_metrics: this.growthMetrics,
      response_id: this.responseId,
      thread_id: this.threadId,
      metadata: this.metadata
    };
  }
  
  /**
   * Create Evaluation instance from database object
   * @param {Object} data - Evaluation data from database
   * @returns {Evaluation} Evaluation instance
   */
  static fromDatabase(data) {
    if (!data) {
      throw new Error('Database data is required to create Evaluation instance');
    }
    
    // Convert snake_case to camelCase if needed
    const mapped = {
      id: data.id,
      userId: data.user_id || data.userId,
      challengeId: data.challenge_id || data.challengeId,
      score: data.score || data.overall_score || 0,
      categoryScores: data.category_scores || data.categoryScores || {},
      overallFeedback: data.overall_feedback || data.overallFeedback || '',
      strengths: data.strengths || [],
      strengthAnalysis: data.strength_analysis || data.strengthAnalysis || [],
      areasForImprovement: data.areas_for_improvement || data.areasForImprovement || [],
      improvementPlans: data.improvement_plans || data.improvementPlans || [],
      nextSteps: data.next_steps || data.nextSteps || '',
      recommendedResources: data.recommended_resources || data.recommendedResources || [],
      recommendedChallenges: data.recommended_challenges || data.recommendedChallenges || [],
      responseId: data.response_id || data.responseId,
      threadId: data.thread_id || data.threadId,
      userContext: data.user_context || data.userContext || {},
      challengeContext: data.challenge_context || data.challengeContext || {},
      growthMetrics: data.growth_metrics || data.growthMetrics || {},
      metrics: data.metrics || {},
      metadata: data.metadata || {},
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    };
    
    return new Evaluation(mapped);
  }
  
  /**
   * Create a new unique ID for an evaluation
   * @returns {string} Unique ID
   */
  static createNewId() {
    return uuidv4();
  }
}

module.exports = Evaluation; 