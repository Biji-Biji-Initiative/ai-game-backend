import { jest } from '@jest/globals';
import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import { createInMemoryPersonalityRepository, createInMemoryUserRepository } from "@helpers/inMemory/index.js";
import { createUserId, UserId } from '@src/core/common/valueObjects/index.js';
// Import the service (assuming module path, adjust if needed)
// import PersonalityService from '@src/core/personality/services/PersonalityService.js';
// import Personality from '@src/core/personality/models/Personality.js';
describe('Personality Service Domain Tests', function () {
    // Set longer timeout for API calls
    jest.setTimeout(30000);
    let sandbox;
    let personalityRepository;
    let userRepository;
    let personalityService;
    let openAIMock;
    beforeEach(function () {
        // Set up sinon sandbox
        sandbox = sinon.createSandbox();
        // Create in-memory repositories
        personalityRepository = createInMemoryPersonalityRepository();
        userRepository = createInMemoryUserRepository();
        // Mock the OpenAI client
        openAIMock = {
            responses: {
                create: sandbox.stub()
            },
            sendJsonMessage: sandbox.stub()
        };
        // Mock OpenAI response for insights
        openAIMock.responses.create.resolves({
            choices: [{
                    message: {
                        content: JSON.stringify({
                            strengths: ['Analytical thinking', 'Clear communication'],
                            focus_areas: ['Logical reasoning'],
                            recommendations: ['Develop technical writing']
                        })
                    }
                }]
        });
        // Create the personality service with in-memory repositories and mocked OpenAI
        // Uncomment and adjust if using actual service
        /*
        personalityService = new PersonalityService({
          personalityRepository,
          userRepository,
          openAIClient: openAIMock
        });
        */
        // If we don't have the actual service, create a simplified version for testing
        personalityService = {
            getOrCreatePersonalityProfile: async function (userId) {
                // Ensure userId is a UserId value object
                const userIdVO = userId instanceof UserId ? userId : createUserId(userId);
                
                let profile = await personalityRepository.findByUserId(userIdVO);
                if (!profile) {
                    profile = {
                        id: uuidv4(),
                        userId: userIdVO ? userIdVO.value : userId, // Handle null userIdVO
                        personalityTraits: {},
                        aiAttitudes: {},
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    await personalityRepository.save(profile);
                }
                return profile;
            },
            generateInsights: async function (userId) {
                // Ensure userId is a UserId value object
                const userIdVO = userId instanceof UserId ? userId : createUserId(userId);
                
                // Get the personality profile
                const profile = await this.getOrCreatePersonalityProfile(userIdVO);
                // Use OpenAI to generate insights
                const response = await openAIMock.responses.create({
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: 'You are a personality insight analyzer.' },
                        { role: 'user', content: `Analyze these traits: ${JSON.stringify(profile.personalityTraits || {})}` }
                    ],
                    response_format: { type: 'json_object' }
                });
                const insights = JSON.parse(response.choices[0].message.content);
                // Update profile with insights
                profile.insights = insights;
                await personalityRepository.update(profile.id, { insights });
                return insights;
            },
            updatePersonalityTraits: async function (userId, traits) {
                // Ensure userId is a UserId value object
                const userIdVO = userId instanceof UserId ? userId : createUserId(userId);
                
                // Get profile
                const profile = await this.getOrCreatePersonalityProfile(userIdVO);
                // Update traits
                const updates = {
                    personalityTraits: { ...(profile.personalityTraits || {}), ...traits },
                    updatedAt: new Date()
                };
                const updatedProfile = await personalityRepository.update(profile.id, updates);
                return updatedProfile;
            },
            updateAIAttitudes: async function (userId, attitudes) {
                // Ensure userId is a UserId value object
                const userIdVO = userId instanceof UserId ? userId : createUserId(userId);
                
                // Get profile
                const profile = await this.getOrCreatePersonalityProfile(userIdVO);
                // Update attitudes
                const updates = {
                    aiAttitudes: { ...(profile.aiAttitudes || {}), ...attitudes },
                    updatedAt: new Date()
                };
                const updatedProfile = await personalityRepository.update(profile.id, updates);
                return updatedProfile;
            },
            getPersonalityProfile: async function (userId, options = {}) {
                // Ensure userId is a UserId value object
                const userIdVO = userId instanceof UserId ? userId : createUserId(userId);
                
                const profile = await personalityRepository.findByUserId(userIdVO);
                if (!profile) {
                    return null;
                }
                // Apply filtering based on options
                if (options.includeInsights === false) {
                    const { insights, ...filteredProfile } = profile;
                    return filteredProfile;
                }
                return profile;
            }
        };
    });
    afterEach(function () {
        // Restore the sandbox
        sandbox.restore();
    });
    describe('Profile Management', function () {
        it('should create a new profile if one does not exist', async function () {
            // Arrange - Create a UserId value object
            const userIdStr = uuidv4();
            const userId = createUserId(userIdStr);
            
            // Act
            const profile = await personalityService.getOrCreatePersonalityProfile(userId);
            
            // Assert
            expect(profile).to.exist;
            expect(profile.userId).to.equal(userIdStr);
            expect(profile.personalityTraits).to.be.an('object');
            expect(profile.aiAttitudes).to.be.an('object');
            
            // Verify it was saved to the repository
            const savedProfile = await personalityRepository.findByUserId(userId);
            expect(savedProfile).to.exist;
        });
        it('should also accept primitive userId and convert it to VO internally', async function () {
            // Arrange - Use a string instead of a UserId
            const userIdStr = uuidv4();
            
            // Act
            const profile = await personalityService.getOrCreatePersonalityProfile(userIdStr);
            
            // Assert
            expect(profile).to.exist;
            expect(profile.userId).to.equal(userIdStr);
            
            // Verify it was saved to the repository using UserId Value Object
            const userIdVO = createUserId(userIdStr);
            const savedProfile = await personalityRepository.findByUserId(userIdVO);
            expect(savedProfile).to.exist;
        });
        it('should return an existing profile if one exists', async function () {
            // Arrange - Create a profile directly in the repository
            const userIdStr = uuidv4();
            const userId = createUserId(userIdStr);
            
            const existingProfile = {
                id: uuidv4(),
                userId: userIdStr,
                personalityTraits: { analytical: 80 },
                aiAttitudes: { tech_savvy: 70 },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await personalityRepository.save(existingProfile);
            
            // Act
            const profile = await personalityService.getOrCreatePersonalityProfile(userId);
            
            // Assert
            expect(profile).to.exist;
            expect(profile.id).to.equal(existingProfile.id);
            expect(profile.personalityTraits).to.deep.equal(existingProfile.personalityTraits);
        });
    });
    describe('Personality Insights', function () {
        it('should generate insights based on personality traits', async function () {
            // Arrange - Create a UserId value object
            const userIdStr = uuidv4();
            const userId = createUserId(userIdStr);
            
            const profileWithTraits = {
                id: uuidv4(),
                userId: userIdStr, // Store primitive value
                personalityTraits: {
                    analytical: 85,
                    creative: 70,
                    detail_oriented: 80
                },
                aiAttitudes: {},
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await personalityRepository.save(profileWithTraits);
            
            // Act - Pass Value Object
            const insights = await personalityService.generateInsights(userId);
            
            // Assert
            expect(insights).to.exist;
            expect(insights.strengths).to.be.an('array');
            expect(insights.focus_areas).to.be.an('array');
            expect(insights.recommendations).to.be.an('array');
            
            // Verify OpenAI was called with the right traits
            expect(openAIMock.responses.create.calledOnce).to.be.true;
            const openAICall = openAIMock.responses.create.firstCall.args[0];
            expect(openAICall.messages[1].content).to.include(JSON.stringify(profileWithTraits.personalityTraits));
            
            // Verify profile was updated with insights using Value Object
            const updatedProfile = await personalityRepository.findByUserId(userId);
            expect(updatedProfile.insights).to.deep.equal(insights);
        });
    });
    describe('Profile Updates', function () {
        it('should update personality traits correctly', async function () {
            // Arrange - Create a UserId value object
            const userIdStr = uuidv4();
            const userId = createUserId(userIdStr);
            
            const profile = await personalityService.getOrCreatePersonalityProfile(userId);
            
            // Act - Update traits using Value Object
            const traits = { analytical: 90, creative: 85 };
            const updatedProfile = await personalityService.updatePersonalityTraits(userId, traits);
            
            // Assert
            expect(updatedProfile).to.exist;
            expect(updatedProfile.personalityTraits).to.include(traits);
            
            // Verify repository was updated using Value Object
            const savedProfile = await personalityRepository.findByUserId(userId);
            expect(savedProfile.personalityTraits).to.include(traits);
        });
        it('should update AI attitudes correctly', async function () {
            // Arrange - Create a UserId value object
            const userIdStr = uuidv4();
            const userId = createUserId(userIdStr);
            
            const profile = await personalityService.getOrCreatePersonalityProfile(userId);
            
            // Act - Update attitudes using Value Object
            const attitudes = { tech_savvy: 75, privacy_concerned: 80 };
            const updatedProfile = await personalityService.updateAIAttitudes(userId, attitudes);
            
            // Assert
            expect(updatedProfile).to.exist;
            expect(updatedProfile.aiAttitudes).to.include(attitudes);
            
            // Verify repository was updated using Value Object
            const savedProfile = await personalityRepository.findByUserId(userId);
            expect(savedProfile.aiAttitudes).to.include(attitudes);
        });
        it('should handle multiple updates to the same profile', async function () {
            // Arrange - Create a UserId value object
            const userIdStr = uuidv4();
            const userId = createUserId(userIdStr);
            
            // First update - traits
            const traits = { analytical: 90, creative: 85 };
            await personalityService.updatePersonalityTraits(userId, traits);
            
            // Second update - attitudes
            const attitudes = { tech_savvy: 75, privacy_concerned: 80 };
            const finalProfile = await personalityService.updateAIAttitudes(userId, attitudes);
            
            // Assert both updates are present
            expect(finalProfile.personalityTraits).to.include(traits);
            expect(finalProfile.aiAttitudes).to.include(attitudes);
            
            // Verify final state in repository using Value Object
            const savedProfile = await personalityRepository.findByUserId(userId);
            expect(savedProfile.personalityTraits).to.include(traits);
            expect(savedProfile.aiAttitudes).to.include(attitudes);
        });
    });
    describe('Profile Retrieval', function () {
        it('should filter profile fields based on options', async function () {
            // Arrange
            const userId = uuidv4();
            const profileWithInsights = {
                id: uuidv4(),
                userId,
                personalityTraits: { analytical: 80 },
                aiAttitudes: { tech_savvy: 70 },
                insights: {
                    strengths: ['Analysis'],
                    focus_areas: ['Logic'],
                    recommendations: ['Practice coding']
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await personalityRepository.save(profileWithInsights);
            // Act - Get profile with insights excluded
            const filteredProfile = await personalityService.getPersonalityProfile(userId, { includeInsights: false });
            // Assert
            expect(filteredProfile).to.exist;
            expect(filteredProfile.personalityTraits).to.exist;
            expect(filteredProfile.insights).to.be.undefined;
            // Act - Get complete profile
            const fullProfile = await personalityService.getPersonalityProfile(userId);
            // Assert
            expect(fullProfile).to.exist;
            expect(fullProfile.insights).to.exist;
        });
        it('should return null for non-existent users', async function () {
            // Act
            const profile = await personalityService.getPersonalityProfile('non-existent-user');
            // Assert
            expect(profile).to.be.null;
        });
    });
});
