/**
 * Mock API Endpoints Index
 * 
 * Exports all mock API endpoints for our pure frontend implementation
 */

import traitsEndpoints from './traitsEndpoints';
import focusEndpoints from './focusEndpoints';
import challengeEndpoints from './challengeEndpoints';
import profileEndpoints from './profileEndpoints';
import sessionEndpoints from './sessionEndpoints';
import fightCardEndpoints from './fightCardEndpoints';
import evaluationEndpoints from './evaluationEndpoints';
import * as userEndpoints from './userEndpoints';

// Combine all endpoints
const mockEndpoints = {
  ...traitsEndpoints,
  ...focusEndpoints,
  ...challengeEndpoints,
  ...profileEndpoints,
  ...sessionEndpoints,
  ...fightCardEndpoints,
  ...evaluationEndpoints,
  ...userEndpoints,
};

export {
  traitsEndpoints,
  focusEndpoints,
  challengeEndpoints,
  profileEndpoints,
  sessionEndpoints,
  evaluationEndpoints,
  fightCardEndpoints,
  userEndpoints,
};

export default mockEndpoints;
