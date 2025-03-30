import domainEvents from "../../common/events/domainEvents.js";
import { v4 as uuidv4 } from "uuid";
import { focusAreaSchema, validate } from "../../focusArea/schemas/focusAreaValidation.js";
import Entity from "../../common/models/Entity.js";
'use strict';
/**
 * Focus Area Model
 *
 * Represents a personalized focus area for AI communication training
 * Focus areas are specific communication skills or topics that users
 * can practice to improve their interaction with AI systems.
 *
 * @module FocusArea
 */
// const Entity = require('../../common/models/Entity');
const { EventTypes } = domainEvents;
/**
 * Focus Area class representing a communication focus area
 */
class FocusArea extends Entity {
    /**
     * Create a new focus area
     * @param {Object} params Focus area parameters
     * @param {string} params.id Unique identifier (optional, generated if not provided)
     * @param {string} params.userId User ID this focus area belongs to
     * @param {string} params.name Name/title of the focus area
     * @param {string} [params.description] Detailed description
     * @param {boolean} [params.active=true] Whether this focus area is active
     * @param {number} [params.priority=1] Priority level (1-5, where 1 is highest)
     * @param {Object} [params.metadata={}] Additional metadata
     */
    constructor({ id = uuidv4(), userId, name, description = '', active = true, priority = 1, metadata = {}, }) {
        super(id);
        // Validate using Zod schema
        const validatedData = validate({
            id,
            userId,
            name,
            description,
            active,
            priority,
            metadata,
        }, focusAreaSchema);
        this.userId = validatedData.userId;
        this.name = validatedData.name;
        this.description = validatedData.description;
        this.active = validatedData.active;
        this.priority = validatedData.priority;
        this.metadata = validatedData.metadata;
        this.createdAt = new Date().toISOString();
        this.updatedAt = this.createdAt;
        // Add domain event for creation (to be published after persistence)
        this.addDomainEvent(EventTypes.FOCUS_AREA_CREATED, {
            userId: this.userId,
            name: this.name,
            priority: this.priority,
        });
    }
    /**
     * Deactivate this focus area
     */
    /**
     * Method deactivate
     */
    deactivate() {
        if (this.active === false) {
            return;
        } // No-op if already inactive
        this.active = false;
        this.updatedAt = new Date().toISOString();
        // Add domain event for update (to be published after persistence)
        this.addDomainEvent(EventTypes.FOCUS_AREA_UPDATED, {
            userId: this.userId,
            name: this.name,
            active: this.active,
        });
    }
    /**
     * Activate this focus area
     */
    /**
     * Method activate
     */
    activate() {
        if (this.active === true) {
            return;
        } // No-op if already active
        this.active = true;
        this.updatedAt = new Date().toISOString();
        // Add domain event for update (to be published after persistence)
        this.addDomainEvent(EventTypes.FOCUS_AREA_UPDATED, {
            userId: this.userId,
            name: this.name,
            active: this.active,
        });
    }
    /**
     * Update focus area properties
     * @param {Object} updates Properties to update
     */
    /**
     * Method update
     */
    update(updates) {
        const allowedUpdates = ['name', 'description', 'priority', 'metadata', 'active'];
        const validUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                validUpdates[key] = updates[key];
            }
        });
        // Validate updates
        if (Object.keys(validUpdates).length > 0) {
            const validatedUpdates = validate({ ...this.toObject(), ...validUpdates }, focusAreaSchema);
            // Apply validated updates
            Object.keys(validUpdates).forEach(key => {
                this[key] = validatedUpdates[key];
            });
            this.updatedAt = new Date().toISOString();
            // Add domain event for update (to be published after persistence)
            this.addDomainEvent(EventTypes.FOCUS_AREA_UPDATED, {
                userId: this.userId,
                name: this.name,
                ...validUpdates,
            });
        }
    }
    /**
     * Convert focus area to plain object
     * @returns {Object} Plain object representation
     */
    /**
     * Method toObject
     */
    toObject() {
        return {
            id: this.id,
            userId: this.userId,
            name: this.name,
            description: this.description,
            active: this.active,
            priority: this.priority,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Create focus area from database record
     * @param {Object} record Database record
     * @returns {FocusArea} Focus area instance
     */
    static fromDatabase(record) {
        return new FocusArea({
            id: record.id,
            userId: record.user_id,
            name: record.name,
            description: record.description || '',
            active: record.active === undefined ? true : record.active,
            priority: record.priority || 1,
            metadata: record.metadata || {},
        });
    }
}
export default FocusArea;
