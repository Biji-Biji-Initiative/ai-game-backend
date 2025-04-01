# Repository Implementation Example

This document provides an example of a repository that properly handles entity-based event collection following our standardized domain event pattern.

## Example Repository Implementation

```javascript
import { DatabaseError, EntityNotFoundError } from '../../common/errors/index.js';
import BaseRepository from '../../infra/repositories/BaseRepository.js';
import UserMapper from '../mappers/UserMapper.js';
import User from '../models/User.js';

/**
 * Repository for User entities with standardized domain event handling
 */
class UserRepository extends BaseRepository {
  constructor(dependencies) {
    super({
      domainName: 'User',
      tableName: 'users',
      ...dependencies
    });
  }

  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User entity or null if not found
   */
  async findById(id) {
    this._validateId(id);
    
    this._log('debug', 'Finding user by ID', { userId: id });
    
    try {
      // Use cache if available
      if (this.cache) {
        const cachedUser = await this.cache.get(`user:${id}`);
        if (cachedUser) {
          this._log('debug', 'User found in cache', { userId: id });
          return new User(cachedUser);
        }
      }
      
      // Query database
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        throw new DatabaseError(`Failed to find user: ${error.message}`, {
          cause: error,
          entityType: this.domainName,
          operation: 'findById',
          entityId: id
        });
      }
      
      if (!data) {
        return null;
      }
      
      // Map to domain entity
      const userData = UserMapper.fromDatabase(data);
      const user = new User(userData);
      
      // Cache result if caching is enabled
      if (this.cache) {
        await this.cache.set(`user:${id}`, userData, 3600);
      }
      
      return user;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(`Error finding user by ID: ${error.message}`, {
        cause: error,
        entityType: this.domainName,
        operation: 'findById',
        entityId: id
      });
    }
  }

  /**
   * Save a user entity (create or update)
   * @param {User} user - User entity to save
   * @returns {Promise<User>} Saved user entity
   */
  async save(user) {
    if (!user instanceof User) {
      throw new Error('Can only save User entities');
    }
    
    const isNew = !user.id;
    this._log('debug', `${isNew ? 'Creating' : 'Updating'} user`, {
      userId: user.id || 'new',
      isNew
    });
    
    // Validate user before saving
    if (!user.isValid()) {
      const validation = user.validate();
      throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
    }
    
    // Collect domain events before saving (to be published after transaction)
    const domainEvents = user.getDomainEvents();
    
    // Use transaction to ensure atomicity and event publication after commit
    return this.withTransaction(async transaction => {
      let result;
      
      // Prepare data for database
      const dbData = UserMapper.toDatabase(user);
      
      if (user.id) {
        // Update existing user
        const { data, error } = await transaction
          .from(this.tableName)
          .update(dbData)
          .eq('id', user.id)
          .select()
          .single();
          
        if (error) {
          throw new DatabaseError(`Failed to update user: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save',
            entityId: user.id
          });
        }
        
        result = data;
      } else {
        // Create new user
        const { data, error } = await transaction
          .from(this.tableName)
          .insert(dbData)
          .select()
          .single();
          
        if (error) {
          throw new DatabaseError(`Failed to create user: ${error.message}`, {
            cause: error,
            entityType: this.domainName,
            operation: 'save'
          });
        }
        
        result = data;
      }
      
      // Convert database result back to domain model
      const userData = UserMapper.fromDatabase(result);
      const savedUser = new User(userData);
      
      // Clear domain events from the original entity since they will be published
      user.clearDomainEvents();
      
      // Return both the result and the domain events for publishing after commit
      return {
        result: savedUser,
        domainEvents
      };
    }, {
      publishEvents: true,  // Enable automatic event publishing after commit
      eventBus: this.eventBus,
      invalidateCache: true,
      cacheInvalidator: this.cacheInvalidator
    });
  }

  /**
   * Delete a user by ID
   * @param {string} id - ID of the user to delete
   * @returns {Promise<Object>} Result of the deletion operation
   */
  async delete(id) {
    this._validateId(id);
    
    this._log('debug', 'Deleting user', { userId: id });
    
    return this.withTransaction(async transaction => {
      // First find the user to ensure it exists and to collect domain events
      const { data: userRecord, error: findError } = await transaction
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (findError) {
        throw new DatabaseError(`Failed to find user for deletion: ${findError.message}`, {
          cause: findError,
          entityType: this.domainName,
          operation: 'delete',
          entityId: id
        });
      }
      
      if (!userRecord) {
        throw new EntityNotFoundError(`User with ID ${id} not found`, {
          entityId: id,
          entityType: this.domainName
        });
      }
      
      // Convert to domain entity to collect events
      const userData = UserMapper.fromDatabase(userRecord);
      const user = new User(userData);
      
      // Add domain event for deletion
      user.addDomainEvent('USER_DELETED', {
        userId: id,
        action: 'deleted'
      });
      
      // Collect domain events from the entity
      const domainEvents = user.getDomainEvents();
      
      // Delete from the database
      const { data: result, error: deleteError } = await transaction
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();
      
      if (deleteError) {
        throw new DatabaseError(`Failed to delete user: ${deleteError.message}`, {
          cause: deleteError,
          entityType: this.domainName,
          operation: 'delete',
          entityId: id
        });
      }
      
      if (!result) {
        throw new Error(`Failed to delete user with ID ${id}`);
      }
      
      // Clear events from entity since they will be published
      user.clearDomainEvents();
      
      return {
        result: { deleted: true, id: result.id },
        domainEvents
      };
    }, {
      publishEvents: true,  // Enable automatic event publishing after commit
      eventBus: this.eventBus,
      invalidateCache: true,
      cacheInvalidator: this.cacheInvalidator
    });
  }
}

export default UserRepository;
```

## Key Implementation Patterns

1. **Collect Events from Entities**:
   - The repository gets domain events from entities via `user.getDomainEvents()`
   - Events are collected before any database operations are performed

2. **Transaction Wrapper with Events**:
   - `withTransaction` encapsulates the database operations
   - The `publishEvents: true` option enables automatic event publishing after commit
   - Domain events are returned as part of the transaction result

3. **Event Clearing**:
   - After collecting events, `user.clearDomainEvents()` ensures events are only published once
   - This prevents duplicate event publications

4. **Consistent Event Creation**:
   - For operations like delete, the repository first loads the entity
   - Then it adds domain events to the entity using `addDomainEvent()`
   - This ensures all events follow the standardized structure

5. **Error Handling with Context**:
   - Detailed error information is included in thrown errors
   - This helps with debugging and provides context for failed operations

## Handling New Entity Creation

When creating a new entity that doesn't exist yet, the recommended pattern is:

```javascript
// Create a new entity
const user = new User({ 
  email: 'user@example.com', 
  fullName: 'New User',
  // other properties 
});

// Add domain events to the new entity
user.addDomainEvent('USER_CREATED', {
  email: user.email,
  // other event data
});

// Save the entity, which will publish events after successful creation
const savedUser = await userRepository.save(user);
```

The repository handles the rest - saving the entity and publishing its domain events after the transaction succeeds. 