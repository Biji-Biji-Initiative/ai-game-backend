import SupabaseClientFactory from '../shared/SupabaseClientFactory.js';
'use strict';

/**
 * Base repository class for Supabase data access
 * Provides common functionality for all repositories
 */
class BaseSupabaseRepository {
  /**
   * Create a new BaseSupabaseRepository
   * @param {Object} config - Configuration for the repository
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.supabase = config.supabase || SupabaseClientFactory.createClient({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey
    });
    this.logger = config.logger || console;
  }

  /**
   * Create a repository instance from environment variables
   * @param {Object} config - Configuration for the repository
   * @param {Object} [config.logger] - Logger instance
   * @returns {BaseSupabaseRepository} Repository instance
   */
  static createFromEnvironment(config = {}) {
    return new this({
      supabase: SupabaseClientFactory.createFromEnvironment(),
      logger: config.logger
    });
  }

  /**
   * Create a repository instance with service role permissions
   * @param {Object} config - Configuration for the repository
   * @param {Object} [config.logger] - Logger instance
   * @returns {BaseSupabaseRepository} Repository instance with service role permissions
   */
  static createWithServiceRole(config = {}) {
    return new this({
      supabase: SupabaseClientFactory.createServiceClient(),
      logger: config.logger
    });
  }

  /**
   * Handle Supabase errors
   * @param {Error} error - Error to handle
   * @param {string} operation - Operation that caused the error
   * @param {Object} context - Additional context for the error
   * @throws {Error} Rethrows the error with additional context
   * @protected
   */
  _handleError(error, operation, context = {}) {
    this.logger.error(`Supabase error during ${operation}`, {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      ...context
    });

    // Enhance error with operation and context
    error.operation = operation;
    error.context = context;

    throw error;
  }

  /**
   * Execute a Supabase query with error handling
   * @param {Function} queryFn - Function that returns a Supabase query
   * @param {string} operation - Operation description for error handling
   * @param {Object} context - Additional context for error handling
   * @returns {Promise<Object>} Query result
   * @protected
   */
  async _executeQuery(queryFn, operation, context = {}) {
    try {
      const { data, error } = await queryFn();

      if (error) {
        this._handleError(error, operation, context);
      }

      return data;
    } catch (error) {
      this._handleError(error, operation, context);
    }
  }

  /**
   * Get a single record by ID
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {Object} [options] - Query options
   * @param {string} [options.idField='id'] - ID field name
   * @param {Array<string>} [options.select='*'] - Fields to select
   * @returns {Promise<Object>} Record
   * @protected
   */
  async _getById(table, id, options = {}) {
    const { idField = 'id', select = '*' } = options;

    return this._executeQuery(
      () => this.supabase
        .from(table)
        .select(select)
        .eq(idField, id)
        .single(),
      `get ${table} by ID`,
      { table, id, idField }
    );
  }

  /**
   * Insert a record
   * @param {string} table - Table name
   * @param {Object} data - Record data
   * @param {Object} [options] - Query options
   * @param {boolean} [options.upsert=false] - Whether to upsert
   * @param {string} [options.onConflict] - Column to use for conflict resolution
   * @param {Array<string>} [options.returning='*'] - Fields to return
   * @returns {Promise<Object>} Inserted record
   * @protected
   */
  async _insert(table, data, options = {}) {
    const { upsert = false, onConflict, returning = '*' } = options;

    let query = this.supabase
      .from(table)
      .insert(data);

    if (upsert) {
      query = query.upsert(data, { onConflict });
    }

    return this._executeQuery(
      () => query.select(returning).single(),
      `insert into ${table}`,
      { table, upsert, onConflict }
    );
  }

  /**
   * Update a record
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {Object} data - Record data
   * @param {Object} [options] - Query options
   * @param {string} [options.idField='id'] - ID field name
   * @param {Array<string>} [options.returning='*'] - Fields to return
   * @returns {Promise<Object>} Updated record
   * @protected
   */
  async _update(table, id, data, options = {}) {
    const { idField = 'id', returning = '*' } = options;

    return this._executeQuery(
      () => this.supabase
        .from(table)
        .update(data)
        .eq(idField, id)
        .select(returning)
        .single(),
      `update ${table}`,
      { table, id, idField }
    );
  }

  /**
   * Delete a record
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {Object} [options] - Query options
   * @param {string} [options.idField='id'] - ID field name
   * @returns {Promise<Object>} Deleted record
   * @protected
   */
  async _delete(table, id, options = {}) {
    const { idField = 'id' } = options;

    return this._executeQuery(
      () => this.supabase
        .from(table)
        .delete()
        .eq(idField, id)
        .single(),
      `delete from ${table}`,
      { table, id, idField }
    );
  }

  /**
   * List records
   * @param {string} table - Table name
   * @param {Object} [options] - Query options
   * @param {Object} [options.filters] - Filters to apply
   * @param {number} [options.limit] - Maximum number of records to return
   * @param {number} [options.offset] - Number of records to skip
   * @param {string} [options.orderBy] - Field to order by
   * @param {boolean} [options.ascending=true] - Whether to order ascending
   * @param {Array<string>} [options.select='*'] - Fields to select
   * @returns {Promise<Array<Object>>} Records
   * @protected
   */
  async _list(table, options = {}) {
    const {
      filters = {},
      limit,
      offset,
      orderBy,
      ascending = true,
      select = '*'
    } = options;

    let query = this.supabase
      .from(table)
      .select(select);

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        query = query.in(field, value);
      } else if (value === null) {
        query = query.is(field, null);
      } else {
        query = query.eq(field, value);
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return this._executeQuery(
      () => query,
      `list ${table}`,
      { table, filters, limit, offset, orderBy, ascending }
    );
  }

  /**
   * Count records
   * @param {string} table - Table name
   * @param {Object} [options] - Query options
   * @param {Object} [options.filters] - Filters to apply
   * @returns {Promise<number>} Count
   * @protected
   */
  async _count(table, options = {}) {
    const { filters = {} } = options;

    let query = this.supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        query = query.in(field, value);
      } else if (value === null) {
        query = query.is(field, null);
      } else {
        query = query.eq(field, value);
      }
    });

    const { count } = await this._executeQuery(
      () => query,
      `count ${table}`,
      { table, filters }
    );

    return count;
  }
}

export default BaseSupabaseRepository;
