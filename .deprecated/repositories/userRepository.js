/**
 * User Repository
 * Handles all data operations for users
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const supabase = require('../lib/supabase');

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
const createUser = async (userData) => {
  try {
    const userId = userData.id || uuidv4();
    const user = {
      id: userId,
      email: userData.email,
      full_name: userData.fullName,
      professional_title: userData.professionalTitle,
      location: userData.location || null,
      country: userData.country || null,
      personality_traits: userData.personalityTraits || {},
      ai_attitudes: userData.aiAttitudes || {},
      focus_area: userData.focusArea || null,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
      
    if (error) throw error;
    
    logger.info(`User created with email: ${userData.email}`);
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      professionalTitle: data.professional_title,
      location: data.location,
      country: data.country,
      personalityTraits: data.personality_traits || {},
      aiAttitudes: data.ai_attitudes || {},
      focusArea: data.focus_area,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Get a user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User or null if not found
 */
const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is the error code for 'no rows returned'
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      professionalTitle: data.professional_title,
      location: data.location,
      country: data.country,
      personalityTraits: data.personality_traits,
      aiAttitudes: data.ai_attitudes,
      focusArea: data.focus_area,
      onboardingCompleted: data.onboarding_completed,
      lastActive: data.last_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    logger.error('Error getting user by email:', error);
    throw error;
  }
};

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User or null if not found
 */
const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is the error code for 'no rows returned'
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      professionalTitle: data.professional_title,
      location: data.location,
      country: data.country,
      personalityTraits: data.personality_traits,
      aiAttitudes: data.ai_attitudes,
      focusAreaThreadId: data.focus_area_thread_id,
      focusArea: data.focus_area,
      onboardingCompleted: data.onboarding_completed,
      lastActive: data.last_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Update a user
 * @param {string} email - User email
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} - Updated user or null if not found
 */
const updateUser = async (email, updates) => {
  try {
    // Convert camelCase to snake_case for the database
    const dbUpdates = {};
    
    if (updates.fullName) dbUpdates.full_name = updates.fullName;
    if (updates.professionalTitle) dbUpdates.professional_title = updates.professionalTitle;
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.country) dbUpdates.country = updates.country;
    if (updates.personalityTraits) dbUpdates.personality_traits = updates.personalityTraits;
    if (updates.aiAttitudes) dbUpdates.ai_attitudes = updates.aiAttitudes;
    if (updates.focusArea) dbUpdates.focus_area = updates.focusArea;
    if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;
    if (updates.lastActive) dbUpdates.last_active = updates.lastActive;
    
    // Add updated timestamp
    dbUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('email', email)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      professionalTitle: data.professional_title,
      location: data.location,
      country: data.country,
      personalityTraits: data.personality_traits,
      aiAttitudes: data.ai_attitudes,
      focusArea: data.focus_area,
      onboardingCompleted: data.onboarding_completed,
      lastActive: data.last_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Get all users
 * @returns {Promise<Array>} - List of all users
 */
const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform from snake_case to camelCase for consistency in the app
    return data.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      professionalTitle: user.professional_title,
      location: user.location,
      country: user.country,
      personalityTraits: user.personality_traits,
      aiAttitudes: user.ai_attitudes,
      focusArea: user.focus_area,
      onboardingCompleted: user.onboarding_completed,
      lastActive: user.last_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getAllUsers
};
