import { expect } from 'chai';
import sinon from 'sinon';
import EvaluationRepository from '../../../../../src/core/evaluation/repositories/evaluationRepository.js';
import { Evaluation } from '../../../../../src/core/evaluation/models/Evaluation.js';

describe('EvaluationRepository Batch Query Tests', () => {
  let mockDb;
  let repository;
  let mockEvaluations;
  let mockChallenges;
  let mockUsers;
  
  beforeEach(() => {
    // Sample data for testing
    mockEvaluations = [
      { 
        id: 'eval1', 
        user_id: 'user1', 
        challenge_id: 'chal1', 
        score: 85,
        created_at: '2023-01-01T00:00:00Z'
      },
      { 
        id: 'eval2', 
        user_id: 'user2', 
        challenge_id: 'chal2', 
        score: 92, 
        created_at: '2023-01-02T00:00:00Z'
      },
      { 
        id: 'eval3', 
        user_id: 'user1', 
        challenge_id: 'chal3', 
        score: 78, 
        created_at: '2023-01-03T00:00:00Z'
      }
    ];
    
    mockChallenges = [
      { id: 'chal1', title: 'Challenge 1', difficulty: 'easy' },
      { id: 'chal2', title: 'Challenge 2', difficulty: 'medium' },
      { id: 'chal3', title: 'Challenge 3', difficulty: 'hard' }
    ];
    
    mockUsers = [
      { id: 'user1', name: 'User One', email: 'user1@example.com' },
      { id: 'user2', name: 'User Two', email: 'user2@example.com' }
    ];
    
    // Mock database
    mockDb = {
      from: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      in: sinon.stub().returns({
        execute: sinon.stub().resolves({ data: mockEvaluations, error: null })
      }),
      eq: sinon.stub().returnsThis(),
      maybeSingle: sinon.stub().resolves({ data: mockEvaluations[0], error: null })
    };
    
    // Create repository instance
    repository = new EvaluationRepository({
      db: mockDb,
      tableName: 'evaluations',
      domainName: 'evaluation'
    });
    
    // Stub parent methods
    repository._log = sinon.stub();
    repository._snakeToCamel = sinon.stub().callsFake(obj => {
      // Simple implementation to convert snake_case to camelCase
      if (!obj || typeof obj !== 'object') return obj;
      const converted = {};
      Object.keys(obj).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        converted[camelKey] = obj[key];
      });
      return converted;
    });
    
    // Stub the related repositories
    repository.container = {
      get: sinon.stub()
    };
    
    // Stub challenge repository
    const mockChallengeRepo = {
      findByIds: sinon.stub().resolves(mockChallenges.map(c => ({ 
        id: c.id, 
        title: c.title, 
        difficulty: c.difficulty 
      })))
    };
    
    // Stub user repository
    const mockUserRepo = {
      findByIds: sinon.stub().resolves(mockUsers.map(u => ({ 
        id: u.id, 
        name: u.name, 
        email: u.email 
      })))
    };
    
    // Configure container.get to return our mock repos
    repository.container.get.withArgs('challengeRepository').returns(mockChallengeRepo);
    repository.container.get.withArgs('userRepository').returns(mockUserRepo);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('findByIds method', () => {
    it('should retrieve multiple evaluations in a single query', async () => {
      const ids = ['eval1', 'eval2', 'eval3'];
      const result = await repository.findByIds(ids);
      
      expect(result).to.be.an('array').with.lengthOf(3);
      expect(result[0]).to.be.instanceOf(Evaluation);
      expect(result[0].id).to.equal('eval1');
      expect(result[1].id).to.equal('eval2');
      expect(result[2].id).to.equal('eval3');
    });
    
    it('should eager load related challenges when requested', async () => {
      const ids = ['eval1', 'eval2', 'eval3'];
      const result = await repository.findByIds(ids, { include: ['challenge'] });
      
      expect(result).to.be.an('array').with.lengthOf(3);
      
      // Check that challenges were loaded
      expect(result[0].challenge).to.exist;
      expect(result[0].challenge.id).to.equal('chal1');
      expect(result[0].challenge.title).to.equal('Challenge 1');
      
      expect(result[1].challenge).to.exist;
      expect(result[1].challenge.id).to.equal('chal2');
      
      expect(result[2].challenge).to.exist;
      expect(result[2].challenge.id).to.equal('chal3');
      
      // Verify challenge repo was called with all challenge IDs
      const challengeRepo = repository.container.get('challengeRepository');
      expect(challengeRepo.findByIds.calledOnce).to.be.true;
      expect(challengeRepo.findByIds.firstCall.args[0]).to.include.members(['chal1', 'chal2', 'chal3']);
    });
    
    it('should eager load related users when requested', async () => {
      const ids = ['eval1', 'eval2', 'eval3'];
      const result = await repository.findByIds(ids, { include: ['user'] });
      
      expect(result).to.be.an('array').with.lengthOf(3);
      
      // Check that users were loaded
      expect(result[0].user).to.exist;
      expect(result[0].user.id).to.equal('user1');
      expect(result[0].user.name).to.equal('User One');
      
      expect(result[1].user).to.exist;
      expect(result[1].user.id).to.equal('user2');
      
      expect(result[2].user).to.exist;
      expect(result[2].user.id).to.equal('user1');
      
      // Verify user repo was called with all user IDs (should be just 2 unique IDs)
      const userRepo = repository.container.get('userRepository');
      expect(userRepo.findByIds.calledOnce).to.be.true;
      expect(userRepo.findByIds.firstCall.args[0]).to.have.lengthOf(2);
      expect(userRepo.findByIds.firstCall.args[0]).to.include.members(['user1', 'user2']);
    });
    
    it('should load multiple relation types when requested', async () => {
      const ids = ['eval1', 'eval2', 'eval3'];
      const result = await repository.findByIds(ids, { include: ['user', 'challenge'] });
      
      expect(result).to.be.an('array').with.lengthOf(3);
      
      // Verify both users and challenges were loaded
      expect(result[0].user).to.exist;
      expect(result[0].challenge).to.exist;
      expect(result[1].user).to.exist;
      expect(result[1].challenge).to.exist;
      expect(result[2].user).to.exist;
      expect(result[2].challenge).to.exist;
      
      // Verify both repos were called
      const userRepo = repository.container.get('userRepository');
      const challengeRepo = repository.container.get('challengeRepository');
      expect(userRepo.findByIds.calledOnce).to.be.true;
      expect(challengeRepo.findByIds.calledOnce).to.be.true;
    });
    
    it('should handle empty results gracefully', async () => {
      // Mock empty result
      mockDb.in.returns({
        execute: sinon.stub().resolves({ data: [], error: null })
      });
      
      const ids = ['eval1', 'eval2', 'eval3'];
      const result = await repository.findByIds(ids, { include: ['user', 'challenge'] });
      
      expect(result).to.be.an('array').that.is.empty;
      
      // Verify repos were not called since there are no results to enrich
      const userRepo = repository.container.get('userRepository');
      const challengeRepo = repository.container.get('challengeRepository');
      expect(userRepo.findByIds.called).to.be.false;
      expect(challengeRepo.findByIds.called).to.be.false;
    });
    
    it('should handle database errors', async () => {
      // Mock database error
      mockDb.in.returns({
        execute: sinon.stub().resolves({ data: null, error: { message: 'Database error' } })
      });
      
      const ids = ['eval1', 'eval2', 'eval3'];
      try {
        await repository.findByIds(ids);
        // If we get here, the test should fail
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.name).to.equal('EvaluationRepositoryError');
        expect(error.message).to.include('Failed to fetch evaluations by IDs');
      }
    });
  });
}); 