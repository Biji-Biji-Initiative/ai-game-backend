/**
 * Adaptive Service
 * 
 * Handles business logic for adaptive learning, difficulty adjustment,
 * and personalized recommendations.
 */

const Difficulty = require('../models/Difficulty');
const Recommendation = require('../models/Recommendation');
const AdaptiveRepository = require('../repositories/AdaptiveRepository');
const domainEvents = require('../../shared/domainEvents');
const { v4: uuidv4 } = require('uuid');
const config = require('../../../config/config');

class AdaptiveService {
  constructor(adaptiveRepository, userRepository, challengeRepository, progressService, focusAreaCoordinator) {
    this.adaptiveRepository = adaptiveRepository || new AdaptiveRepository();
    this.userRepository = userRepository;
    this.challengeRepository = challengeRepository;
    this.progressService = progressService;
    this.focusAreaCoordinator = focusAreaCoordinator;
  }

  /**
   * Calculate optimal difficulty for a user based on challenge history
   * @param {string} userId - User ID
   * @param {string} challengeType - Optional challenge type
   * @returns {Promise<Difficulty>} Difficulty settings
   */
  async calculateOptimalDifficulty(userId, challengeType = null) {
    try {
      // Default difficulty
      let difficulty = new Difficulty();
      
      // Get user data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Get challenge history
      const challengeHistory = await this.challengeRepository.getUserChallengeHistory(userId);
      
      // Get relevant challenge history (same type if specified)
      const relevantHistory = challengeHistory.filter(
        challenge => challenge.status === 'completed' && 
                   challenge.evaluation &&
                   (!challengeType || challenge.challengeType === challengeType)
      );
      
      // If user has no relevant challenge history, use their preferences
      if (relevantHistory.length === 0) {
        const preferredDifficulty = user.preferences?.difficulty || 'beginner';
        
        if (preferredDifficulty === 'intermediate') {
          difficulty = new Difficulty({ level: 'intermediate', complexity: 0.65, depth: 0.65 });
        } else if (preferredDifficulty === 'advanced') {
          difficulty = new Difficulty({ level: 'advanced', complexity: 0.8, depth: 0.8 });
        }
        
        // Apply personality modifiers if available
        if (user.personalityTraits) {
          difficulty.applyPersonalityModifiers(user.personalityTraits);
        }
        
        return difficulty;
      }
      
      // Calculate average performance
      const scores = relevantHistory.map(challenge => challenge.evaluation.overallScore || 70);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Calculate trending performance (improving, stable, or declining)
      const orderedScores = relevantHistory
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 3)
        .map(challenge => challenge.evaluation.overallScore || 70);
        
      // Check if performance is improving
      const improving = orderedScores.length >= 2 && 
        orderedScores[0] > orderedScores[orderedScores.length - 1];
      
      // Determine base difficulty from average score
      if (averageScore >= 85) {
        difficulty = new Difficulty({ level: 'advanced', complexity: 0.8, depth: 0.8 });
      } else if (averageScore >= 70) {
        difficulty = new Difficulty({ level: 'intermediate', complexity: 0.65, depth: 0.65 });
      } else {
        difficulty = new Difficulty({ level: 'beginner', complexity: 0.5, depth: 0.5 });
      }
      
      // Set adaptive factor based on trending performance
      difficulty.adaptiveFactor = improving ? 0.1 : -0.05;
      
      // Apply the adaptive factor
      if (improving) {
        difficulty.increase(10);
      } else {
        difficulty.decrease(5);
      }
      
      // Apply personality modifiers if available
      if (user.personalityTraits) {
        difficulty.applyPersonalityModifiers(user.personalityTraits);
      }
      
      return difficulty;
    } catch (error) {
      console.error('AdaptiveService.calculateOptimalDifficulty error:', error);
      
      // Return safe default
      return new Difficulty();
    }
  }

  /**
   * Adjust difficulty based on user's performance on a challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @param {number} score - Score achieved (0-100)
   * @returns {Promise<Difficulty>} Updated difficulty settings
   */
  async adjustDifficulty(userId, challengeId, score) {
    try {
      // Get challenge details to get the type
      const challenge = await this.challengeRepository.findById(challengeId);
      if (!challenge) {
        throw new Error(`Challenge not found: ${challengeId}`);
      }
      
      // Calculate optimal difficulty for this challenge type
      const difficulty = await this.calculateOptimalDifficulty(userId, challenge.challengeType);
      
      // Adjust difficulty based on score
      difficulty.adjustBasedOnScore(score);
      
      // Publish domain event
      domainEvents.publish('DifficultyAdjusted', {
        userId,
        challengeId,
        challengeType: challenge.challengeType,
        score,
        difficultySettings: difficulty.toSettings()
      });
      
      return difficulty;
    } catch (error) {
      console.error('AdaptiveService.adjustDifficulty error:', error);
      throw error;
    }
  }

  /**
   * Generate dynamic challenge parameters for a user
   * @param {string} userId - User ID
   * @param {string} focusArea - Optional specific focus area
   * @returns {Promise<Object>} Challenge parameters
   */
  async generateDynamicChallenge(userId, focusArea = null) {
    try {
      // Get user data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Get user's challenge history
      const challengeHistory = await this.challengeRepository.getUserChallengeHistory(userId);
      
      // Use provided focus area or find one dynamically
      let targetFocusArea = focusArea;
      if (!targetFocusArea) {
        // If available, get focus areas from the focusAreaCoordinator
        if (this.focusAreaCoordinator) {
          const focusAreas = await this.focusAreaCoordinator.getFocusAreasForUser(userId);
          
          // Select a focus area that hasn't been used recently
          const recentFocusAreas = challengeHistory
            .slice(0, 3)
            .map(c => c.focusArea)
            .filter(Boolean);
            
          // Filter out recently used focus areas if possible
          const availableFocusAreas = focusAreas.filter(area => !recentFocusAreas.includes(area.name));
          
          // If we have available focus areas, pick one randomly, otherwise use any focus area
          if (availableFocusAreas.length > 0) {
            targetFocusArea = availableFocusAreas[Math.floor(Math.random() * availableFocusAreas.length)].name;
          } else if (focusAreas.length > 0) {
            targetFocusArea = focusAreas[Math.floor(Math.random() * focusAreas.length)].name;
          } else {
            // Fallback to a default
            targetFocusArea = 'Personalized Learning Path';
          }
        } else {
          // Fallback to user's selected focus area or default
          targetFocusArea = user.focusArea || 'AI Communication Skills';
        }
      }
      
      // Calculate optimal difficulty
      const difficulty = await this.calculateOptimalDifficulty(userId);
      
      // Determine user's strengths from personality traits
      const strengths = [];
      if (user.personalityTraits) {
        const traits = Object.entries(user.personalityTraits)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);
        strengths.push(...traits.map(t => t[0]));
      }
      
      // Determine challenge type based on strengths
      let challengeTypes = [...config.game.challengeTypes];
      
      // Prioritize challenge types that might be relevant to the focus area
      if (targetFocusArea) {
        const focusAreaLower = targetFocusArea.toLowerCase();
        challengeTypes.sort((a, b) => {
          // Check if challenge type contains keywords from the focus area
          const aRelevance = a.name.toLowerCase().split(' ')
            .filter(word => focusAreaLower.includes(word)).length;
          const bRelevance = b.name.toLowerCase().split(' ')
            .filter(word => focusAreaLower.includes(word)).length;
          return bRelevance - aRelevance;
        });
      }
      
      // Prioritize challenge types that leverage user strengths
      if (strengths.length > 0) {
        challengeTypes.sort((a, b) => {
          const aStrengthMatch = a.leveragedTraits?.filter(t => strengths.includes(t)).length || 0;
          const bStrengthMatch = b.leveragedTraits?.filter(t => strengths.includes(t)).length || 0;
          return bStrengthMatch - aStrengthMatch;
        });
      }
      
      // Avoid repeating the same challenge type too frequently
      if (challengeHistory && challengeHistory.length > 0) {
        const recentTypes = challengeHistory.slice(0, 2).map(c => c.challengeType);
        challengeTypes = challengeTypes.sort((a, b) => {
          return recentTypes.includes(a.id) ? 1 : recentTypes.includes(b.id) ? -1 : 0;
        });
      }
      
      // Select a challenge type
      const selectedType = challengeTypes[0];
      
      const challengeParams = {
        id: uuidv4(),
        challengeType: selectedType.id,
        formatType: selectedType.formatTypes[Math.floor(Math.random() * selectedType.formatTypes.length)],
        difficulty: difficulty.toSettings(),
        focusArea: targetFocusArea,
        leveragedStrengths: strengths,
        timestamp: new Date().toISOString()
      };
      
      // Create and save recommendation
      const recommendation = new Recommendation({
        userId,
        createdAt: new Date().toISOString()
      });
      
      recommendation.setChallengeParameters(challengeParams);
      
      // Save recommendation
      await this.adaptiveRepository.save(recommendation);
      
      return challengeParams;
    } catch (error) {
      console.error('AdaptiveService.generateDynamicChallenge error:', error);
      throw error;
    }
  }

  /**
   * Generate personalized recommendations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Recommendation>} Personalized recommendations
   */
  async generateRecommendations(userId) {
    try {
      // Get user data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Get user's challenge history
      const challengeHistory = await this.challengeRepository.getUserChallengeHistory(userId);
      
      // Create a new recommendation
      const recommendation = new Recommendation({
        userId,
        createdAt: new Date().toISOString()
      });
      
      // If no challenge history, return basic recommendations
      if (!challengeHistory || challengeHistory.length === 0) {
        recommendation.setRecommendedFocusAreas(user.insights?.suggestedFocusAreas || []);
        recommendation.setRecommendedChallengeTypes(config.game.challengeTypes.slice(0, 3).map(t => t.id));
        recommendation.setSuggestedLearningResources([]);
        
        // Save and return
        return this.adaptiveRepository.save(recommendation);
      }
      
      // Identify patterns in challenge performance
      const typePerformance = {};
      challengeHistory.forEach(challenge => {
        if (!typePerformance[challenge.challengeType]) {
          typePerformance[challenge.challengeType] = {
            scores: [],
            count: 0
          };
        }
        
        typePerformance[challenge.challengeType].scores.push(challenge.evaluation?.score || 50);
        typePerformance[challenge.challengeType].count++;
      });
      
      // Calculate average scores by challenge type
      const averageScores = {};
      Object.entries(typePerformance).forEach(([type, data]) => {
        averageScores[type] = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      });
      
      // Find strengths and weaknesses
      const strengths = Object.entries(averageScores)
        .filter(([_, score]) => score >= 75)
        .map(([type]) => type);
        
      const weaknesses = Object.entries(averageScores)
        .filter(([_, score]) => score < 50)
        .map(([type]) => type);
      
      // Set strengths and weaknesses
      recommendation.setStrengthsAndWeaknesses(strengths, weaknesses);
      
      // Get focus areas
      let recommendedFocusAreas = [];
      if (this.focusAreaCoordinator) {
        recommendedFocusAreas = await this.focusAreaCoordinator.generateFocusAreasFromUserData(
          user, 
          challengeHistory, 
          await this.progressService.calculateOverallProgress(userId)
        );
      } else {
        // Fallback if focus area coordinator isn't available
        recommendedFocusAreas = [
          'AI Communication Skills',
          'Ethical AI Usage',
          'Critical Thinking'
        ];
      }
      
      recommendation.setRecommendedFocusAreas(recommendedFocusAreas);
      
      // Recommend challenge types
      const recommendedChallengeTypes = [
        // Include 1-2 challenge types from weaknesses to encourage improvement
        ...weaknesses.slice(0, 2),
        // Include 1-2 challenge types from strengths to build confidence
        ...strengths.slice(0, 2)
      ];
      
      // If not enough recommendations, add random ones
      while (recommendedChallengeTypes.length < 3) {
        const randomType = config.game.challengeTypes[
          Math.floor(Math.random() * config.game.challengeTypes.length)
        ].id;
        
        if (!recommendedChallengeTypes.includes(randomType)) {
          recommendedChallengeTypes.push(randomType);
        }
      }
      
      recommendation.setRecommendedChallengeTypes(recommendedChallengeTypes);
      
      // Generate learning resources
      const suggestedLearningResources = weaknesses.map(weaknessType => {
        const relatedChallenge = config.game.challengeTypes.find(type => type.id === weaknessType);
        return {
          title: `Improve your ${relatedChallenge?.name || "skills"}`,
          description: `Resources to help improve in areas related to ${relatedChallenge?.name || "this challenge type"}`,
          type: "article",
          difficulty: "intermediate"
        };
      });
      
      recommendation.setSuggestedLearningResources(suggestedLearningResources);
      
      // Generate a dynamic challenge as part of recommendations
      const challengeParams = await this.generateDynamicChallenge(userId);
      recommendation.setChallengeParameters(challengeParams);
      
      // Save and return recommendations
      return this.adaptiveRepository.save(recommendation);
    } catch (error) {
      console.error('AdaptiveService.generateRecommendations error:', error);
      throw error;
    }
  }

  /**
   * Get latest recommendations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Recommendation|null>} Latest recommendation or null
   */
  async getLatestRecommendations(userId) {
    try {
      const recommendation = await this.adaptiveRepository.findLatestForUser(userId);
      
      // If no recommendation exists or it's older than a day, generate a new one
      if (!recommendation || 
          (new Date() - new Date(recommendation.createdAt)) > 24 * 60 * 60 * 1000) {
        return this.generateRecommendations(userId);
      }
      
      return recommendation;
    } catch (error) {
      console.error('AdaptiveService.getLatestRecommendations error:', error);
      throw error;
    }
  }

  /**
   * Adjust difficulty based on personality insights
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if adjusted successfully
   */
  async adjustForPersonality(userId) {
    try {
      // Get user data
      const user = await this.userRepository.findById(userId);
      if (!user || !user.personalityTraits) {
        return false;
      }
      
      // Generate a new recommendation with adjusted difficulty
      await this.generateRecommendations(userId);
      
      return true;
    } catch (error) {
      console.error('AdaptiveService.adjustForPersonality error:', error);
      return false;
    }
  }
}

module.exports = AdaptiveService; 