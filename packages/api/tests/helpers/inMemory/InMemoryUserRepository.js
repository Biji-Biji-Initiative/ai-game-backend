import { v4 as uuidv4 } from "uuid";
import User from "@tests/core/user/models/User.js";
/**
 *
 */
class InMemoryUserRepository {
    /**
     *
     */
    constructor(initialUsers = []) {
        // Initialize with empty Map or seed data
        this.users = new Map();
        // Add any initial test users
        initialUsers.forEach(user => {
            if (user instanceof User) {
                this.users.set(user.id || uuidv4(), user);
            }
            else {
                const userModel = new User(user);
                this.users.set(userModel.id || uuidv4(), userModel);
            }
        });
    }
    /**
     * Find a user by ID
     * @param {string} id - User ID
     * @returns {Promise<User|null>} User object or null if not found
     */
    async findById(id) {
        return this.users.get(id) || null;
    }
    /**
     * Find a user by email
     * @param {string} email - User email
     * @returns {Promise<User|null>} User object or null if not found
     */
    async findByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }
    /**
     * Save a user domain object to the repository
     * @param {User} user - User domain object
     * @returns {Promise<User>} Updated user domain object
     */
    async save(user) {
        if (!(user instanceof User)) {
            throw new Error('Can only save User instances');
        }
        // Generate ID if not present
        if (!user.id) {
            user.id = uuidv4();
        }
        // Set timestamps if not already set
        if (!user.createdAt) {
            user.createdAt = new Date().toISOString();
        }
        user.updatedAt = new Date().toISOString();
        // Store user in the map
        this.users.set(user.id, user);
        // Return a copy to simulate a DB operation
        return new User(user);
    }
    /**
     * Find all users matching criteria
     * @param {Object} criteria - Filtering criteria
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array<User>>} List of matching users
     */
    async findAll(criteria = {}, options = {}) {
        let results = Array.from(this.users.values());
        // Apply simple criteria filtering (exact matches only)
        if (criteria && Object.keys(criteria).length > 0) {
            results = results.filter(user => {
                return Object.entries(criteria).every(([key, value]) => {
                    return user[key] === value;
                });
            });
        }
        // Apply sorting if specified
        if (options.orderBy) {
            const [field, direction] = options.orderBy.split(' ');
            const sortOrder = direction === 'desc' ? -1 : 1;
            results.sort((a, b) => {
                if (a[field] < b[field]) {
                    return -1 * sortOrder;
                }
                if (a[field] > b[field]) {
                    return 1 * sortOrder;
                }
                return 0;
            });
        }
        // Apply pagination
        if (options.offset || options.limit) {
            const offset = options.offset || 0;
            const limit = options.limit || results.length;
            results = results.slice(offset, offset + limit);
        }
        return results;
    }
    /**
     * Delete a user by ID
     * @param {string} id - User ID
     * @returns {Promise<boolean>} True if successful
     */
    async delete(id) {
        const exists = this.users.has(id);
        if (exists) {
            this.users.delete(id);
        }
        return exists;
    }
    /**
     * Find users by role
     * @param {string} role - Role to search for
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array<User>>} List of matching users
     */
    async findByRole(role, options = {}) {
        const users = Array.from(this.users.values()).filter(user => Array.isArray(user.roles) && user.roles.includes(role));
        // Apply pagination
        if (options.offset || options.limit) {
            const offset = options.offset || 0;
            const limit = options.limit || users.length;
            return users.slice(offset, offset + limit);
        }
        return users;
    }
    /**
     * Clear all data - useful for test setup/teardown
     */
    clear() {
        this.users.clear();
    }
    /**
     * Get count of users - useful for assertions
     * @returns {number} Number of users in the repository
     */
    count() {
        return this.users.size;
    }
}
export default InMemoryUserRepository;
