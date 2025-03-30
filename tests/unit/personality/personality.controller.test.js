import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import PersonalityController from '../../../src/core/personality/controllers/PersonalityController.js';
import personalityErrors from '../../../src/core/personality/errors/PersonalityErrors.js';

const { PersonalityNotFoundError } = personalityErrors;

describe('Personality Controller', () => {
    let personalityController;
    let personalityRepositoryMock;
    let containerStub;
    let reqMock;
    let resMock;
    let nextMock;
    
    beforeEach(() => {
        // Create mock repository
        personalityRepositoryMock = {
            findByUserId: sinon.stub(),
            findById: sinon.stub(),
            update: sinon.stub(),
            create: sinon.stub()
        };
        
        // Mock the container
        containerStub = {
            get: sinon.stub()
        };
        containerStub.get.withArgs('personalityRepository').returns(personalityRepositoryMock);
        
        // Mock req, res, next
        reqMock = {
            user: { id: 'user123', email: 'test@example.com' },
            params: {},
            body: {}
        };
        resMock = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
            success: sinon.stub()
        };
        nextMock = sinon.stub();
        
        // Create controller instance
        personalityController = new PersonalityController();
        personalityController.personalityRepository = personalityRepositoryMock;
    });
    
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
    });
    
    describe('getPersonalityProfile', () => {
        it('should return personality profile when found', async () => {
            // Arrange
            const mockPersonality = {
                userId: 'user123',
                traits: { openness: 0.8, conscientiousness: 0.6 },
                insights: ['values creativity', 'goal-oriented']
            };
            personalityRepositoryMock.findByUserId.resolves(mockPersonality);
            resMock.success.returns({ status: 'success', data: { personality: mockPersonality } });
            
            // Act
            await personalityController.getPersonalityProfile(reqMock, resMock, nextMock);
            
            // Assert
            expect(personalityRepositoryMock.findByUserId.calledOnceWith('user123')).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ personality: mockPersonality });
            expect(nextMock.called).to.be.false;
        });
        
        it('should call next with error when personality not found', async () => {
            // Arrange
            personalityRepositoryMock.findByUserId.resolves(null);
            
            // Act
            await personalityController.getPersonalityProfile(reqMock, resMock, nextMock);
            
            // Assert
            expect(personalityRepositoryMock.findByUserId.calledOnceWith('user123')).to.be.true;
            expect(resMock.success.called).to.be.false;
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(PersonalityNotFoundError);
        });
    });
    
    describe('updatePersonalityTraits', () => {
        it('should update and return personality traits', async () => {
            // Arrange
            const traitsData = { openness: 0.9, conscientiousness: 0.7 };
            reqMock.body = { traits: traitsData };
            const mockPersonality = {
                userId: 'user123',
                traits: { openness: 0.8, conscientiousness: 0.6 },
                insights: ['values creativity', 'goal-oriented']
            };
            const mockUpdatedPersonality = {
                userId: 'user123',
                traits: traitsData,
                insights: ['values creativity', 'goal-oriented']
            };
            personalityRepositoryMock.findByUserId.resolves(mockPersonality);
            personalityRepositoryMock.update.resolves(mockUpdatedPersonality);
            resMock.success.returns({ 
                status: 'success', 
                data: { personality: mockUpdatedPersonality } 
            });
            
            // Act
            await personalityController.updatePersonalityTraits(reqMock, resMock, nextMock);
            
            // Assert
            expect(personalityRepositoryMock.findByUserId.calledOnceWith('user123')).to.be.true;
            expect(personalityRepositoryMock.update.calledOnce).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ 
                personality: mockUpdatedPersonality 
            });
            expect(nextMock.called).to.be.false;
        });
        
        it('should create new personality profile if none exists', async () => {
            // Arrange
            const traitsData = { openness: 0.9, conscientiousness: 0.7 };
            reqMock.body = { traits: traitsData };
            personalityRepositoryMock.findByUserId.resolves(null);
            const mockNewPersonality = {
                userId: 'user123',
                traits: traitsData,
                insights: []
            };
            personalityRepositoryMock.create.resolves(mockNewPersonality);
            resMock.success.returns({ 
                status: 'success', 
                data: { personality: mockNewPersonality, created: true } 
            });
            
            // Act
            await personalityController.updatePersonalityTraits(reqMock, resMock, nextMock);
            
            // Assert
            expect(personalityRepositoryMock.findByUserId.calledOnceWith('user123')).to.be.true;
            expect(personalityRepositoryMock.create.calledOnce).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ 
                personality: mockNewPersonality,
                created: true
            });
            expect(nextMock.called).to.be.false;
        });
    });
});
