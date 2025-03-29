/**
 * In Memory Repository
 * 
 * Provides an in-memory implementation of repositories for testing
 * without using mocks or stubs.
 */

const { v4: uuidv4 } = require('uuid');

/**
 *
 */
class InMemoryRepository {
  /**
   *
   */
  constructor() {
    this.items = new Map();
  }
  
  /**
   *
   */
  async save(entity) {
    // Ensure the entity has an ID
    if (!entity.id) {
      entity.id = uuidv4();
    }
    
    // Add createdAt if not present
    if (!entity.createdAt) {
      entity.createdAt = new Date();
    }
    
    // Update updatedAt
    entity.updatedAt = new Date();
    
    // Store a deep copy to prevent reference issues
    this.items.set(entity.id, JSON.parse(JSON.stringify(entity)));
    
    // Return a copy of the entity
    return JSON.parse(JSON.stringify(entity));
  }
  
  /**
   *
   */
  async findById(id) {
    const entity = this.items.get(id);
    return entity ? JSON.parse(JSON.stringify(entity)) : null;
  }
  
  /**
   *
   */
  async findAll() {
    return Array.from(this.items.values()).map(item => 
      JSON.parse(JSON.stringify(item))
    );
  }
  
  /**
   *
   */
  async update(id, data) {
    const entity = this.items.get(id);
    if (!entity) {return null;}
    
    const updated = { ...entity, ...data, updatedAt: new Date() };
    this.items.set(id, updated);
    return { ...updated };
  }
  
  /**
   *
   */
  async delete(id) {
    const exists = this.items.has(id);
    this.items.delete(id);
    return exists;
  }
  
  /**
   *
   */
  async deleteAll() {
    this.items.clear();
    return true;
  }
  
  // Common query methods
  /**
   *
   */
  async findByUserId(userId) {
    return Array.from(this.items.values())
      .filter(item => item.userId === userId)
      .map(item => ({ ...item }));
  }
}

/**
 * Creates an in-memory challenge repository
 */
