/**
 * Session Endpoints
 * 
 * Mock implementations for session-related API endpoints
 */

import apiResponse, { ApiResponse } from '../../apiResponse';

/**
 * Create a new game session
 */
interface SessionRequest {
  userEmail?: string;
  userName?: string;
}

const createSession = (data: SessionRequest): ApiResponse => {
  const sessionId = 'session_' + Math.random().toString(36).substring(2, 11);
  
  return apiResponse.success({
    id: sessionId,
    createdAt: new Date().toISOString(),
    userEmail: data.userEmail || null,
    userName: data.userName || 'Anonymous User',
    active: true,
  });
};

/**
 * Retrieve an existing session by ID
 */
const getSession = (sessionId: string): ApiResponse => {
  // In a real implementation, this would fetch session data from a database
  // For mock purposes, we'll just return a session object with the provided ID
  return apiResponse.success({
    id: sessionId,
    createdAt: new Date().toISOString(),
    userEmail: null,
    userName: 'Anonymous User',
    active: true,
    lastActivity: new Date().toISOString(),
  });
};

// Export all session-related endpoints
const sessionEndpoints = {
  createSession,
  getSession,
};

export default sessionEndpoints;
