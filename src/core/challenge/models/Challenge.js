/**
 * Challenge Domain Model
 * 
 * Core entity representing a learning challenge in the system.
 * Follows domain-driven design principles with rich behavior.
 * 
 * @module Challenge
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Challenge class representing a learning challenge entity
 */
class Challenge {
  /**
   * Create a Challenge instance
   * @param {Object} data - Challenge data
   * @param {string} [data.id] - Unique identifier (generated if not provided)
   * @param {string} data.title - Challenge title
   * @param {Object} data.content - Challenge content
   * @param {Array} [data.questions] - Challenge questions
   * @param {Object} [data.evaluationCriteria] - Criteria for evaluating responses
   * @param {Array} [data.recommendedResources] - Recommended resources for the challenge
   * @param {string} data.challengeType - Type of challenge (e.g., 'analysis', 'technical')
   * @param {string} data.formatType - Format of challenge (e.g., 'open-ended', 'multiple-choice')
   * @param {string} data.difficulty - Difficulty level (e.g., 'beginner', 'intermediate', 'advanced')
   * @param {string} data.focusArea - Focus area of the challenge
   * @param {string} data.userId - User ID or email this challenge belongs to
   * @param {Object} [data.typeMetadata] - Additional metadata for the challenge type
   * @param {Object} [data.formatMetadata] - Additional metadata for the format type
   * @param {Object} [data.metadata] - Additional challenge metadata
   */
  constructor(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Challenge data must be an object');
    }
    
    // Required fields
    if (!data.title) throw new Error('Title is required for challenge creation');
    if (!data.content) throw new Error('Content is required for challenge creation');
    
    // Core properties
    this.id = data.id || uuidv4();
    this.title = data.title;
    this.content = data.content;
    this.questions = data.questions || [];
    this.evaluationCriteria = data.evaluationCriteria || {};
    this.recommendedResources = data.recommendedResources || [];
    
    // Classification properties
    this.challengeType = data.challengeType || 'standard';
    this.formatType = data.formatType || 'open-ended';
    this.difficulty = data.difficulty || 'intermediate';
    this.focusArea = data.focusArea || 'general';
    
    // Ownership and relationships
    this.userId = data.userId || data.userEmail || null;
    
    // Metadata
    this.typeMetadata = data.typeMetadata || {};
    this.formatMetadata = data.formatMetadata || {};
    this.metadata = data.metadata || {};
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
  
  /**
   * Get the display name of the challenge type
   * @returns {string} Challenge type display name
   */
  getChallengeTypeName() {
    return this.typeMetadata?.name || this.challengeType;
  }
  
  /**
   * Get the display name of the format type
   * @returns {string} Format type display name
   */
  getFormatTypeName() {
    return this.formatMetadata?.name || this.formatType;
  }
  
  /**
   * Check if this challenge requires a specific format for responses
   * @returns {boolean} True if the challenge requires a specific format
   */
  requiresSpecificResponseFormat() {
    return this.formatType === 'structured' || 
           this.formatType === 'multiple-choice' ||
           this.formatMetadata?.responseFormat === true;
  }
  
  /**
   * Get the expected time to complete the challenge in minutes
   * @returns {number} Expected completion time in minutes
   */
  getExpectedCompletionTime() {
    // Base time based on difficulty
    let baseTime = 10; // Default
    
    switch (this.difficulty) {
      case 'beginner':
        baseTime = 5;
        break;
      case 'intermediate':
        baseTime = 10;
        break;
      case 'advanced':
        baseTime = 15;
        break;
      case 'expert':
        baseTime = 25;
        break;
    }
    
    // Adjust based on question count
    const questionCount = this.questions.length;
    const questionTime = questionCount * 2; // 2 minutes per question
    
    // Adjust based on format type
    let formatMultiplier = 1.0;
    switch (this.formatType) {
      case 'multiple-choice':
        formatMultiplier = 0.8; // Faster
        break;
      case 'open-ended':
        formatMultiplier = 1.2; // Slower
        break;
      case 'coding':
        formatMultiplier = 1.5; // Much slower
        break;
    }
    
    // Calculate final time
    return Math.round((baseTime + questionTime) * formatMultiplier);
  }
  
