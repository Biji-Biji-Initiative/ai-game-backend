import { expect } from "chai";
import difficultySchema from "../../../../src/core/adaptive/schemas/DifficultySchema.js";
import recommendationSchema from "../../../../src/core/adaptive/schemas/RecommendationSchema.js";
const { DifficultySchema, PersonalityTraitsSchema } = difficultySchema;
const { RecommendationSchema, RecommendationDatabaseSchema } = recommendationSchema;
describe('Adaptive Domain Schemas', () => {
    describe('DifficultySchema', () => {
        it('should validate a valid difficulty object', () => {
            const validDifficulty = {
                level: 'intermediate',
                complexity: 0.7,
                depth: 0.6,
                timeAllocation: 300,
                adaptiveFactor: 0.2
            };
            const result = DifficultySchema.safeParse(validDifficulty);
            expect(result.success).to.be.true;
            expect(result.data).to.deep.equal(validDifficulty);
        });
        it('should apply default values for missing fields', () => {
            const minimalDifficulty = {};
            const result = DifficultySchema.safeParse(minimalDifficulty);
            expect(result.success).to.be.true;
            expect(result.data).to.deep.equal({
                level: 'beginner',
                complexity: 0.5,
                depth: 0.5,
                timeAllocation: 300,
                adaptiveFactor: 0.0
            });
        });
        it('should reject invalid values', () => {
            const invalidDifficulty = {
                level: 'super-hard', // invalid enum value
                complexity: 1.5, // > 1
                depth: -0.1, // < 0
                timeAllocation: 30, // < 60
                adaptiveFactor: 2 // > 1
            };
            const result = DifficultySchema.safeParse(invalidDifficulty);
            expect(result.success).to.be.false;
            expect(result.error.issues.length).to.be.greaterThan(0);
        });
    });
    describe('PersonalityTraitsSchema', () => {
        it('should validate a valid personality traits object', () => {
            const validTraits = {
                openness: 0.8,
                conscientiousness: 0.7,
                extraversion: 0.5,
                agreeableness: 0.6,
                neuroticism: 0.3
            };
            const result = PersonalityTraitsSchema.safeParse(validTraits);
            expect(result.success).to.be.true;
            expect(result.data).to.deep.equal(validTraits);
        });
        it('should allow partial personality traits', () => {
            const partialTraits = {
                openness: 0.8,
                conscientiousness: 0.7
            };
            const result = PersonalityTraitsSchema.safeParse(partialTraits);
            expect(result.success).to.be.true;
            expect(result.data).to.deep.equal(partialTraits);
        });
        it('should reject traits outside the 0-1 range', () => {
            const invalidTraits = {
                openness: 1.2, // > 1
                neuroticism: -0.1 // < 0
            };
            const result = PersonalityTraitsSchema.safeParse(invalidTraits);
            expect(result.success).to.be.false;
            expect(result.error.issues.length).to.be.greaterThan(0);
        });
    });
    describe('RecommendationSchema', () => {
        it('should validate a valid recommendation', () => {
            const validRecommendation = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                userId: 'user123',
                createdAt: new Date().toISOString(),
                recommendedFocusAreas: ['critical-thinking', 'problem-solving'],
                recommendedChallengeTypes: ['analysis', 'creative'],
                suggestedLearningResources: [
                    { title: 'Resource 1', url: 'https://example.com/1' }
                ],
                strengths: ['logic', 'reasoning'],
                weaknesses: ['communication'],
                metadata: { source: 'test' }
            };
            const result = RecommendationSchema.safeParse(validRecommendation);
            expect(result.success).to.be.true;
            expect(result.data).to.deep.equal(validRecommendation);
        });
        it('should apply default values', () => {
            const minimalRecommendation = {
                userId: 'user123'
            };
            const result = RecommendationSchema.safeParse(minimalRecommendation);
            expect(result.success).to.be.true;
            expect(result.data.userId).to.equal('user123');
            expect(result.data.recommendedFocusAreas).to.be.an('array').that.is.empty;
            expect(result.data.recommendedChallengeTypes).to.be.an('array').that.is.empty;
            expect(result.data.suggestedLearningResources).to.be.an('array').that.is.empty;
            expect(result.data.strengths).to.be.an('array').that.is.empty;
            expect(result.data.weaknesses).to.be.an('array').that.is.empty;
            expect(result.data.metadata).to.be.an('object').that.is.empty;
        });
        it('should reject invalid recommendations', () => {
            const invalidRecommendation = {
                // missing userId (required)
                suggestedLearningResources: [
                    { /* missing title (required) */ url: 'https://example.com' }
                ]
            };
            const result = RecommendationSchema.safeParse(invalidRecommendation);
            expect(result.success).to.be.false;
            expect(result.error.issues.length).to.be.greaterThan(0);
        });
    });
    describe('RecommendationDatabaseSchema', () => {
        it('should validate a database format recommendation', () => {
            const validDbRecommendation = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                user_id: 'user123',
                created_at: new Date().toISOString(),
                recommended_focus_areas: ['critical-thinking', 'problem-solving'],
                recommended_challenge_types: ['analysis', 'creative'],
                suggested_learning_resources: [
                    { title: 'Resource 1', url: 'https://example.com/1' }
                ],
                strengths: ['logic', 'reasoning'],
                weaknesses: ['communication'],
                metadata: { source: 'test' }
            };
            const result = RecommendationDatabaseSchema.safeParse(validDbRecommendation);
            expect(result.success).to.be.true;
            expect(result.data).to.deep.equal(validDbRecommendation);
        });
        it('should reject invalid database format', () => {
            const invalidDbRecommendation = {
                // using camelCase instead of snake_case
                userId: 'user123',
                recommendedFocusAreas: []
            };
            const result = RecommendationDatabaseSchema.safeParse(invalidDbRecommendation);
            expect(result.success).to.be.false;
            expect(result.error.issues.length).to.be.greaterThan(0);
        });
    });
});
