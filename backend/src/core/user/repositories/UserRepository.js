'use strict';

import User from "#app/core/user/models/User.js";
import UserMapper from "#app/core/user/mappers/UserMapper.js";
import { supabaseClient } from "#app/core/infra/db/supabaseClient.js";
import { userDatabaseSchema } from "#app/core/user/schemas/userSchema.js";
import { UserNotFoundError, UserValidationError, UserError } from "#app/core/user/errors/UserErrors.js";
import domainEvents from "#app/core/common/events/domainEvents.js";
import { BaseRepository, EntityNotFoundError, ValidationError, DatabaseError } from "#app/core/infra/repositories/BaseRepository.js";
import { withRepositoryErrorHandling, createErrorMapper, createErrorCollector } from "#app/core/infra/errors/errorStandardization.js";
import { EventTypes } from "#app/core/common/events/domainEvents.js";

const { eventBus } = domainEvents;
// Create an error mapper for the user domain
const userErrorMapper = createErrorMapper({
    EntityNotFoundError: UserNotFoundError,
    ValidationError: UserValidationError,
    DatabaseError: UserError,
}, UserError);
/**
 * Repository for user data access with standardized error handling
 * @extends BaseRepository
 */
class UserRepository extends BaseRepository {
    /**
     * Create a new UserRepository
     * @param {Object} options - Repository options
     * @param {Object} options.db - Database client
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.eventBus - Event bus for domain events
     */
    constructor(options = {}) {
        super({
            db: options.db || supabaseClient,
            tableName: 'users',
            domainName: 'user',
            logger: options.logger,
            maxRetries: 3,
        });
        this.eventBus = options.eventBus || eventBus;
        this.validateUuids = true;
        // Apply standardized error handling to methods
        this.findById = withRepositoryErrorHandling(this.findById.bind(this), {
            methodName: 'findById',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        this.findByEmail = withRepositoryErrorHandling(this.findByEmail.bind(this), {
            methodName: 'findByEmail',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        this.save = withRepositoryErrorHandling(this.save.bind(this), {
            methodName: 'save',
            domainName: 'user',
            logger: this.logger,
            errorMapper: userErrorMapper,
        });
        // Apply to other methods...
    }
    /**
     * Find a user by ID
     * @param {string} id - User ID to search for
     * @param {boolean} throwIfNotFound - Whether to throw an error if user not found
     * @returns {Promise<User|null>} User object or null if not found
     * @throws {UserNotFoundError} If user not found and throwIfNotFound is true
     * @throws {UserError} If database operation fails
     */
    findById(id, throwIfNotFound = false) {
        // Validate ID
        this._validateId(id);
        return this._withRetry(async () => {
            this._log('debug', 'Finding user by ID', { id });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch user: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findById',
                    metadata: { id },
                });
            }
            if (!data) {
                this._log('debug', 'User not found', { id });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`User with ID ${id} not found`, {
                        entityId: id,
                        entityType: this.domainName,
                    });
                }
                return null;
            }
            // Validate the database data
            const validationResult = userDatabaseSchema.safeParse(data);
            if (!validationResult.success) {
                this._log('warn', 'Database data validation warning', {
                    id,
                    errors: validationResult.error.errors,
                });
            }
            // Convert database model to domain model using the mapper
            const userData = UserMapper.fromDatabase(data);
            return new User(userData);
        }, 'findById', { id });
    }
    /**
     * Find multiple users by their IDs
     * 
     * Efficiently retrieves multiple users in a single database query
     * to prevent N+1 query performance issues when loading related entities.
     * 
     * @param {Array<string>} ids - Array of user IDs
     * @returns {Promise<Array<User>>} Array of user objects
     * @throws {UserError} If database operation fails
     */
    async findByIds(ids) {
        try {
            // Use the base repository implementation to get raw data
            const records = await super.findByIds(ids);
            
            // Validate and convert each record to a domain object
            const users = [];
            
            for (const record of records) {
                // Validate the database data
                const validationResult = userDatabaseSchema.safeParse(record);
                if (!validationResult.success) {
                    this._log('warn', 'Database data validation warning', {
                        id: record.id,
                        errors: validationResult.error.errors,
                    });
                }
                
                // Convert database model to domain model using the mapper
                const userData = UserMapper.fromDatabase(record);
                users.push(new User(userData));
            }
            
            return users;
        } catch (error) {
            this._log('error', 'Error finding users by IDs', {
                count: ids?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            throw new UserError(`Failed to fetch users by IDs: ${error.message}`, {
                cause: error,
                metadata: { count: ids?.length || 0 }
            });
        }
    }
    /**
     * Find a user by email
     * @param {string} email - User email address to search for
     * @param {boolean} throwIfNotFound - Whether to throw an error if user not found
     * @returns {Promise<User|null>} User object or null if not found
     * @throws {UserNotFoundError} If user not found and throwIfNotFound is true
     * @throws {UserError} If database operation fails
     */
    findByEmail(email, throwIfNotFound = false) {
        // Validate email
        this._validateRequiredParams({ email }, ['email']);
        return this._withRetry(async () => {
            this._log('debug', 'Finding user by email', { email });
            const { data, error } = await this.db
                .from(this.tableName)
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (error) {
                throw new DatabaseError(`Failed to fetch user by email: ${error.message}`, {
                    cause: error,
                    entityType: this.domainName,
                    operation: 'findByEmail',
                    metadata: { email },
                });
            }
            if (!data) {
                this._log('debug', 'User not found by email', { email });
                if (throwIfNotFound) {
                    throw new EntityNotFoundError(`User with email ${email} not found`, {
                        entityId: email,
                        entityType: this.domainName,
                        identifierType: 'email',
                    });
                }
                return null;
            }
            // Validate the database data
            const validationResult = userDatabaseSchema.safeParse(data);
            if (!validationResult.success) {
                this._log('warn', 'Database data validation warning', {
                    email,
                    errors: validationResult.error.errors,
                });
            }
            // Convert database model to domain model using the mapper
            const userData = UserMapper.fromDatabase(data);
            return new User(userData);
        }, 'findByEmail', { email });
    }
    /**
     * Save a user to the database (create or update)
     * @param {User} user - User domain entity to save
     * @returns {Promise<User>} Saved user
     * @throws {ValidationError} If user is invalid
     * @throws {DatabaseError} If database operation fails
     */
    save(user) {
        if (!(user instanceof User)) {
            throw new ValidationError('Invalid user object provided to save method');
        }
        
        const isNew = !user.id || !(this.exists(user.id));
        this._log('debug', `${isNew ? 'Creating' : 'Updating'} user`, { userId: user.id });
        
        // Collect domain events from the entity before saving
        const domainEvents = user.getDomainEvents();
        
        return this.withTransaction(async (transaction) => {
            let result;
            
            // Convert domain model to database format
            const dbData = UserMapper.toDatabase(user);
            
            if (!isNew) {
                // Update existing user
                this._log('debug', 'Updating user', { userId: user.id });
                
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
                        metadata: { id: user.id },
                    });
                }
                
                result = data;
            } else {
                // Create new user
                this._log('debug', 'Creating new user');
                
                const { data, error } = await transaction
                    .from(this.tableName)
                    .insert(dbData)
                    .select()
                    .single();
                    
                if (error) {
                    throw new DatabaseError(`Failed to create user: ${error.message}`, {
                        cause: error,
                        entityType: this.domainName,
                        operation: 'save',
                    });
                }
                
                result = data;
            }
            
            // Convert database result back to domain model using the mapper
            const userData = UserMapper.fromDatabase(result);
            const savedUser = new User(userData);
            
            // Clear domain events from the original entity since they will be published
            user.clearDomainEvents();
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedUser,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true,
            cacheInvalidator: this.cacheInvalidator
        });
    }
    /**
     * Delete a user by ID
     * @param {string} id - ID of the user to delete
     * @returns {Promise<Object>} Result of the deletion operation
     * @throws {UserNotFoundError} If user not found
     * @throws {UserError} If database operation fails
     */
    delete(id) {
        // Validate ID
        this._validateId(id);
        
        this._log('debug', 'Deleting user', { userId: id });
        
        return this.withTransaction(async (transaction) => {
            // First find the user to ensure it exists
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
                    metadata: { id }
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
            user.addDomainEvent(EventTypes.USER_DELETED, {
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
                    metadata: { id }
                });
            }
            
            if (!result) {
                throw new UserError(`Failed to delete user with ID ${id}`);
            }
            
            // Clear events from entity since they will be published
            user.clearDomainEvents();
            
            return {
                result: { deleted: true, id: result.id },
                domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus,
            invalidateCache: true,
            cacheInvalidator: this.cacheInvalidator
        });
    }
    /**
     * Find all users matching criteria
     * @param {Object} _criteria - Search criteria
     * @param {Object} _options - Query options like pagination, sorting
     * @throws {UserError} If database operation fails
     */
    findAll(_criteria = {}, _options = {}) {
        // FindAll method with standardized error handling is applied in constructor
        // Implementation here...
    }
}

export { UserRepository };
export default UserRepository;