function createInMemoryChallengeRepository() {
  const repo = new InMemoryRepository();
  
  // Add challenge-specific query methods
  repo.findByFocusArea = async focusArea => {
    return Array.from(repo.items.values())
      .filter(item => item.focusArea === focusArea)
      .map(item => ({ ...item }));
  };
  
  repo.findByCriteria = async (criteria, sort = {}) => {
    let results = Array.from(repo.items.values());
    
    // Apply filtering
    Object.entries(criteria).forEach(([key, value]) => {
      results = results.filter(item => item[key] === value);
    });
    
    // Apply sorting
    if (sort.sortBy) {
      results.sort((a, b) => {
        const aVal = a[sort.sortBy];
        const bVal = b[sort.sortBy];
        
        if (sort.sortOrder === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        } else {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
      });
    }
    
    return results.map(item => ({ ...item }));
  };
  
  return repo;
}

/**
 * Creates an in-memory focus area repository
 */
function createInMemoryFocusAreaRepository() {
  const repo = new InMemoryRepository();
  
  // Add focus area-specific query methods
  repo.findByPriority = async priority => {
    return Array.from(repo.items.values())
      .filter(item => item.priority === priority)
      .map(item => ({ ...item }));
  };
  
  repo.findByUserId = async userId => {
    return Array.from(repo.items.values())
      .filter(item => item.userId === userId || item.user_email === userId)
      .map(item => ({ ...item }));
  };
  
  return repo;
}

/**
 * Creates an in-memory evaluation repository
 */
function createInMemoryEvaluationRepository() {
  const repo = new InMemoryRepository();
  
  // Add evaluation-specific query methods
  repo.findByChallengeId = async challengeId => {
    return Array.from(repo.items.values())
      .filter(item => item.challengeId === challengeId)
      .map(item => ({ ...item }));
  };
  
  return repo;
}

/**
 * Creates an in-memory user repository
 */
function createInMemoryUserRepository() {
  const repo = new InMemoryRepository();
  
  // Add user-specific query methods
  repo.findByEmail = async email => {
    const users = Array.from(repo.items.values());
    const user = users.find(user => user.email === email);
    return user ? JSON.parse(JSON.stringify(user)) : null;
  };
  
  repo.findByAuthId = async authId => {
    const users = Array.from(repo.items.values());
    const user = users.find(user => user.authId === authId);
    return user ? JSON.parse(JSON.stringify(user)) : null;
  };
  
  repo.updateProfile = async (userId, profileData) => {
    const user = repo.items.get(userId);
    if (!user) {return null;}
    
    const updated = { 
      ...user, 
      profile: { ...(user.profile || {}), ...profileData },
      updatedAt: new Date()
    };
    
    repo.items.set(userId, updated);
    return { ...updated };
  };
  
  return repo;
}

/**
 * Creates an in-memory personality repository
 */
function createInMemoryPersonalityRepository() {
  const repo = new InMemoryRepository();
  
  // Add personality-specific query methods
  repo.findByUserId = async userId => {
    const personalities = Array.from(repo.items.values());
    const personality = personalities.find(p => p.userId === userId);
    return personality ? JSON.parse(JSON.stringify(personality)) : null;
  };
  
  repo.findByTraitCategory = async category => {
    return Array.from(repo.items.values())
      .filter(item => 
        item.traits && 
        item.traits.some(trait => trait.category === category)
      )
      .map(item => ({ ...item }));
  };
  
  repo.updateTraits = async (personalityId, traits) => {
    const personality = repo.items.get(personalityId);
    if (!personality) {return null;}
    
    const updatedTraits = [...(personality.traits || [])];
    
    // Update existing traits or add new ones
    traits.forEach(newTrait => {
      const existingIndex = updatedTraits.findIndex(t => t.id === newTrait.id);
      if (existingIndex >= 0) {
        updatedTraits[existingIndex] = { ...updatedTraits[existingIndex], ...newTrait };
      } else {
        updatedTraits.push({ id: uuidv4(), ...newTrait });
      }
    });
    
    const updated = { 
      ...personality, 
      traits: updatedTraits,
      updatedAt: new Date()
    };
    
    repo.items.set(personalityId, updated);
    return { ...updated };
  };
  
  return repo;
}

/**
 * Creates an in-memory prompt repository
 */
function createInMemoryPromptRepository() {
  const repo = new InMemoryRepository();
  
  // Add prompt-specific query methods
  repo.findByType = async promptType => {
    return Array.from(repo.items.values())
      .filter(item => item.type === promptType)
      .map(item => ({ ...item }));
  };
  
  repo.findByDomain = async domain => {
    return Array.from(repo.items.values())
      .filter(item => item.domain === domain)
      .map(item => ({ ...item }));
  };
  
  repo.findLatestVersion = async (promptType, domain) => {
    const prompts = Array.from(repo.items.values())
      .filter(item => 
        item.type === promptType && 
        (!domain || item.domain === domain)
      );
    
    if (prompts.length === 0) {return null;}
    
    // Sort by version number (descending)
    prompts.sort((a, b) => 
      (b.version || 0) - (a.version || 0)
    );
    
    return { ...prompts[0] };
  };
  
  return repo;
}

/**
 * Creates an in-memory conversation state repository
 */
function createInMemoryConversationStateRepository() {
  const repo = new InMemoryRepository();
  
  // Add conversation-specific query methods
  repo.findByUserIdAndType = async (userId, type) => {
    return Array.from(repo.items.values())
      .filter(item => 
        item.userId === userId && 
        (!type || item.type === type)
      )
      .map(item => ({ ...item }));
  };
  
  repo.findLatestByUserId = async userId => {
    const conversations = Array.from(repo.items.values())
      .filter(item => item.userId === userId);
    
    if (conversations.length === 0) {return null;}
    
    // Sort by timestamp (descending)
    conversations.sort((a, b) => 
      new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );
    
    return { ...conversations[0] };
  };
  
  repo.addMessage = async (conversationId, message) => {
    const conversation = repo.items.get(conversationId);
    if (!conversation) {return null;}
    
    const messages = [...(conversation.messages || [])];
    messages.push({
      id: uuidv4(),
      timestamp: new Date(),
      ...message
    });
    
    const updated = { 
      ...conversation, 
      messages,
      updatedAt: new Date()
    };
    
    repo.items.set(conversationId, updated);
    return { ...updated };
  };
  
  return repo;
}

// Create an index file that exports all repositories
module.exports = {
  InMemoryRepository,
  createInMemoryChallengeRepository,
  createInMemoryFocusAreaRepository,
  createInMemoryEvaluationRepository,
  createInMemoryUserRepository,
  createInMemoryPersonalityRepository,
  createInMemoryPromptRepository,
  createInMemoryConversationStateRepository
};
