'use client'

import React, { createContext, ReactNode, useContext } from 'react';
import { apiServices , 
  UserService, 
  ChallengeService, 
  GameService, 
  AIAgentService, 
  LeaderboardService, 
  AuthService 
} from '@/services/api';

/**
 * API Context interface
 */
interface ApiContextValue {
  userService: UserService;
  challengeService: ChallengeService;
  // Other services will be added as they are implemented
}

/**
 * Create the API Context with default values
 */
const ApiContext = createContext<ApiContextValue>({
  userService: apiServices.getUserService(),
  challengeService: apiServices.getChallengeService(),
});

/**
 * API Provider Props
 */
interface ApiProviderProps {
  children: ReactNode;
}

/**
 * API Provider Component
 * Provides access to all API services through React Context
 */
export function ApiProvider({ children }: ApiProviderProps): React.ReactNode {
  // Create a value object with all services
  const value: ApiContextValue = {
    userService: apiServices.getUserService(),
    challengeService: apiServices.getChallengeService(),
    // Add more services as they are implemented
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

/**
 * Hook to use the API context
 */
export function useApi(): ApiContextValue {
  const context = useContext(ApiContext);
  
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  
  return context;
}
