'use strict';

/**
 * System Controller
 * Provides system management and monitoring endpoints
 */
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";

export default class SystemController {
  /**
   * Create a new SystemController
   * @param {Object} options - Controller dependencies
   * @param {Object} options.logService - Service to manage system logs
   * @param {Object} options.logger - Logger instance
   */
  constructor({ logService, logger }) {
    this.logService = logService;
    this.logger = logger || infraLogger.child({ context: 'SystemController' });
    this.logger.info("SystemController initialized");
  }

  /**
   * Get system logs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getLogs(req, res, next) {
    this.logger.info("getLogs called", { query: req.query });
    
    try {
      const options = {
        limit: parseInt(req.query.limit, 10) || 500,
        level: req.query.level,
        search: req.query.search
      };
      
      const logs = await this.logService.getLogs(options);
      
      this.logger.info(`Returning ${logs.length} log entries`);
      
      res.json({
        status: "success",
        data: {
          logs,
          count: logs.length,
          logFile: "Combined PM2 logs"
        }
      });
    } catch (error) {
      this.logger.error("Error in getLogs", { error });
      next(error);
    }
  }
}