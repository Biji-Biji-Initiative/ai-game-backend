import { expect } from 'chai';
import sinon from 'sinon';
import { BaseRepository } from '../../../../../src/core/infra/repositories/BaseRepository.js';

describe('BaseRepository Batch Query Tests', () => {
  let mockDb;
  let repository;
  let mockData;
  
  beforeEach(() => {
    // Sample data for testing
    mockData = [
      { id: 'id1', name: 'Item 1', created_at: '2023-01-01T00:00:00Z' },
      { id: 'id2', name: 'Item 2', created_at: '2023-01-02T00:00:00Z' },
      { id: 'id3', name: 'Item 3', created_at: '2023-01-03T00:00:00Z' }
    ];
    
    // Mock database response
    mockDb = {
      from: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      in: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      maybeSingle: sinon.stub().resolves({ data: mockData[0], error: null }),
      // This would be the response for the 'in' query
      execute: sinon.stub().resolves({ data: mockData, error: null })
    };
    
    // Wire up the in() method to return the execute() result
    mockDb.in.callsFake(() => {
      return {
        execute: mockDb.execute
      };
    });
    
    // Create repository instance
    repository = new BaseRepository({
      db: mockDb,
      tableName: 'test_table',
      domainName: 'test'
    });
    
    // Stub the logger method to prevent console output during tests
    repository._log = sinon.stub();
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('findByIds method', () => {
    it('should return an empty array when no IDs are provided', async () => {
      const result = await repository.findByIds([]);
      expect(result).to.be.an('array').that.is.empty;
      expect(mockDb.from.called).to.be.false;
    });
    
    it('should return an empty array when null is provided', async () => {
      const result = await repository.findByIds(null);
      expect(result).to.be.an('array').that.is.empty;
      expect(mockDb.from.called).to.be.false;
    });
    
    it('should make a single query with the IN clause for multiple IDs', async () => {
      // Set up mock to return all items
      mockDb.select.returns({
        in: sinon.stub().returns({
          execute: sinon.stub().resolves({ data: mockData, error: null })
        })
      });
      
      const ids = ['id1', 'id2', 'id3'];
      const result = await repository.findByIds(ids);
      
      expect(mockDb.from.calledWith('test_table')).to.be.true;
      expect(mockDb.select.calledWith('*')).to.be.true;
      expect(result).to.be.an('array').with.lengthOf(3);
    });
    
    it('should deduplicate IDs before querying', async () => {
      // Set up mock with spy to verify the IDs passed
      const inSpy = sinon.spy();
      mockDb.select.returns({
        in: (column, ids) => {
          inSpy(column, ids);
          return {
            execute: sinon.stub().resolves({ data: mockData, error: null })
          };
        }
      });
      
      // Duplicate IDs in the input
      const ids = ['id1', 'id1', 'id2', 'id3', 'id2'];
      await repository.findByIds(ids);
      
      // Verify that the IDs were deduplicated
      const callArgs = inSpy.getCall(0).args;
      expect(callArgs[0]).to.equal('id'); // Column name
      expect(callArgs[1]).to.be.an('array').with.lengthOf(3); // Unique IDs
      expect(callArgs[1]).to.include.members(['id1', 'id2', 'id3']);
    });
    
    it('should throw a DatabaseError when the query fails', async () => {
      // Set up mock to return an error
      mockDb.select.returns({
        in: sinon.stub().returns({
          execute: sinon.stub().resolves({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });
      
      const ids = ['id1', 'id2', 'id3'];
      try {
        await repository.findByIds(ids);
        // If we get here, the test should fail
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.name).to.equal('DatabaseError');
        expect(error.message).to.include('Failed to fetch entities by IDs');
      }
    });
    
    it('should return an empty array when the query returns no data', async () => {
      // Set up mock to return no data
      mockDb.select.returns({
        in: sinon.stub().returns({
          execute: sinon.stub().resolves({ data: null, error: null })
        })
      });
      
      const ids = ['id1', 'id2', 'id3'];
      const result = await repository.findByIds(ids);
      
      expect(result).to.be.an('array').that.is.empty;
    });
  });
}); 