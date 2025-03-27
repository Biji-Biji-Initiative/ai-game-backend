const express = require('express');
const router = express.Router();
const { 
  generateChallenge, 
  submitChallengeResponse, 
  submitChallengeResponseStream,
  getChallengeHistory, 
  getChallengeById 
} = require('../core/challenge/controllers/ChallengeController');

// Generate a new challenge
router.post('/generate', generateChallenge);

// Submit a response to a challenge
router.post('/:challengeId/submit', submitChallengeResponse);

// Submit a response to a challenge with streaming response
router.post('/:challengeId/submit/stream', submitChallengeResponseStream);

// Get user challenge history
router.get('/user/:email/history', getChallengeHistory);

// Get challenge by ID
router.get('/:challengeId', getChallengeById);

module.exports = router;
