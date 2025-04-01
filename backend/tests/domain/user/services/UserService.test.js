import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import UserService from "../../../../src/core/user/services/UserService.js";
import User from "../../../../src/core/user/models/User.js";
import InMemoryUserRepository from "@/test/repositories/InMemoryUserRepository";
import domainEvents from "../../../../src/core/common/events/domainEvents.js";
import { createUserId, UserId } from "../../../../src/core/common/valueObjects/index.js";
import UserId from "../../../src/core/common/valueObjects/UserId.js";
const { EventTypes } = domainEvents;
// Create a proper mock for the event bus
const eventBusMock = {
    publishEvent: sinon.stub().resolves()
};
// Mock the eventBus in the User module
const userModule = User;
userModule.__eventBus = eventBusMock;

// Helper for creating UserId value objects
const createUserId = (id) => new UserId(id);

describe('User Service', () => {
    let userService;
    let userRepository;
    beforeEach(() => {
        // Create a clean repository for each test
        userRepository = new InMemoryUserRepository();
        // Reset the event bus mock
        eventBusMock.publishEvent.resetHistory();
        // Create the service with the repository
        userService = new UserService(userRepository);
        // Monkey patch the event bus in User.js to use our mock
        mockDomainEvents.eventBus = sinon.stub().get(() => eventBusMock);;
    });
    afterEach(() => {
        // Restore all stubs
        sinon.restore();
    });
    describe('User Creation', () => {
        it('should create a new user with valid data', async () => {
            const userData = {
                email: 'test@example.com',
                fullName: 'Test User',
                professionalTitle: 'Developer'
            };
            const user = await userService.createUser(userData);
            expect(user).to.be.an.instanceOf(User);
            
            // Check if ID is a UserId Value Object or convert it
            const userId = user.id instanceof UserId ? user.id : createUserId(user.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.be.a('string');
            
            expect(user.email).to.equal(userData.email);
            expect(user.fullName).to.equal(userData.fullName);
            // Check that it's saved in the repository
            const savedUser = await userRepository.findByEmail(userData.email);
            expect(savedUser).to.not.be.null;
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_CREATED);
        });
        it('should throw error if user with same email already exists', async () => {
            // Create a user first
            await userService.createUser({
                email: 'existing@example.com',
                fullName: 'Existing User'
            });
            // Try to create another user with the same email
            try {
                await userService.createUser({
                    email: 'existing@example.com',
                    fullName: 'Duplicate User'
                });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('already exists');
            }
        });
    });
    describe('User Retrieval', () => {
        let testUser;
        let testUserId;
        beforeEach(async () => {
            // Create a test user for retrieval tests
            testUser = await userService.createUser({
                email: 'retrieve@example.com',
                fullName: 'Retrieve User'
            });
            
            // Store the user ID as a Value Object
            testUserId = testUser.id instanceof UserId ? testUser.id : createUserId(testUser.id);
            
            // Reset the spy after creating the test user
            eventBusMock.publishEvent.resetHistory();
        });
        it('should get user by ID', async () => {
            // Pass the UserId Value Object to the service
            const user = await userService.getUserById(testUserId);
            expect(user).to.be.an.instanceOf(User);
            
            // Compare the IDs
            if (user.id instanceof UserId) {
                expect(user.id.value).to.equal(testUserId.value);
            } else {
                expect(user.id).to.equal(testUserId.value);
            }
        });
        it('should get user by email', async () => {
            const user = await userService.getUserByEmail(testUser.email);
            expect(user).to.be.an.instanceOf(User);
            expect(user.email).to.equal(testUser.email);
        });
        it('should return null for non-existent user ID', async () => {
            // Create a random UserId Value Object
            const randomUserId = createUserId(uuidv4());
            
            const user = await userService.getUserById(randomUserId);
            expect(user).to.be.null;
        });
    });
    describe('User Updates', () => {
        let testUser;
        let testUserId;
        beforeEach(async () => {
            // Create a test user for update tests
            testUser = await userService.createUser({
                email: 'update@example.com',
                fullName: 'Update User'
            });
            
            // Store the user ID as a Value Object
            testUserId = testUser.id instanceof UserId ? testUser.id : createUserId(testUser.id);
            
            // Reset the spy after creating the test user
            eventBusMock.publishEvent.resetHistory();
        });
        it('should update user profile', async () => {
            const updates = {
                fullName: 'Updated Name',
                professionalTitle: 'Updated Title'
            };
            
            // Pass the UserId Value Object
            const updatedUser = await userService.updateUser(testUserId, updates);
            expect(updatedUser.fullName).to.equal(updates.fullName);
            expect(updatedUser.professionalTitle).to.equal(updates.professionalTitle);
            // Check that the repository has the updated user
            const savedUser = await userRepository.findById(testUserId);
            expect(savedUser.fullName).to.equal(updates.fullName);
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_UPDATED);
        });
        it('should throw error for non-existent user ID', async () => {
            // Create a random UserId Value Object
            const randomUserId = createUserId(uuidv4());
            
            try {
                await userService.updateUser(randomUserId, { fullName: 'Test' });
                expect.fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.message).to.include('not found');
            }
        });
        it('should update user activity', async () => {
            const before = new Date(testUser.lastActive || 0);
            
            // Wait a bit to ensure timestamp is different
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Pass the UserId Value Object
            const updatedUser = await userService.updateUserActivity(testUserId);
            expect(new Date(updatedUser.lastActive) > before).to.be.true;
        });
    });
    describe('User Status Management', () => {
        let testUser;
        let testUserId;
        beforeEach(async () => {
            // Create a test user for status tests
            testUser = await userService.createUser({
                email: 'status@example.com',
                fullName: 'Status User'
            });
            
            // Store the user ID as a Value Object
            testUserId = testUser.id instanceof UserId ? testUser.id : createUserId(testUser.id);
            
            // Reset the spy after creating the test user
            eventBusMock.publishEvent.resetHistory();
        });
        it('should deactivate user', async () => {
            // Pass the UserId Value Object
            const updatedUser = await userService.deactivateUser(testUserId);
            expect(updatedUser.status).to.equal('inactive');
            expect(updatedUser.isActive()).to.be.false;
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_DEACTIVATED);
        });
        it('should activate user', async () => {
            // First deactivate
            await userService.deactivateUser(testUserId);
            eventBusMock.publishEvent.resetHistory();
            
            // Then activate - Pass the UserId Value Object
            const updatedUser = await userService.activateUser(testUserId);
            expect(updatedUser.status).to.equal('active');
            expect(updatedUser.isActive()).to.be.true;
            
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_ACTIVATED);
        });
    });
    describe('Role Management', () => {
        let testUser;
        beforeEach(async () => {
            // Create a test user for role tests
            testUser = await userService.createUser({
                email: 'roles@example.com',
                fullName: 'Role User'
            });
            // Reset the spy after creating the test user
            eventBusMock.publishEvent.resetHistory();
        });
        it('should add role to user', async () => {
            const updatedUser = await userService.addUserRole(testUser.id, 'admin');
            expect(updatedUser.roles).to.include('admin');
            expect(updatedUser.hasRole('admin')).to.be.true;
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_ROLE_ASSIGNED);
        });
        it('should remove role from user', async () => {
            // First add the role
            await userService.addUserRole(testUser.id, 'editor');
            eventBusMock.publishEvent.resetHistory();
            // Then remove it
            const updatedUser = await userService.removeUserRole(testUser.id, 'editor');
            expect(updatedUser.roles).to.not.include('editor');
            expect(updatedUser.hasRole('editor')).to.be.false;
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_ROLE_REMOVED);
        });
        it('should find users by role', async () => {
            // Create a few users with different roles
            await userService.createUser({
                email: 'admin1@example.com',
                fullName: 'Admin One'
            });
            await userService.addUserRole('admin1@example.com', 'admin');
            await userService.createUser({
                email: 'admin2@example.com',
                fullName: 'Admin Two'
            });
            await userService.addUserRole('admin2@example.com', 'admin');
            await userService.createUser({
                email: 'regular@example.com',
                fullName: 'Regular User'
            });
            // Find admin users
            const adminUsers = await userService.findUsersByRole('admin');
            expect(adminUsers.length).to.equal(2);
            expect(adminUsers.every(user => user.hasRole('admin'))).to.be.true;
        });
    });
    describe('Onboarding Management', () => {
        let testUser;
        beforeEach(async () => {
            // Create a test user for onboarding tests
            testUser = await userService.createUser({
                email: 'onboarding@example.com',
                fullName: 'Onboarding User'
            });
            // Reset the spy after creating the test user
            eventBusMock.publishEvent.resetHistory();
        });
        it('should complete user onboarding', async () => {
            const updatedUser = await userService.completeUserOnboarding(testUser.id);
            expect(updatedUser.onboardingCompleted).to.be.true;
            expect(updatedUser.hasCompletedOnboarding()).to.be.true;
            // Verify event was published
            expect(eventBusMock.publishEvent.calledOnce).to.be.true;
            expect(eventBusMock.publishEvent.firstCall.args[0]).to.equal(EventTypes.USER_ONBOARDING_COMPLETED);
        });
    });
    describe('Preference Management', () => {
        let testUser;
        beforeEach(async () => {
            // Create a test user for preference tests
            testUser = await userService.createUser({
                email: 'prefs@example.com',
                fullName: 'Preference User'
            });
            // Reset the spy after creating the test user
            eventBusMock.publishEvent.resetHistory();
        });
        it('should update user preference', async () => {
            const updatedUser = await userService.updateUserPreference(testUser.id, 'theme', 'dark');
            expect(updatedUser.getPreference('theme')).to.equal('dark');
            // Check that the repository has the updated preference
            const savedUser = await userRepository.findById(testUser.id);
            expect(savedUser.getPreference('theme')).to.equal('dark');
        });
    });
});
