import { v4 as uuidv4 } from "uuid";
import Challenge from "@tests/core/challenge/models/Challenge.js";
/**
 *
 */
class InMemoryChallengeRepository {
    /**
     *
     */
    constructor(initialChallenges = []) {
        // Initialize with empty Map or seed data
        this.challenges = new Map();
        // Add any initial test challenges
        initialChallenges.forEach(challenge => {
            if (challenge instanceof Challenge) {
                this.challenges.set(challenge.id || uuidv4(), challenge);
            }
            else {
                const challengeModel = new Challenge(challenge);
                this.challenges.set(challengeModel.id || uuidv4(), challengeModel);
            }
        });
    }
    /**
     * Find a challenge by ID
     * @param {string} id - Challenge ID
     * @returns {Promise<Challenge|null>} Challenge object or null if not found
     */
    async getChallengeById(id) {
        return this.challenges.get(id) || null;
    }
    /**
     * Get recent challenges for a user
     * @param {string} userId - User ID or email
     * @param {number} limit - Maximum number of challenges to return
     * @returns {Promise<Array<Challenge>>} List of challenges
     */
    async getRecentChallengesForUser(userId, limit = 3) {
        const userChallenges = Array.from(this.challenges.values())
            .filter(challenge => challenge.userId === userId)
            .sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA; // Sort descending (newest first)
        });
        return userChallenges.slice(0, limit);
    }
    /**
     * Get all challenges for a user
     * @param {string} userId - User ID or email
     * @returns {Promise<Array<Challenge>>} List of challenges
     */
    async getChallengesForUser(userId) {
        return Array.from(this.challenges.values())
            .filter(challenge => challenge.userId === userId);
    }
    /**
     * Save a challenge to the repository
     * @param {Challenge} challenge - Challenge domain object
     * @returns {Promise<Challenge>} Saved challenge
     */
    async saveChallenge(challenge) {
        if (!(challenge instanceof Challenge)) {
            throw new Error('Can only save Challenge instances');
        }
        // Generate ID if not present
        if (!challenge.id) {
            challenge.id = uuidv4();
        }
        // Set timestamps if not already set
        if (!challenge.createdAt) {
            challenge.createdAt = new Date().toISOString();
        }
        challenge.updatedAt = new Date().toISOString();
        // Store challenge in the map
        this.challenges.set(challenge.id, challenge);
        // Return a copy to simulate a DB operation
        return new Challenge(challenge.toObject());
    }
    /**
     * Update a challenge
     * @param {string} id - Challenge ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Challenge>} Updated challenge
     */
    async updateChallenge(id, updateData) {
        const challenge = this.challenges.get(id);
        if (!challenge) {
            throw new Error(`Challenge with ID ${id} not found`);
        }
        // If given a Challenge instance, extract its data
        const updates = updateData instanceof Challenge
            ? updateData.toObject()
            : updateData;
        // Apply updates
        const updatedChallenge = challenge.update(updates);
        updatedChallenge.updatedAt = new Date().toISOString();
        // Store updated challenge
        this.challenges.set(id, updatedChallenge);
        // Return a copy to simulate a DB operation
        return new Challenge(updatedChallenge.toObject());
    }
    /**
     * Delete a challenge
     * @param {string} id - Challenge ID
     * @returns {Promise<boolean>} True if deleted
     */
    async deleteChallenge(id) {
        const exists = this.challenges.has(id);
        if (exists) {
            this.challenges.delete(id);
        }
        return exists;
    }
    /**
     * Find challenges by criteria
     * @param {Object} criteria - Search criteria
     * @param {Object} options - Search options (limit, offset, sortBy)
     * @returns {Promise<Array<Challenge>>} List of matching challenges
     */
    async findChallenges(criteria = {}, options = {}) {
        let results = Array.from(this.challenges.values());
        // Apply criteria filtering (exact matches only)
        if (criteria && Object.keys(criteria).length > 0) {
            results = results.filter(challenge => {
                return Object.entries(criteria).every(([key, value]) => {
                    return challenge[key] === value;
                });
            });
        }
        // Apply sorting if specified
        if (options.sortBy) {
            const [field, direction] = options.sortBy.split(' ');
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
        else {
            // Default sort by createdAt desc
            results.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA;
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
     * Clear all data - useful for test setup/teardown
     */
    clear() {
        this.challenges.clear();
    }
    /**
     * Get count of challenges - useful for assertions
     * @returns {number} Number of challenges in the repository
     */
    count() {
        return this.challenges.size;
    }
}
export default InMemoryChallengeRepository;
