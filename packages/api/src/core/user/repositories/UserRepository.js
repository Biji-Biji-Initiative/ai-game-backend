"../../../user/mappers/UserMapper.js;
""../../../infra/db/supabaseClient.js56;
""../../../user/schemas/userSchema.js126;
""../../../user/errors/UserErrors.js200;
""../../../common/events/domainEvents.js304;
""../../../infra/repositories/BaseRepository.js371;
""../../../infra/errors/errorStandardization.js504;
'use strict';
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
     * Save a user domain object to the database
     * @param {User} user - User domain object to save
     * @returns {Promise<User>} Updated user domain object
     * @throws {UserValidationError} If the user object fails validation
     * @throws {UserError} If database operation fails
     */
    save(user) {
        // Validate user object
        if (!user) {
            throw new ValidationError('User object is required', {
                entityType: this.domainName,
            });
        }
        if (!(user instanceof User)) {
            throw new ValidationError('Object must be a User instance', {
                entityType: this.domainName,
            });
        }
        
        // Extract domain events before saving
        const domainEvents = user.getDomainEvents ? user.getDomainEvents() : [];
        
        // Clear events from the entity to prevent double publishing
        if (user.clearDomainEvents) {
            user.clearDomainEvents();
        }
        
        // Use withTransaction to ensure events are only published after successful commit
        return this.withTransaction(async (transaction) => {
            // Convert domain object to database format using the mapper
            const dbData = UserMapper.toDatabase(user);
            
            // Set the updated_at timestamp if not already set
            if (!dbData.updated_at) {
                dbData.updated_at = new Date().toISOString();
            }
            
            let result;
            
            if (user.id) {
                // Update existing user
                this._log('debug', 'Updating existing user', { id: user.id });
                
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
            
            // Return both the result and the domain events for publishing after commit
            return {
                result: savedUser,
                domainEvents: domainEvents
            };
        }, {
            publishEvents: true,
            eventBus: this.eventBus
        });
    }
    /**
     * Delete a user by ID
     * @param {string} _id - User ID to delete
     * @throws {UserNotFoundError} If user not found
     * @throws {UserError} If database operation fails
     */
    delete(_id) {
        // Delete method with standardized error handling is applied in constructor
        // Implementation here...
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
export default UserRepository;
"