import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
import * as express from "express";
import * as bodyParser from "body-parser";
import personalityRoutes from "../../src/routes/personalityRoutes";
// Create a test container with mocked services
const container = {
    get: sinon.stub()
};
describe('Personality Insights API', () => {
    // Set longer timeout for API calls
    this.timeout(30000);
    let app;
    let personalityServiceMock;
    beforeEach(() => {
        // Create mock services
        personalityServiceMock = {
            getOrCreatePersonalityProfile: sinon.stub(),
            getEnrichedProfile: sinon.stub(),
            generateInsights: sinon.stub(),
            getPersonalityProfile: sinon.stub(),
            updatePersonalityTraits: sinon.stub(),
            updateAIAttitudes: sinon.stub(),
            deletePersonalityProfile: sinon.stub()
        };
        // Register mocks with the container
        container.get.withArgs('personalityService').returns(personalityServiceMock);
        // Create express app for testing
        app = express();
        app.use(bodyParser.json());
        // Register response formatter middleware
        app.use((req, res, next) => {
            // Simple mock of the response formatter middleware
            res.success = data => res.json({ success: true, data });
            res.error = (message, code = 400) => res.status(code).json({ success: false, error: message });
            next();
        });
        // Register the personality routes
        app.use('/api/personality', personalityRoutes(container));
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('GET /api/personality/:userId/insights', () => {
        it('should return insights for a user', async () => {
            // Arrange
            const userId = 'test-user-123';
            const mockInsights = {
                strengths: ['Analytical thinking', 'Clear communication'],
                focus_areas: ['Logical reasoning'],
                recommendations: ['Develop technical writing']
            };
            personalityServiceMock.generateInsights.withArgs(userId).resolves(mockInsights);
            // Act & Assert
            const response = await request(app)
                .get(`/api/personality/${userId}/insights`)
                .expect('Content-Type', /json/)
                .expect(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data).to.deep.equal(mockInsights);
            expect(personalityServiceMock.generateInsights.calledOnce).to.be.true;
        });
        it('should handle errors when generating insights', async () => {
            // Arrange
            const userId = 'error-user';
            const errorMessage = 'Failed to generate insights';
            personalityServiceMock.generateInsights.withArgs(userId).rejects(new Error(errorMessage));
            // Act & Assert
            const response = await request(app)
                .get(`/api/personality/${userId}/insights`)
                .expect('Content-Type', /json/)
                .expect(500);
            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include(errorMessage);
        });
    });
    describe('GET /api/personality/:userId/profile', () => {
        it('should return a profile with query parameter filtering', async () => {
            // Arrange
            const userId = 'profile-user';
            const mockProfile = {
                id: 'profile-123',
                userId,
                personalityTraits: { analytical: 80 },
                aiAttitudes: { tech_savvy: 75 },
                insights: { strengths: ['Analysis'] }
            };
            personalityServiceMock.getPersonalityProfile.resolves(mockProfile);
            // Act & Assert
            const response = await request(app)
                .get(`/api/personality/${userId}/profile`)
                .query({ includeInsights: false })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(response.body.success).to.be.true;
            expect(personalityServiceMock.getPersonalityProfile.calledWith(userId, { includeInsights: false })).to.be.true;
        });
        it('should handle missing profiles', async () => {
            // Arrange
            const userId = 'missing-user';
            personalityServiceMock.getPersonalityProfile.withArgs(userId).resolves(null);
            // Act & Assert
            const response = await request(app)
                .get(`/api/personality/${userId}/profile`)
                .expect('Content-Type', /json/)
                .expect(404);
            expect(response.body.success).to.be.false;
            expect(response.body.error).to.include('not found');
        });
    });
    describe('PUT /api/personality/:userId/traits', () => {
        it('should update personality traits', async () => {
            // Arrange
            const userId = 'traits-user';
            const traits = { analytical: 90, creative: 80 };
            const updatedProfile = {
                id: 'profile-456',
                userId,
                personalityTraits: traits
            };
            personalityServiceMock.updatePersonalityTraits.withArgs(userId, traits).resolves(updatedProfile);
            // Act & Assert
            const response = await request(app)
                .put(`/api/personality/${userId}/traits`)
                .send(traits)
                .expect('Content-Type', /json/)
                .expect(200);
            expect(response.body.success).to.be.true;
            expect(response.body.data).to.deep.equal(updatedProfile);
            expect(personalityServiceMock.updatePersonalityTraits.calledWith(userId, traits)).to.be.true;
        });
    });
});
