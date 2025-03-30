import { expect } from "chai";
import sinon from "sinon";
import TraitsAnalysisService from "../../../core/personality/services/TraitsAnalysisService";
import personalityErrors from "../../../core/personality/errors/PersonalityErrors";
const { NoPersonalityDataError } = personalityErrors;
describe('Traits Analysis Service', () => {
    let traitsAnalysisService;
    let personalityRepositoryMock;
    beforeEach(() => {
        // Create mock repository
        personalityRepositoryMock = {
            findByUserId: sinon.stub(),
            save: sinon.stub()
        };
        // Create service instance with mocked dependencies
        traitsAnalysisService = new TraitsAnalysisService(personalityRepositoryMock);
    });
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
    });
    describe('computeDominantTraits', () => {
        it('should return dominant traits above threshold', () => {
            // Arrange
            const personalityTraits = {
                analytical: 80,
                creative: 75,
                logical: 60,
                innovative: 90,
                methodical: 50
            };
            // Act
            const result = traitsAnalysisService.computeDominantTraits(personalityTraits, 70);
            // Assert
            expect(result).to.deep.equal(['innovative', 'analytical', 'creative']);
        });
        it('should return empty array when no traits are above threshold', () => {
            // Arrange
            const personalityTraits = {
                analytical: 60,
                creative: 65,
                logical: 60
            };
            // Act
            const result = traitsAnalysisService.computeDominantTraits(personalityTraits, 70);
            // Assert
            expect(result).to.be.an('array').that.is.empty;
        });
        it('should return empty array when traits object is empty', () => {
            // Act
            const result = traitsAnalysisService.computeDominantTraits({});
            // Assert
            expect(result).to.be.an('array').that.is.empty;
        });
    });
    describe('identifyTraitClusters', () => {
        it('should categorize traits into appropriate clusters', () => {
            // Arrange
            const dominantTraits = ['analytical', 'logical', 'creative', 'collaborative'];
            // Act
            const clusters = traitsAnalysisService.identifyTraitClusters(dominantTraits);
            // Assert
            expect(clusters).to.have.property('analytical').with.members(['analytical', 'logical']);
            expect(clusters).to.have.property('creative').with.members(['creative']);
            expect(clusters).to.have.property('teamwork').with.members(['collaborative']);
            expect(clusters).to.not.have.property('leadership');
        });
        it('should return empty object when no dominant traits provided', () => {
            // Act
            const clusters = traitsAnalysisService.identifyTraitClusters([]);
            // Assert
            expect(clusters).to.be.an('object').that.is.empty;
        });
    });
    describe('analyzeAiAttitudes', () => {
        it('should correctly analyze AI attitudes and create a profile', () => {
            // Arrange
            const aiAttitudes = {
                early_adopter: 85,
                tech_savvy: 80,
                skeptical: 30,
                ethical_concern: 75
            };
            // Act
            const profile = traitsAnalysisService.analyzeAiAttitudes(aiAttitudes);
            // Assert
            expect(profile).to.have.property('overall', 'positive');
            expect(profile).to.have.property('categories');
            expect(profile.categories).to.have.property('adoption');
            expect(profile.categories).to.have.property('ethics');
            expect(profile).to.have.property('summary').that.is.a('string');
        });
        it('should return a neutral default when no attitudes provided', () => {
            // Act
            const profile = traitsAnalysisService.analyzeAiAttitudes({});
            // Assert
            expect(profile).to.have.property('overall', 'neutral');
            expect(profile.categories).to.be.an('object').that.is.empty;
            expect(profile).to.have.property('summary').that.is.a('string');
        });
    });
    describe('getEnrichedProfile', () => {
        it('should enrich an existing profile with derived insights', async () => {
            // Arrange
            const userId = 'user123';
            const mockProfile = {
                userId,
                personalityTraits: {
                    analytical: 80,
                    creative: 75
                },
                aiAttitudes: {
                    early_adopter: 85,
                    skeptical: 30
                },
                dominantTraits: [],
                traitClusters: {},
                aiAttitudeProfile: {},
                setDominantTraits: sinon.stub(),
                setTraitClusters: sinon.stub(),
                setAIAttitudeProfile: sinon.stub()
            };
            personalityRepositoryMock.findByUserId.resolves(mockProfile);
            personalityRepositoryMock.save.resolves(mockProfile);
            // Act
            const result = await traitsAnalysisService.getEnrichedProfile(userId);
            // Assert
            expect(result).to.equal(mockProfile);
            expect(mockProfile.setDominantTraits.calledOnce).to.be.true;
            expect(mockProfile.setTraitClusters.calledOnce).to.be.true;
            expect(mockProfile.setAIAttitudeProfile.calledOnce).to.be.true;
            expect(personalityRepositoryMock.save.calledWith(mockProfile)).to.be.true;
        });
        it('should return a default profile structure when no profile exists', async () => {
            // Arrange
            const userId = 'newUser123';
            personalityRepositoryMock.findByUserId.resolves(null);
            // Act
            const result = await traitsAnalysisService.getEnrichedProfile(userId);
            // Assert
            expect(result).to.have.property('userId', userId);
            expect(result).to.have.property('personalityTraits').that.is.an('object').that.is.empty;
            expect(result).to.have.property('dominantTraits').that.is.an('array').that.is.empty;
            expect(result).to.have.property('traitClusters').that.is.an('object').that.is.empty;
            expect(result).to.have.property('aiAttitudeProfile').that.is.an('object').that.is.empty;
        });
    });
    describe('calculateTraitCompatibility', () => {
        it('should correctly calculate trait compatibility score', () => {
            // Arrange
            const personalityTraits = {
                analytical: 80,
                creative: 60,
                collaborative: 70
            };
            const challengeTraits = {
                analytical: 2,
                creative: 1
            };
            // Act
            const score = traitsAnalysisService.calculateTraitCompatibility(personalityTraits, challengeTraits);
            // Assert
            expect(score).to.be.a('number');
            expect(score).to.be.within(0, 100);
        });
        it('should return neutral score when traits or challenge traits are empty', () => {
            // Act & Assert
            expect(traitsAnalysisService.calculateTraitCompatibility({}, {})).to.equal(50);
            expect(traitsAnalysisService.calculateTraitCompatibility(null, {})).to.equal(50);
            expect(traitsAnalysisService.calculateTraitCompatibility({
                analytical: 80
            }, null)).to.equal(50);
        });
    });
});