  /**
   * Validate if the challenge is in a valid state
   * @returns {boolean} True if the challenge is valid
   */
  isValid() {
    return !!(
      this.id &&
      this.title &&
      this.content &&
      this.challengeType &&
      this.formatType
    );
  }
  
  /**
   * Add a question to the challenge
   * @param {Object} question - Question to add
   * @returns {Challenge} Updated challenge instance
   */
  addQuestion(question) {
    if (!question) {
      throw new Error('Cannot add empty question');
    }
    
    if (!question.id) {
      question.id = `q${this.questions.length + 1}`;
    }
    
    this.questions.push(question);
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add evaluation criteria to the challenge
   * @param {string} key - Criteria key
   * @param {Object} criteria - Criteria definition
   * @returns {Challenge} Updated challenge instance
   */
  addEvaluationCriteria(key, criteria) {
    if (!key || typeof key !== 'string') {
      throw new Error('Criteria key must be a non-empty string');
    }
    
    if (!criteria || typeof criteria !== 'object') {
      throw new Error('Criteria must be an object');
    }
    
    if (!criteria.description) {
      throw new Error('Criteria must include a description');
    }
    
    this.evaluationCriteria[key] = criteria;
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Add a recommended resource to the challenge
   * @param {Object} resource - Resource to add
   * @returns {Challenge} Updated challenge instance
   */
  addRecommendedResource(resource) {
    if (!resource || typeof resource !== 'object') {
      throw new Error('Resource must be an object');
    }
    
    if (!resource.title) {
      throw new Error('Resource must include a title');
    }
    
    this.recommendedResources.push(resource);
    this.updatedAt = new Date().toISOString();
    
    return this;
  }
  
  /**
   * Update the challenge with new data
   * @param {Object} updates - Data to update
   * @returns {Challenge} Updated challenge instance
   */
  update(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Update data must be an object');
    }
    
    // Prevent modification of core identifiers
    const protectedFields = ['id', 'createdAt'];
    
    Object.keys(updates).forEach(key => {
      if (!protectedFields.includes(key)) {
        this[key] = updates[key];
      }
    });
    
    this.updatedAt = new Date().toISOString();
    return this;
  }
  
  /**
   * Convert to plain object for storage
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      questions: this.questions,
      evaluationCriteria: this.evaluationCriteria,
      recommendedResources: this.recommendedResources,
      challengeType: this.challengeType,
      formatType: this.formatType,
      difficulty: this.difficulty,
      focusArea: this.focusArea,
      userId: this.userId,
      typeMetadata: this.typeMetadata,
      formatMetadata: this.formatMetadata,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * Create Challenge instance from database object
   * @param {Object} data - Challenge data from database
   * @returns {Challenge} Challenge instance
   */
  static fromDatabase(data) {
    if (!data) {
      throw new Error('Database data is required to create Challenge instance');
    }
    
    // Convert snake_case to camelCase if needed
    const mapped = {
      id: data.id,
      title: data.title,
      content: data.content,
      questions: data.questions || [],
      evaluationCriteria: data.evaluation_criteria || data.evaluationCriteria || {},
      recommendedResources: data.recommended_resources || data.recommendedResources || [],
      challengeType: data.challenge_type || data.challengeType,
      formatType: data.format_type || data.formatType,
      difficulty: data.difficulty,
      focusArea: data.focus_area || data.focusArea,
      userId: data.user_id || data.userId,
      typeMetadata: data.type_metadata || data.typeMetadata || {},
      formatMetadata: data.format_metadata || data.formatMetadata || {},
      metadata: data.metadata || {},
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    };
    
    return new Challenge(mapped);
  }
  
  /**
   * Create a new unique ID for a challenge
   * @returns {string} Unique ID
   */
  static createNewId() {
    return uuidv4();
  }
}

module.exports = Challenge; 