/**
 * Service for admin operations that require bypassing Row Level Security
 */
class AdminService {
  /**
   * Initialize the AdminService with dependencies
   * @param {Object} params - Dependencies
   * @param {Object} params.supabase - Supabase client with service role
   * @param {Object} params.logger - Logger instance
   */
  constructor({ supabase, logger }) {
    this.supabase = supabase;
    this.logger = logger || console;
    
    // Log initialization instead of setting context
    if (this.logger.debug) {
      this.logger.debug('AdminService initialized with dependencies');
    }
  }

  /**
   * Get all users in the system
   * This bypasses RLS using the service role
   * @returns {Promise<Array>} All users in the system
   */
  async getAllUsers() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*');

      if (error) {
        this.logger.error('Error fetching all users', { error });
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Unexpected error in getAllUsers', { error });
      throw error;
    }
  }

  /**
   * Get all evaluations across all users
   * This bypasses RLS using the service role
   * @returns {Promise<Array>} All evaluations
   */
  async getAllEvaluations() {
    try {
      const { data, error } = await this.supabase
        .from('evaluations')
        .select('*, users(email, first_name, last_name)');

      if (error) {
        this.logger.error('Error fetching all evaluations', { error });
        throw new Error(`Failed to fetch evaluations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Unexpected error in getAllEvaluations', { error });
      throw error;
    }
  }

  /**
   * Get analytics data across all users
   * This bypasses RLS using the service role
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics() {
    try {
      // Get user count
      const { data: userCount, error: userError } = await this.supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (userError) {
        this.logger.error('Error fetching user count', { error: userError });
        throw new Error(`Failed to fetch user count: ${userError.message}`);
      }

      // Get completed challenges count
      const { data: challengeData, error: challengeError } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('status', 'completed');

      if (challengeError) {
        this.logger.error('Error fetching challenge data', { error: challengeError });
        throw new Error(`Failed to fetch challenge data: ${challengeError.message}`);
      }

      // Get personality profiles count
      const { data: profileCount, error: profileError } = await this.supabase
        .from('personality_profiles')
        .select('id', { count: 'exact', head: true });

      if (profileError) {
        this.logger.error('Error fetching profile count', { error: profileError });
        throw new Error(`Failed to fetch profile count: ${profileError.message}`);
      }

      return {
        totalUsers: userCount.count || 0,
        completedChallenges: challengeData?.length || 0,
        personalityProfiles: profileCount.count || 0
      };
    } catch (error) {
      this.logger.error('Unexpected error in getAnalytics', { error });
      throw error;
    }
  }

  /**
   * Update a user's account
   * This bypasses RLS using the service role
   * @param {string} userId - The ID of the user to update
   * @param {Object} userData - The user data to update
   * @returns {Promise<Object>} The updated user
   */
  async updateUser(userId, userData) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating user', { error, userId });
        throw new Error(`Failed to update user: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Unexpected error in updateUser', { error, userId });
      throw error;
    }
  }

  /**
   * Delete a user and all associated data
   * This bypasses RLS using the service role
   * @param {string} userId - The ID of the user to delete
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      // Start a transaction to delete all user data
      // This is a simplified version - in a real app you might need to
      // delete from multiple tables in the right order
      const { error } = await this.supabase.rpc('delete_user', { user_id: userId });

      if (error) {
        this.logger.error('Error deleting user', { error, userId });
        throw new Error(`Failed to delete user: ${error.message}`);
      }

      this.logger.info('User deleted successfully', { userId });
    } catch (error) {
      this.logger.error('Unexpected error in deleteUser', { error, userId });
      throw error;
    }
  }
}

export default AdminService; 