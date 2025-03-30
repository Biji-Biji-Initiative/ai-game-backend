import { jest } from '@jest/globals';
/**
 * Integration Test: Coordinator Error Handling
 * 
 * This test suite verifies that coordinators properly catch, translate, and
 * handle domain errors from the services they depend on. It tests various
 * error conditions and ensures coordinators follow the BaseCoordinator
 * error handling patterns.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { UserNotFoundError, UserValidationError } from '../../src/core/user/errors/UserErrors.js';
import { ChallengeNotFoundError, ChallengeValidationError } from '../../src/core/challenge/errors/ChallengeErrors.js';
import { FocusAreaNotFoundError } from '../../src/core/focusArea/errors/focusAreaErrors.js';
import UserCoordinator from '../../src/application/user/UserCoordinator.js';
import ChallengeCoordinator from '../../src/application/challenge/ChallengeCoordinator.js';
import FocusAreaCoordinator from '../../src/application/focusArea/FocusAreaCoordinator.js';
import { createUserId, createChallengeId, createFocusAreaId } from '../../src/core/common/valueObjects/index.js';
import { AppError } from '../../src/core/infra/errors/AppError.js';

describe('Integration: Coordinator Error Handling', function() {
  // Set up test timeout
  jest.setTimeout(5000);
  
  // Create test value objects
  const testUserId = createUserId('user-test-123');
  const testChallengeId = createChallengeId('challenge-test-123');
  const testFocusAreaId = createFocusAreaId('focus-area-test-123');
  
  describe('UserCoordinator Error Handling', function() {
    let userService, userCoordinator, logger;
    
    beforeEach(function() {
      // Create mocks
      userService = {
        getUserProfile: sinon.stub(),
        updateUserProfile: sinon.stub()
      };
      
      logger = {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub()
      };
      
      // Create coordinator with mocked dependencies
      userCoordinator = new UserCoordinator({
        userService,
        logger
      });
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should translate UserNotFoundError to 404 AppError', async function() {
      // Configure userService.getUserProfile to throw UserNotFoundError
      userService.getUserProfile.rejects(new UserNotFoundError('User not found', testUserId.value));
      
      // Call the coordinator method
      try {
        await userCoordinator.getUserProfile(testUserId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error was translated
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(404);
        expect(error.message).to.include('User not found');
        
        // Verify original error details are preserved
        expect(error.details).to.include(testUserId.value);
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
    
    it('should translate UserValidationError to 400 AppError', async function() {
      // Configure userService.updateUserProfile to throw UserValidationError
      const validationError = new UserValidationError('Invalid user data', { field: 'email', message: 'Email is invalid' });
      userService.updateUserProfile.rejects(validationError);
      
      // Call the coordinator method
      try {
        await userCoordinator.updateUserProfile(testUserId, { email: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error was translated
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.include('validation');
        
        // Verify validation details are preserved
        expect(error.details).to.deep.include({ field: 'email', message: 'Email is invalid' });
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
  });
  
  describe('ChallengeCoordinator Error Handling', function() {
    let challengeService, challengeCoordinator, logger;
    
    beforeEach(function() {
      // Create mocks
      challengeService = {
        getChallenge: sinon.stub(),
        generateChallenge: sinon.stub()
      };
      
      logger = {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub()
      };
      
      // Create coordinator with mocked dependencies
      challengeCoordinator = new ChallengeCoordinator({
        challengeService,
        logger
      });
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should translate ChallengeNotFoundError to 404 AppError', async function() {
      // Configure challengeService.getChallenge to throw ChallengeNotFoundError
      challengeService.getChallenge.rejects(new ChallengeNotFoundError('Challenge not found', testChallengeId.value));
      
      // Call the coordinator method
      try {
        await challengeCoordinator.getChallenge(testChallengeId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error was translated
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(404);
        expect(error.message).to.include('Challenge not found');
        
        // Verify original error details are preserved
        expect(error.details).to.include(testChallengeId.value);
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
    
    it('should translate ChallengeValidationError to 400 AppError', async function() {
      // Configure challengeService.generateChallenge to throw ChallengeValidationError
      const validationError = new ChallengeValidationError('Invalid challenge data', { field: 'difficulty', message: 'Difficulty is required' });
      challengeService.generateChallenge.rejects(validationError);
      
      // Call the coordinator method
      try {
        await challengeCoordinator.generateChallenge(testUserId, {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error was translated
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(400);
        expect(error.message).to.include('validation');
        
        // Verify validation details are preserved
        expect(error.details).to.deep.include({ field: 'difficulty', message: 'Difficulty is required' });
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
  });
  
  describe('FocusAreaCoordinator Error Handling', function() {
    let focusAreaService, focusAreaCoordinator, logger;
    
    beforeEach(function() {
      // Create mocks
      focusAreaService = {
        getFocusArea: sinon.stub(),
        generateRecommendations: sinon.stub()
      };
      
      logger = {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub()
      };
      
      // Create coordinator with mocked dependencies
      focusAreaCoordinator = new FocusAreaCoordinator({
        focusAreaService,
        logger
      });
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should translate FocusAreaNotFoundError to 404 AppError', async function() {
      // Configure focusAreaService.getFocusArea to throw FocusAreaNotFoundError
      focusAreaService.getFocusArea.rejects(new FocusAreaNotFoundError('Focus area not found', testFocusAreaId.value));
      
      // Call the coordinator method
      try {
        await focusAreaCoordinator.getFocusArea(testFocusAreaId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error was translated
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(404);
        expect(error.message).to.include('Focus area not found');
        
        // Verify original error details are preserved
        expect(error.details).to.include(testFocusAreaId.value);
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
  });
  
  describe('Generic BaseCoordinator Error Handling', function() {
    let userService, userCoordinator, logger;
    
    beforeEach(function() {
      // Create mocks
      userService = {
        getUserProfile: sinon.stub()
      };
      
      logger = {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub()
      };
      
      // Create coordinator with mocked dependencies
      userCoordinator = new UserCoordinator({
        userService,
        logger
      });
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should translate unknown errors to 500 AppError', async function() {
      // Configure userService.getUserProfile to throw a generic error
      userService.getUserProfile.rejects(new Error('Unexpected database error'));
      
      // Call the coordinator method
      try {
        await userCoordinator.getUserProfile(testUserId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error was translated to a 500 AppError
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(500);
        expect(error.message).to.include('Unexpected error');
        
        // Verify original error message is included in details
        expect(error.details).to.include('Unexpected database error');
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
    
    it('should pass through AppErrors without modification', async function() {
      // Configure userService.getUserProfile to throw an AppError
      const appError = new AppError('Service unavailable', 503, { reason: 'Database connection failed' });
      userService.getUserProfile.rejects(appError);
      
      // Call the coordinator method
      try {
        await userCoordinator.getUserProfile(testUserId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify error is the same AppError that was thrown
        expect(error).to.be.instanceOf(AppError);
        expect(error.statusCode).to.equal(503);
        expect(error.message).to.equal('Service unavailable');
        expect(error.details).to.deep.include({ reason: 'Database connection failed' });
        
        // Verify logger was called
        expect(logger.error.calledOnce).to.be.true;
      }
    });
  });
}); 