import { expect } from "chai";
import sinon from "sinon";
import MockInsightGenerator from "@/infrastructure/services/MockInsightGenerator";
import domainLogger from "@/core/infra/logging/domainLogger.js";
const { personalityLogger } = domainLogger;
describe('Mock Insight Generator', () => {
    let mockInsightGenerator;
    let loggerStub;
    beforeEach(() => {
        // Create a stub for the logger
        loggerStub = {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            child: sinon.stub().returns({
                debug: sinon.stub(),
                info: sinon.stub(),
                warn: sinon.stub(),
                error: sinon.stub()
            })
        };
        // Stub the personalityLogger
        mockPersonalityLogger.child = sinon.stub().returns(loggerStub);;
        // Create instance of the generator
        mockInsightGenerator = new MockInsightGenerator();
    });
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
    });
    describe('generateFor', () => {
        it('should generate mock insights for a personality profile', async () => {
            // Arrange
            const profile = {
                userId: 'user123',
                personalityTraits: {
                    analytical: 75,
                    creative: 60,
                    communicative: 80
                }
            };
            // Act
            const insights = await mockInsightGenerator.generateFor(profile);
            // Assert
            expect(insights).to.be.an('object');
            expect(insights).to.have.property('strengths').that.is.an('array');
            expect(insights).to.have.property('focus_areas').that.is.an('array');
            expect(insights).to.have.property('recommendations').that.is.an('array');
            expect(insights).to.have.property('traits').that.is.an('object');
            expect(insights).to.have.property('ai_preferences').that.is.an('object');
            // Verify trait scores match the profile
            expect(insights.traits.analytical.score).to.equal(75);
            expect(insights.traits.creative.score).to.equal(60);
            expect(insights.traits.communicative.score).to.equal(80);
            // Verify logging
            expect(loggerStub.debug.calledWith('Generating mock insights', { userId: 'user123' })).to.be.true;
            expect(loggerStub.info.calledWith('Generated mock insights', { userId: 'user123' })).to.be.true;
        });
        it('should use default values for traits not in the profile', async () => {
            // Arrange
            const profile = {
                userId: 'user456',
                personalityTraits: {
                    // No analytical trait defined
                    creative: 60,
                    communicative: 80
                }
            };
            // Act
            const insights = await mockInsightGenerator.generateFor(profile);
            // Assert
            expect(insights.traits.analytical.score).to.equal(65); // Default value
            expect(insights.traits.creative.score).to.equal(60);
            expect(insights.traits.communicative.score).to.equal(80);
        });
        it('should always return the same structure regardless of profile input', async () => {
            // Arrange
            const emptyProfile = {
                userId: 'user789',
                personalityTraits: {}
            };
            // Act
            const insights = await mockInsightGenerator.generateFor(emptyProfile);
            // Assert
            expect(insights).to.have.property('strengths').that.is.an('array');
            expect(insights).to.have.property('focus_areas').that.is.an('array');
            expect(insights).to.have.property('recommendations').that.is.an('array');
            expect(insights).to.have.property('traits').that.is.an('object');
            expect(insights).to.have.property('ai_preferences').that.is.an('object');
        });
    });
});
