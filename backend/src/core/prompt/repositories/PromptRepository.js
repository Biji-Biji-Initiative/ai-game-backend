import { challengeLogger } from "#app/core/infra/logging/domainLogger.js";
import { supabaseClient } from "#app/core/infra/db/supabaseClient.js";
import { PromptTemplateNotFoundError, PromptError } from "#app/core/prompt/common/errors.js";
'use strict';
/**
 * Repository for managing prompt templates and usage history
 */
class PromptRepository {
  /**
   * Create a new PromptRepository instance
   * @param {Object} dependencies - Dependencies for the repository
   * @param {Object} dependencies.dbClient - Database client
   * @param {Object} dependencies.logger - Logger instance
   */
  /**
   * Method constructor
   */
  constructor({
    dbClient = supabaseClient,
    logger = challengeLogger
  } = {}) {
    this.dbClient = dbClient;
    this.logger = logger;
    this.templateTableName = 'prompt_templates';
    this.historyTableName = 'prompt_history';
  }
  /**
   * Get a prompt template by ID
   * @param {string} id - Template ID
   * @returns {Promise<Object|null>} Prompt template or null if not found
   */
  async getTemplateById(id) {
    try {
      const {
        data,
        error
      } = await this.dbClient.from(this.templateTableName).select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        this.logger.error('Error getting prompt template by ID', {
          error,
          id
        });
        throw new PromptError(`Failed to get prompt template: ${error.message}`, 'DB_ERROR', 500);
      }
      return data;
    } catch (error) {
      this.logger.error('Error in getTemplateById', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  /**
   * Get a prompt template by name
   * @param {string} name - Template name
   * @returns {Promise<Object|null>} Prompt template or null if not found
   */
  async getTemplateByName(name) {
    try {
      const {
        data,
        error
      } = await this.dbClient.from(this.templateTableName).select('*').eq('name', name).single();
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        this.logger.error('Error getting prompt template by name', {
          error,
          name
        });
        throw new PromptError(`Failed to get prompt template: ${error.message}`, 'DB_ERROR', 500);
      }
      return data;
    } catch (error) {
      this.logger.error('Error in getTemplateByName', {
        error: error.message,
        name
      });
      throw error;
    }
  }
  /**
   * Get all prompt templates
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of prompt templates
   */
  async getAllTemplates(filters = {}) {
    try {
      let query = this.dbClient.from(this.templateTableName).select('*');
      // Apply filters if provided
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.domain) {
        query = query.eq('domain', filters.domain);
      }
      const {
        data,
        error
      } = await query;
      if (error) {
        this.logger.error('Error getting all prompt templates', {
          error
        });
        throw new PromptError(`Failed to get prompt templates: ${error.message}`, 'DB_ERROR', 500);
      }
      return data || [];
    } catch (error) {
      this.logger.error('Error in getAllTemplates', {
        error: error.message
      });
      throw error;
    }
  }
  /**
   * Create a new prompt template
   * @param {Object} template - Prompt template data
   * @returns {Promise<Object>} Created prompt template
   */
  async createTemplate(template) {
    try {
      if (!template.name) {
        throw new PromptError('Template name is required', 'VALIDATION_ERROR', 400);
      }
      if (!template.content) {
        throw new PromptError('Template content is required', 'VALIDATION_ERROR', 400);
      }
      // Check if template with this name already exists
      const existing = await this.getTemplateByName(template.name);
      if (existing) {
        throw new PromptError(`Template with name '${template.name}' already exists`, 'DUPLICATE_TEMPLATE', 400);
      }
      // Prepare template data
      const templateData = {
        name: template.name,
        content: template.content,
        category: template.category || 'general',
        domain: template.domain || 'general',
        variables: template.variables || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const {
        data,
        error
      } = await this.dbClient.from(this.templateTableName).insert(templateData).select().single();
      if (error) {
        this.logger.error('Error creating prompt template', {
          error,
          templateData
        });
        throw new PromptError(`Failed to create prompt template: ${error.message}`, 'DB_ERROR', 500);
      }
      return data;
    } catch (error) {
      this.logger.error('Error in createTemplate', {
        error: error.message
      });
      throw error;
    }
  }
  /**
   * Update a prompt template
   * @param {string} id - Template ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated prompt template
   */
  async updateTemplate(id, updates) {
    try {
      if (!id) {
        throw new PromptError('Template ID is required', 'VALIDATION_ERROR', 400);
      }
      // Check if template exists
      const existing = await this.getTemplateById(id);
      if (!existing) {
        throw new PromptTemplateNotFoundError(id);
      }
      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      const {
        data,
        error
      } = await this.dbClient.from(this.templateTableName).update(updateData).eq('id', id).select().single();
      if (error) {
        this.logger.error('Error updating prompt template', {
          error,
          id,
          updateData
        });
        throw new PromptError(`Failed to update prompt template: ${error.message}`, 'DB_ERROR', 500);
      }
      return data;
    } catch (error) {
      this.logger.error('Error in updateTemplate', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  /**
   * Delete a prompt template
   * @param {string} id - Template ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteTemplate(id) {
    try {
      if (!id) {
        throw new PromptError('Template ID is required', 'VALIDATION_ERROR', 400);
      }
      // Check if template exists
      const existing = await this.getTemplateById(id);
      if (!existing) {
        throw new PromptTemplateNotFoundError(id);
      }
      const {
        error
      } = await this.dbClient.from(this.templateTableName).delete().eq('id', id);
      if (error) {
        this.logger.error('Error deleting prompt template', {
          error,
          id
        });
        throw new PromptError(`Failed to delete prompt template: ${error.message}`, 'DB_ERROR', 500);
      }
      return true;
    } catch (error) {
      this.logger.error('Error in deleteTemplate', {
        error: error.message,
        id
      });
      throw error;
    }
  }
  /**
   * Record prompt usage in history
   * @param {Object} promptUsage - Prompt usage data
   * @returns {Promise<Object>} Recorded prompt usage
   */
  async recordPromptUsage(promptUsage) {
    try {
      if (!promptUsage.templateId && !promptUsage.content) {
        throw new PromptError('Either template ID or prompt content is required', 'VALIDATION_ERROR', 400);
      }
      if (!promptUsage.domain) {
        throw new PromptError('Domain is required', 'VALIDATION_ERROR', 400);
      }
      // Prepare usage data
      const usageData = {
        template_id: promptUsage.templateId || null,
        content: promptUsage.content,
        domain: promptUsage.domain,
        context: promptUsage.context || {},
        variables: promptUsage.variables || {},
        result: promptUsage.result || null,
        user_email: promptUsage.userEmail || null,
        created_at: new Date().toISOString()
      };
      const {
        data,
        error
      } = await this.dbClient.from(this.historyTableName).insert(usageData).select().single();
      if (error) {
        this.logger.error('Error recording prompt usage', {
          error,
          usageData
        });
        throw new PromptError(`Failed to record prompt usage: ${error.message}`, 'DB_ERROR', 500);
      }
      return data;
    } catch (error) {
      this.logger.error('Error in recordPromptUsage', {
        error: error.message
      });
      throw error;
    }
  }
  /**
   * Get prompt usage history
   * @param {Object} filters - Filters for history
   * @returns {Promise<Array>} Prompt usage history
   */
  async getPromptHistory(filters = {}) {
    try {
      let query = this.dbClient.from(this.historyTableName).select('*');
      // Apply filters if provided
      if (filters.domain) {
        query = query.eq('domain', filters.domain);
      }
      if (filters.userEmail) {
        query = query.eq('user_email', filters.userEmail);
      }
      if (filters.templateId) {
        query = query.eq('template_id', filters.templateId);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      // Order by created_at desc
      query = query.order('created_at', {
        ascending: false
      });
      const {
        data,
        error
      } = await query;
      if (error) {
        this.logger.error('Error getting prompt history', {
          error,
          filters
        });
        throw new PromptError(`Failed to get prompt history: ${error.message}`, 'DB_ERROR', 500);
      }
      return data || [];
    } catch (error) {
      this.logger.error('Error in getPromptHistory', {
        error: error.message
      });
      throw error;
    }
  }
}
export default PromptRepository;