/**
 * EventBusController
 * 
 * Controller for handling event bus related HTTP requests.
 * Interfaces with the RobustEventBus system.
 */
'use strict';

import { robustEventBus } from "#app/core/common/events/RobustEventBus.js";
import { logger } from "#app/core/infra/logging/logger.js";

class EventBusController {
    /**
     * Create a new EventBusController
     * @param {Object} options - Controller options
     * @param {Object} options.eventBus - The event bus instance to use
     */
    constructor({ eventBus }) {
        this.eventBus = eventBus || robustEventBus;
        this.logger = logger.child({ context: 'EventBusController' });
        this.logger.info('EventBusController initialized');
    }

    /**
     * Handle event publication requests
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     * @param {Function} next - Express next middleware
     */
    async handleEvent(req, res, next) {
        try {
            const eventData = req.body;
            
            if (!eventData || !eventData.type) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid event data. Event type is required.'
                });
            }
            
            this.logger.info(`Publishing event: ${eventData.type}`);
            
            await this.eventBus.publish(eventData);
            
            res.status(200).json({
                status: 'success',
                message: 'Event published successfully'
            });
        } catch (error) {
            this.logger.error('Error publishing event', {
                error: error.message,
                stack: error.stack
            });
            next(error);
        }
    }
}

export default EventBusController; 