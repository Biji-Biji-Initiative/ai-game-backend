'use strict';

import express from 'express';
import { authorizeResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { validateBody, validateQuery, validateParams } from "#app/core/infra/http/middleware/validation.js";

/**
 * Leaderboard Routes
 * Handles routes related to challenge leaderboards
 */
const router = express.Router();

/**
 * Leaderboard routes factory
 * @param {Object} leaderboardController - Leaderboard controller instance
 * @returns {express.Router} Express router
 */
export default function leaderboardRoutes(leaderboardController) {
  // Get global leaderboard
  router.get('/global', 
    validateQuery(['timeframe', 'limit', 'offset']),
    (req, res) => leaderboardController.getGlobalLeaderboard(req, res)
  );
  
  // Get focus area leaderboard
  router.get('/focus-area/:focusAreaId', 
    validateParams('focusAreaId'),
    validateQuery(['timeframe', 'limit', 'offset']),
    (req, res) => leaderboardController.getFocusAreaLeaderboard(req, res)
  );
  
  // Get challenge-specific leaderboard
  router.get('/challenge/:challengeId', 
    validateParams('challengeId'),
    validateQuery(['timeframe', 'limit', 'offset']),
    (req, res) => leaderboardController.getChallengeLeaderboard(req, res)
  );
  
  // Get similar profiles leaderboard (users with similar traits)
  router.get('/similar-profiles', 
    validateQuery(['timeframe', 'limit', 'offset']),
    (req, res) => leaderboardController.getSimilarProfilesLeaderboard(req, res)
  );
  
  // Get friends leaderboard
  router.get('/friends', 
    validateQuery(['timeframe', 'limit', 'offset']),
    (req, res) => leaderboardController.getFriendsLeaderboard(req, res)
  );
  
  // Submit score to leaderboard
  router.post('/submit-score', 
    validateBody(['challengeId', 'score']),
    (req, res) => leaderboardController.submitScore(req, res)
  );
  
  // Get user's rank across different leaderboards
  router.get('/user-rank', 
    validateQuery(['timeframe']),
    (req, res) => leaderboardController.getUserRank(req, res)
  );
  
  // Get leaderboard insights (trends, improvements, etc.)
  router.get('/insights', 
    (req, res) => leaderboardController.getLeaderboardInsights(req, res)
  );
  
  return router;
}
