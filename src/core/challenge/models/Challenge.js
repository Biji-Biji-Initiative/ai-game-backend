/**
 * Challenge Domain Model
 * 
 * Core entity representing a learning challenge in the system.
 * Follows domain-driven design principles with rich behavior.
 * 
 * @module Challenge
 */

const { v4: uuidv4 } = require('uuid');
const { DomainEvent, EventTypes } = require('../../common/events/domainEvents');
const { ChallengeId, UserId, DifficultyLevel, FocusArea } = require('../../common/valueObjects');
const { 
  ChallengeInvalidStateError, 
  ChallengeValidationError,
  ChallengeResponseError
} = require('../errors/ChallengeErrors');

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
   * @param {string|DifficultyLevel} data.difficulty - Difficulty level (e.g., 'beginner', 'intermediate', 'advanced')
   * @param {string|FocusArea} data.focusArea - Focus area of the challenge
   * @param {string|UserId} data.userId - User ID or email this challenge belongs to
   * @param {Object} [data.typeMetadata] - Additional metadata for the challenge type
   * @param {Object} [data.formatMetadata] - Additional metadata for the format type
   * @param {Object} [data.metadata] - Additional challenge metadata
   * @param {Array} [data.responses] - User responses to the challenge
   * @param {Object} [data.evaluation] - Evaluation of user responses
   * @param {string} [data.status] - Challenge status (draft, active, submitted, completed)
   */
  constructor(data) {
    if (!data || typeof data !== 'object') {
      throw new ChallengeValidationError('Challenge data must be an object');
    }
    
    // Required fields
    if (!data.title) throw new ChallengeValidationError('Title is required for challenge creation');
    if (!data.content) throw new ChallengeValidationError('Content is required for challenge creation');
    
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
    
    // Convert difficulty to DifficultyLevel value object
    if (data.difficulty instanceof DifficultyLevel) {
      this._difficultyVO = data.difficulty;
      this.difficulty = data.difficulty.value;
    } else {
      this.difficulty = data.difficulty || 'intermediate';
      try {
        this._difficultyVO = new DifficultyLevel(this.difficulty);
      } catch (error) {
        // If creation fails, we'll keep the string value but set the VO to null
        this._difficultyVO = null;
      }
    }
    
    // Convert focusArea to FocusArea value object
    if (data.focusArea instanceof FocusArea) {
      this._focusAreaVO = data.focusArea;
      this.focusArea = data.focusArea.code;
    } else {
      this.focusArea = data.focusArea || 'general';
      try {
        this._focusAreaVO = new FocusArea(this.focusArea);
      } catch (error) {
        // If creation fails, we'll keep the string value but set the VO to null
        this._focusAreaVO = null;
      }
    }
    
    // Convert userId to UserId value object
    if (data.userId instanceof UserId) {
      this._userIdVO = data.userId;
      this.userId = data.userId.value;
    } else {
      this.userId = data.userId || data.userEmail || null;
      if (this.userId && UserId.isValid(this.userId)) {
        this._userIdVO = new UserId(this.userId);
      } else {
        this._userIdVO = null;
      }
    }
    
    // Create ChallengeId value object
    try {
      this._idVO = new ChallengeId(this.id);
    } catch (error) {
      // If creation fails, we'll keep the string ID but set the VO to null
      this._idVO = null;
    }
    
    // Metadata
    this.typeMetadata = data.typeMetadata || {};
    this.formatMetadata = data.formatMetadata || {};
    this.metadata = data.metadata || {};
    
    // Response and evaluation data
    this.responses = data.responses || [];
    this.evaluation = data.evaluation || null;
    
    // Status tracking
    this.status = data.status || 'active';
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.submittedAt = data.submittedAt || null;
    this.completedAt = data.completedAt || null;
    
    // Domain events collection
    this.domainEvents = [];
    
    // Enforce invariants on creation
    this._enforceInvariants();
  }
  
  /**
   * Enforce invariants and throw domain-specific errors if violated
   * @private
   */
  _enforceInvariants() {
    // ID must be valid
    if (!this.id) {
      throw new ChallengeValidationError('Challenge must have a valid ID');
    }
    
    // Title is required
    if (!this.title) {
      throw new ChallengeValidationError('Challenge must have a title');
    }
    
    // Content is required
    if (!this.content) {
      throw new ChallengeValidationError('Challenge must have content');
    }
    
    // Challenge type is required
    if (!this.challengeType) {
      throw new ChallengeValidationError('Challenge must have a challenge type');
    }
    
    // Format type is required
    if (!this.formatType) {
      throw new ChallengeValidationError('Challenge must have a format type');
    }
    
    // State transitions validation
    if (this.status === 'completed' && !this.evaluation) {
      throw new ChallengeInvalidStateError('Completed challenge must have an evaluation');
    }
    
    if (this.status === 'submitted' && this.responses.length === 0) {
      throw new ChallengeInvalidStateError('Submitted challenge must have at least one response');
    }
    
    if (this.status === 'completed' && this.responses.length === 0) {
      throw new ChallengeInvalidStateError('Completed challenge must have at least one response');
    }
    
    // If there's an evaluation, challenge must be in completed state
    if (this.evaluation && this.status !== 'completed') {
      throw new ChallengeInvalidStateError('Challenge with evaluation must be in completed state');
    }
    
    // If submittedAt is set, status must be submitted or completed
    if (this.submittedAt && this.status !== 'submitted' && this.status !== 'completed') {
      throw new ChallengeInvalidStateError('Challenge with submittedAt timestamp must be in submitted or completed state');
    }
    
    // If completedAt is set, status must be completed
    if (this.completedAt && this.status !== 'completed') {
      throw new ChallengeInvalidStateError('Challenge with completedAt timestamp must be in completed state');
    }
  }
  
  /**
   * Get id as a ChallengeId value object
   * @returns {ChallengeId|null} ChallengeId value object or null if invalid
   */
  get idVO() {
    if (!this._idVO && ChallengeId.isValid(this.id)) {
      this._idVO = new ChallengeId(this.id);
    }
    return this._idVO;
  }
  
  /**
   * Get userId as a UserId value object
   * @returns {UserId|null} UserId value object or null if invalid/not set
   */
  get userIdVO() {
    if (!this._userIdVO && this.userId && UserId.isValid(this.userId)) {
      this._userIdVO = new UserId(this.userId);
    }
    return this._userIdVO;
  }
  
  /**
   * Get difficulty as a DifficultyLevel value object
   * @returns {DifficultyLevel|null} DifficultyLevel value object or null if invalid
   */
  get difficultyVO() {
    if (!this._difficultyVO && DifficultyLevel.isValid(this.difficulty)) {
      this._difficultyVO = new DifficultyLevel(this.difficulty);
    }
    return this._difficultyVO;
  }
  
  /**
   * Get focusArea as a FocusArea value object
   * @returns {FocusArea|null} FocusArea value object or null if invalid
   */
  get focusAreaVO() {
    if (!this._focusAreaVO && FocusArea.isValid(this.focusArea)) {
      this._focusAreaVO = new FocusArea(this.focusArea);
    }
    return this._focusAreaVO;
  }
  
  /**
   * Add a domain event to be dispatched later
   * @param {DomainEvent} domainEvent - Event to add
   */
  addDomainEvent(domainEvent) {
    this.domainEvents = this.domainEvents || [];
    this.domainEvents.push(domainEvent);
  }
  
  /**
   * Create a domain event and add it to the collection
   * @param {string} eventType - Event type from EventTypes
   * @param {Object} payload - Event payload
   */
  addEvent(eventType, payload) {
    const event = new DomainEvent(eventType, {
      ...payload,
      challengeId: this.id,
      userId: this.userId
    });
    this.addDomainEvent(event);
  }
  
  /**
   * Clear collected domain events
   */
  clearEvents() {
    this.domainEvents = [];
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
    
    // Use the difficultyVO if available for more accurate calculation
    if (this.difficultyVO) {
      switch (this.difficultyVO.numericValue) {
        case 1: // easy/beginner
          baseTime = 5;
          break;
        case 2: // medium/intermediate
          baseTime = 10;
          break;
        case 3: // hard/advanced
          baseTime = 15;
          break;
        case 4: // expert
          baseTime = 25;
          break;
      }
    } else {
      // Fallback to string-based logic
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
   * Check if the challenge is in draft status
   * @returns {boolean} True if the challenge is a draft
   */
  isDraft() {
    return this.status === 'draft';
  }
  
  /**
   * Check if the challenge is active and ready for responses
   * @returns {boolean} True if the challenge is active
   */
  isActive() {
    return this.status === 'active';
  }
  
  /**
   * Check if responses have been submitted for this challenge
   * @returns {boolean} True if responses have been submitted
   */
  isSubmitted() {
    return this.status === 'submitted' || this.status === 'completed';
  }
  
  /**
   * Check if the challenge has been completed with an evaluation
   * @returns {boolean} True if the challenge is completed
   */
  isCompleted() {
    return this.status === 'completed' && this.evaluation !== null;
  }
  
  /**
   * Get the score from the evaluation if available
   * @returns {number|null} The score or null if not evaluated
   */
  getScore() {
    return this.evaluation?.score || null;
  }
  
  /**
   * Get feedback from the evaluation if available
   * @returns {string|null} The feedback or null if not evaluated
   */
  getFeedback() {
    return this.evaluation?.feedback || null;
  }
  
  /**
   * Calculate the time taken to complete the challenge
   * @returns {number|null} Time taken in minutes or null if not completed
   */
  calculateCompletionTime() {
    if (!this.submittedAt) {
      return null;
    }
    
    const startTime = new Date(this.createdAt).getTime();
    const endTime = new Date(this.submittedAt).getTime();
    
    // Calculate time difference in minutes
    return Math.round((endTime - startTime) / (1000 * 60));
  }
  
  /**
   * Submit responses to the challenge
   * @param {Array} responses - Array of response objects
   * @returns {Challenge} Updated challenge instance
   * @throws {ChallengeInvalidStateError} If challenge is already completed
   * @throws {ChallengeValidationError} If responses are invalid
   */
  submitResponses(responses) {
    // Check challenge state before submission
    if (this.isCompleted()) {
      throw new ChallengeInvalidStateError('Cannot submit responses to an already completed challenge');
    }
    
    // Validate responses
    if (!Array.isArray(responses)) {
      throw new ChallengeValidationError('Responses must be provided as an array');
    }
    
    if (responses.length === 0) {
      throw new ChallengeValidationError('At least one response must be provided');
    }
    
    // Normalize responses to ensure they have required fields
    const normalizedResponses = responses.map((resp, index) => {
      if (typeof resp === 'string') {
        return {
          id: `r${index + 1}`,
          content: resp,
          questionId: this.questions[index]?.id || null,
          timestamp: new Date().toISOString()
        };
      } else if (typeof resp === 'object' && resp !== null) {
        if (!resp.response && !resp.content) {
          throw new ChallengeValidationError(`Response at index ${index} must have content or response property`);
        }
        return {
          id: resp.id || `r${index + 1}`,
          content: resp.response || resp.content,
          questionId: resp.questionId || this.questions[index]?.id || null,
          timestamp: resp.timestamp || new Date().toISOString()
        };
      } else {
        throw new ChallengeValidationError(`Invalid response format at index ${index}`);
      }
    });
    
    // Update challenge state
    this.responses = normalizedResponses;
    this.status = 'submitted';
    this.submittedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    // Add domain event for response submission
    this.addEvent(EventTypes.CHALLENGE_RESPONSE_SUBMITTED, {
      challengeType: this.challengeType,
      focusArea: this.focusArea,
      difficulty: this.difficulty,
      responseCount: this.responses.length
    });
    
    // Enforce invariants after state change
    this._enforceInvariants();
    
    return this;
  }
  
  /**
   * Complete the challenge with an evaluation
   * @param {Object} evaluation - Evaluation data
   * @param {number} evaluation.score - Numeric score
   * @param {string} evaluation.feedback - Feedback text
   * @param {Object} [evaluation.criteria] - Criteria-specific evaluations
   * @returns {Challenge} Updated challenge instance
   * @throws {ChallengeInvalidStateError} If challenge is in an invalid state for completion
   * @throws {ChallengeValidationError} If evaluation data is invalid
   */
  complete(evaluation) {
    // Check if already completed
    if (this.isCompleted()) {
      throw new ChallengeInvalidStateError('Challenge is already completed');
    }
    
    // Check if responses are submitted before completion
    if (!this.isSubmitted()) {
      throw new ChallengeInvalidStateError('Cannot complete a challenge before responses are submitted');
    }
    
    if (this.responses.length === 0) {
      throw new ChallengeInvalidStateError('Cannot complete a challenge without responses');
    }
    
    // Validate evaluation data
    if (!evaluation || typeof evaluation !== 'object') {
      throw new ChallengeValidationError('Evaluation data is required to complete a challenge');
    }
    
    const { score, feedback } = evaluation;
    
    if (typeof score !== 'number' || score < 0) {
      throw new ChallengeValidationError('Evaluation must include a valid numeric score');
    }
    
    if (!feedback || typeof feedback !== 'string') {
      throw new ChallengeValidationError('Evaluation must include feedback text');
    }
    
    // Update challenge state
    this.evaluation = evaluation;
    this.status = 'completed';
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    // Add domain event for challenge evaluation
    this.addEvent(EventTypes.CHALLENGE_EVALUATED, {
      score: this.evaluation.score,
      challengeType: this.challengeType,
      focusArea: this.focusArea,
      difficulty: this.difficulty
    });
    
    // Enforce invariants after state change
    this._enforceInvariants();
    
    return this;
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
   * This method enforces domain rules for what can be updated and when
   * @param {Object} updates - Data to update
   * @returns {Challenge} Updated challenge instance
   * @throws {ChallengeInvalidStateError} If update would violate invariants
   */
  update(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new ChallengeValidationError('Update data must be an object');
    }
    
    // Prevent modification of core identifiers
    const protectedFields = ['id', 'createdAt'];
    
    // Additional fields that can't be modified after submission
    const lockedAfterSubmission = ['responses', 'submittedAt', 'completedAt'];
    
    // Check if attempting to modify locked fields after submission
    if (this.isSubmitted()) {
      for (const field of lockedAfterSubmission) {
        if (updates[field] !== undefined) {
          throw new ChallengeInvalidStateError(`Cannot modify ${field} after challenge has been submitted`);
        }
      }
    }
    
    // Prevent state regression from completed to submitted or active
    if (this.isCompleted() && updates.status && updates.status !== 'completed') {
      throw new ChallengeInvalidStateError('Cannot change status of a completed challenge');
    }
    
    // Prevent adding evaluation without completing the challenge
    if (updates.evaluation && (!updates.status || updates.status !== 'completed')) {
      updates.status = 'completed';
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (!protectedFields.includes(key)) {
        this[key] = updates[key];
      }
    });
    
    this.updatedAt = new Date().toISOString();
    
    // Enforce invariants after update
    this._enforceInvariants();
    
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
      responses: this.responses,
      evaluation: this.evaluation,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      submittedAt: this.submittedAt,
      completedAt: this.completedAt
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
      responses: data.responses || [],
      evaluation: data.evaluation || null,
      status: data.status || 'active',
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      submittedAt: data.submitted_at || data.submittedAt || null,
      completedAt: data.completed_at || data.completedAt || null
    };
    
    return new Challenge(mapped);
  }
  
  /**
   * Convert to database format (with snake_case keys)
   * @returns {Object} Object formatted for database storage
   */
  toDatabase() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      questions: this.questions,
      evaluation_criteria: this.evaluationCriteria,
      recommended_resources: this.recommendedResources,
      challenge_type: this.challengeType,
      format_type: this.formatType,
      difficulty: this.difficulty,
      focus_area: this.focusArea,
      user_id: this.userId,
      type_metadata: this.typeMetadata,
      format_metadata: this.formatMetadata,
      metadata: this.metadata,
      responses: this.responses,
      evaluation: this.evaluation,
      status: this.status,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      submitted_at: this.submittedAt,
      completed_at: this.completedAt
    };
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