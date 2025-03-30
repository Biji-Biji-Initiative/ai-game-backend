import { expect } from "chai";
import sinon from "sinon";
import PersonalityController from "../../src/core/personality/controllers/PersonalityController";
import personalityErrors from "../../src/core/personality/errors/PersonalityErrors";
const { ProfileNotFoundError, TraitsValidationError, AttitudesValidationError, InsightGenerationError, NoPersonalityDataError } = personalityErrors;
describe('Personality Controller', () => {
    let personalityController;
    let personalityServiceMock;
    let loggerMock;
    let reqMock;
    let resMock;
    let nextMock;
    beforeEach(() => {
        // Create mock services and dependencies
        personalityServiceMock = {
            getPersonalityProfile: sinon.stub(),
            generateInsights: sinon.stub(),
            updatePersonalityTraits: sinon.stub(),
            updateAIAttitudes: sinon.stub()
        };
        loggerMock = {
            info: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub()
        };
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
        // Create controller instance with dependencies
        personalityController = new PersonalityController({
            logger: loggerMock,
            personalityService: personalityServiceMock
        });
    });
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
    });
    describe('getPersonalityProfile', () => {
        it('should return personality profile when found', async () => {
            // Arrange
            const mockProfile = {
                id: 'profile123',
                userId: 'user123',
                personalityTraits: { analytical: 80, creative: 70 },
                aiAttitudes: { early_adopter: 85 }
            };
            personalityServiceMock.getPersonalityProfile.resolves(mockProfile);
            resMock.success.returns({ status: 'success', data: mockProfile });
            // Act
            await personalityController.getPersonalityProfile(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.getPersonalityProfile.calledOnceWith('user123')).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.equal(mockProfile);
            expect(nextMock.called).to.be.false;
        });
        it('should call next with error when profile is not found', async () => {
            // Arrange
            personalityServiceMock.getPersonalityProfile.resolves(null);
            // Act
            await personalityController.getPersonalityProfile(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.getPersonalityProfile.calledOnceWith('user123')).to.be.true;
            expect(resMock.success.called).to.be.false;
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(ProfileNotFoundError);
        });
        it('should return 401 when user is not authenticated', async () => {
            // Arrange
            reqMock.user = null;
            // Act
            await personalityController.getPersonalityProfile(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.getPersonalityProfile.called).to.be.false;
            expect(resMock.status.calledOnceWith(401)).to.be.true;
            expect(resMock.json.calledOnce).to.be.true;
        });
    });
    describe('updatePersonalityTraits', () => {
        it('should update personality traits and return profile', async () => {
            // Arrange
            const personalityTraits = {
                analytical: 80,
                creative: 75,
                logical: 60
            };
            reqMock.body = { personalityTraits };
            const mockProfile = {
                id: 'profile123',
                userId: 'user123',
                personalityTraits,
                dominantTraits: ['analytical', 'creative'],
                traitClusters: { analytical: ['analytical', 'logical'], creative: ['creative'] },
                updatedAt: new Date().toISOString()
            };
            personalityServiceMock.updatePersonalityTraits.resolves(mockProfile);
            // Act
            await personalityController.updatePersonalityTraits(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.updatePersonalityTraits.calledOnceWith('user123', personalityTraits)).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.include({
                id: mockProfile.id,
                personalityTraits: mockProfile.personalityTraits,
                dominantTraits: mockProfile.dominantTraits,
                traitClusters: mockProfile.traitClusters
            });
        });
        it('should throw TraitsValidationError when personalityTraits is missing', async () => {
            // Arrange
            reqMock.body = {};
            // Act
            await personalityController.updatePersonalityTraits(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.updatePersonalityTraits.called).to.be.false;
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(TraitsValidationError);
        });
    });
    describe('updateAIAttitudes', () => {
        it('should update AI attitudes and return profile', async () => {
            // Arrange
            const aiAttitudes = {
                early_adopter: 85,
                skeptical: 30
            };
            reqMock.body = { aiAttitudes };
            const mockProfile = {
                id: 'profile123',
                userId: 'user123',
                aiAttitudes,
                aiAttitudeProfile: {
                    overall: 'positive',
                    categories: { adoption: 85 }
                },
                updatedAt: new Date().toISOString()
            };
            personalityServiceMock.updateAIAttitudes.resolves(mockProfile);
            // Act
            await personalityController.updateAIAttitudes(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.updateAIAttitudes.calledOnceWith('user123', aiAttitudes)).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.include({
                id: mockProfile.id,
                aiAttitudes: mockProfile.aiAttitudes,
                aiAttitudeProfile: mockProfile.aiAttitudeProfile
            });
        });
        it('should throw AttitudesValidationError when aiAttitudes is missing', async () => {
            // Arrange
            reqMock.body = {};
            // Act
            await personalityController.updateAIAttitudes(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.updateAIAttitudes.called).to.be.false;
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(AttitudesValidationError);
        });
    });
    describe('generateInsights', () => {
        it('should generate and return insights', async () => {
            // Arrange
            const mockInsights = {
                strengths: ['analytical thinking', 'creativity'],
                challenges: ['time management'],
                recommendations: ['focus on prioritization']
            };
            personalityServiceMock.generateInsights.resolves(mockInsights);
            // Act
            await personalityController.generateInsights(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.generateInsights.calledOnceWith('user123')).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ insights: mockInsights });
        });
        it('should handle no personality data error', async () => {
            // Arrange
            personalityServiceMock.generateInsights.rejects(new Error('No personality traits available'));
            // Act
            await personalityController.generateInsights(reqMock, resMock, nextMock);
            // Assert
            expect(personalityServiceMock.generateInsights.calledOnceWith('user123')).to.be.true;
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(NoPersonalityDataError);
        });
    });
});
