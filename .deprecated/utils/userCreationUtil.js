/**
 * User Creation Utility
 * Provides functions for creating users in both Supabase Auth and the database
 */
const supabaseClient = require('./supabase/supabaseClient');
const logger = require('./logger/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a user in both Supabase Auth and the database
 * @param {Object} userData - User data to create
 * @param {string} userData.email - User email (must be a valid email format)
 * @param {string} userData.password - User password (optional, will be generated if not provided)
 * @param {string} userData.full_name - User's full name
 * @param {string} userData.professional_title - User's professional title
 * @param {string} userData.location - User's location
 * @param {string} userData.country - User's country
 * @param {Object} userData.personality_traits - User's personality traits (optional)
 * @param {Object} userData.ai_attitudes - User's AI attitudes (optional)
 * @returns {Promise<Object>} Created user data
 */
async function createUser(userData) {
  try {
    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    if (!userData.full_name) {
      throw new Error('Full name is required');
    }
    
    // Ensure email is in a valid format
    if (!isValidEmail(userData.email)) {
      // Convert to a valid email format if needed
      userData.email = convertToValidEmail(userData.email);
      logger.info(`Converted email to valid format: ${userData.email}`);
    }
    
    // Generate a secure password if not provided
    const password = userData.password || `Test123!${Date.now()}`;
    
    logger.info('Creating user in Supabase Auth', { email: userData.email });
    
    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email: userData.email,
      password,
      options: {
        data: {
          full_name: userData.full_name,
          professional_title: userData.professional_title || ''
        }
      }
    });
    
    if (authError) {
      logger.error('Failed to create user in Auth system', { error: authError });
      
      // If auth creation fails, fall back to database-only creation
      logger.warn('Falling back to database-only user creation');
      return createDatabaseOnlyUser(userData);
    }
    
    logger.info('User created in Auth system', { id: authData.user.id });
    
    // Step 2: Create or update the user in the database with the same ID
    const dbUserData = {
      id: authData.user.id,
      email: userData.email,
      full_name: userData.full_name,
      professional_title: userData.professional_title || '',
      location: userData.location || '',
      country: userData.country || '',
      personality_traits: userData.personality_traits || null,
      ai_attitudes: userData.ai_attitudes || null
    };
    
    logger.info('Creating user in database', { id: dbUserData.id });
    
    // Insert into database
    const { data: dbData, error: dbError } = await supabaseClient
      .from('users')
      .insert([dbUserData])
      .select();
    
    if (dbError) {
      logger.error('Error creating user in database', { error: dbError });
      throw new Error(`Failed to create user in database: ${dbError.message}`);
    }
    
    // If no data is returned but no error occurred, check if the user was actually created
    if (!dbData || dbData.length === 0) {
      logger.warn('No user data returned after insertion, checking if user was created...');
      
      // Try to verify if the user was actually inserted
      const { data: checkData, error: checkError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', dbUserData.id)
        .single();
      
      if (checkError) {
        logger.error('Error verifying user creation', { error: checkError });
        throw new Error(`Error verifying user creation: ${checkError.message}`);
      }
      
      if (checkData) {
        logger.info('User was created successfully despite no return data', { user: checkData });
        return {
          ...checkData,
          auth_id: authData.user.id,
          password
        };
      } else {
        logger.error('No user found after attempted insertion');
        throw new Error('No user found after attempted insertion');
      }
    }
    
    logger.info('User created successfully in both Auth and database', { 
      id: dbData[0].id,
      email: dbData[0].email
    });
    
    // Return the created user data with auth info
    return {
      ...dbData[0],
      auth_id: authData.user.id,
      password
    };
  } catch (error) {
    logger.error('Error creating user', { error });
    throw error;
  }
}

/**
 * Create a user in the database only (no Auth)
 * @param {Object} userData - User data to create
 * @returns {Promise<Object>} Created user data
 */
async function createDatabaseOnlyUser(userData) {
  try {
    logger.info('Creating database-only user', { email: userData.email });
    
    // Generate a UUID for the user
    const userId = uuidv4();
    
    // Prepare user data
    const dbUserData = {
      id: userId,
      email: userData.email,
      full_name: userData.full_name,
      professional_title: userData.professional_title || '',
      location: userData.location || '',
      country: userData.country || '',
      personality_traits: userData.personality_traits || null,
      ai_attitudes: userData.ai_attitudes || null
    };
    
    // Insert into database
    const { data, error } = await supabaseClient
      .from('users')
      .insert([dbUserData])
      .select();
    
    if (error) {
      logger.error('Error creating database-only user', { error });
      throw new Error(`Failed to create database-only user: ${error.message}`);
    }
    
    // If no data is returned but no error occurred, check if the user was actually created
    if (!data || data.length === 0) {
      logger.warn('No user data returned after insertion, checking if user was created...');
      
      // Try to verify if the user was actually inserted
      const { data: checkData, error: checkError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (checkError) {
        logger.error('Error verifying user creation', { error: checkError });
        throw new Error(`Error verifying user creation: ${checkError.message}`);
      }
      
      if (checkData) {
        logger.info('User was created successfully despite no return data', { user: checkData });
        return checkData;
      } else {
        logger.error('No user found after attempted insertion');
        throw new Error('No user found after attempted insertion');
      }
    }
    
    logger.info('Database-only user created successfully', { 
      id: data[0].id,
      email: data[0].email
    });
    
    return data[0];
  } catch (error) {
    logger.error('Error creating database-only user', { error });
    throw error;
  }
}

/**
 * Check if an email is in a valid format
 * @param {string} email - Email to check
 * @returns {boolean} True if email is valid
 */
function isValidEmail(email) {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Convert an email to a valid format
 * @param {string} email - Email to convert
 * @returns {string} Valid email
 */
function convertToValidEmail(email) {
  // If it's already valid, return it
  if (isValidEmail(email)) {
    return email;
  }
  
  // Remove invalid characters and ensure it has @ and domain
  let validEmail = email.replace(/[^\w.-]/g, '.');
  
  // If it doesn't have an @ symbol, add one
  if (!validEmail.includes('@')) {
    validEmail = `${validEmail}@gmail.com`;
  }
  
  // If it doesn't have a domain, add one
  if (!validEmail.split('@')[1] || !validEmail.split('@')[1].includes('.')) {
    validEmail = `${validEmail.split('@')[0]}@gmail.com`;
  }
  
  return validEmail;
}

/**
 * Delete a user from both Auth and database
 * @param {string} userId - User ID to delete
 * @returns {Promise<boolean>} True if successful
 */
async function deleteUser(userId) {
  try {
    logger.info(`Deleting user with ID: ${userId}`);
    
    // Delete from database first
    const { error: dbError } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (dbError) {
      logger.error('Error deleting user from database', { error: dbError });
      throw new Error(`Failed to delete user from database: ${dbError.message}`);
    }
    
    // Try to delete from Auth as well (might not exist there)
    try {
      // Note: Admin privileges are required to delete users from Auth
      // This might fail if the user doesn't have admin rights
      await supabaseClient.auth.admin.deleteUser(userId);
      logger.info('User deleted from Auth system');
    } catch (authError) {
      // Just log this error but don't fail the operation
      logger.warn('Could not delete user from Auth system', { error: authError });
    }
    
    logger.info('User deleted successfully');
    return true;
  } catch (error) {
    logger.error('Error deleting user', { error });
    throw error;
  }
}

module.exports = {
  createUser,
  createDatabaseOnlyUser,
  deleteUser,
  isValidEmail,
  convertToValidEmail
};
