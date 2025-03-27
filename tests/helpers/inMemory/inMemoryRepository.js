/**
 * In Memory Repository
 * 
 * Provides an in-memory implementation of repositories for testing
 * without using mocks or stubs.
 */

const { v4: uuidv4 } = require('uuid');

class InMemoryRepository {
  constructor() {
    this.items = new Map();
  }
  
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
  
  async findById(id) {
    const entity = this.items.get(id);
    return entity ? JSON.parse(JSON.stringify(entity)) : null;
  }
  
  async findAll() {
    return Array.from(this.items.values()).map(item => 
      JSON.parse(JSON.stringify(item))
    );
  }
  
  async update(id, data) {
    const entity = this.items.get(id);
    if (!entity) return null;
    
    const updated = { ...entity, ...data, updatedAt: new Date() };
    this.items.set(id, updated);
    return { ...updated };
  }
  
  async delete(id) {
    const exists = this.items.has(id);
    this.items.delete(id);
    return exists;
  }
  
  async deleteAll() {
    this.items.clear();
    return true;
  }
  
  // Common query methods
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
  repo.findByFocusArea = async (focusArea) => {
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
  repo.findByPriority = async (priority) => {
    return Array.from(repo.items.values())
      .filter(item => item.priority === priority)
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
  repo.findByChallengeId = async (challengeId) => {
    return Array.from(repo.items.values())
      .filter(item => item.challengeId === challengeId)
      .map(item => ({ ...item }));
  };
  
  return repo;
}

module.exports = {
  InMemoryRepository,
  createInMemoryChallengeRepository,
  createInMemoryFocusAreaRepository,
  createInMemoryEvaluationRepository
};
