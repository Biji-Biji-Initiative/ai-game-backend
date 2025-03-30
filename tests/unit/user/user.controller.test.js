import { jest } from '@jest/globals';
/**
 * User Controller Tests
 */
import { expect } from "chai";
import sinon from "sinon";
import UserController from '../../../src/core/user/controllers/UserController.js';
import userErrors from '../../../src/core/user/errors/UserErrors.js';
import { DomainErrorCodes } from '../../../src/core/infra/errors/DomainErrorCodes.js';

const { UserNotFoundError, FocusAreaError } = userErrors;
const UserErrorCodes = DomainErrorCodes.User;

describe('User Controller', () => {
    let userController;
    let userRepositoryMock;
    let focusAreaCoordinatorMock;
    let containerStub;
    let reqMock;
    let resMock;
    let nextMock;
    
    beforeEach(() => {
        // Create mock repository and dependencies
        userRepositoryMock = {
            findByEmail: sinon.stub(),
            findById: sinon.stub(),
            update: sinon.stub(),
            findAll: sinon.stub()
        };
        focusAreaCoordinatorMock = {
            setUserFocusArea: sinon.stub()
        };
        // Mock the container
        containerStub = {
            get: sinon.stub()
        };
        containerStub.get.withArgs('userRepository').returns(userRepositoryMock);
        containerStub.get.withArgs('focusAreaCoordinator').returns(focusAreaCoordinatorMock);
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
        userController = new UserController();
        userController.userRepository = userRepositoryMock;
        userController.focusAreaCoordinator = focusAreaCoordinatorMock;
    });
    
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
    });
    
    describe('getCurrentUser', () => {
        it('should return current user when found', async () => {
            // Arrange
            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                name: 'Test User'
            };
            userRepositoryMock.findByEmail.resolves(mockUser);
            resMock.success.returns({ status: 'success', data: { user: mockUser } });
            // Act
            await userController.getCurrentUser(reqMock, resMock, nextMock);
            // Assert
            expect(userRepositoryMock.findByEmail.calledOnceWith('test@example.com')).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ user: mockUser });
            expect(nextMock.called).to.be.false;
        });
        
        it('should call next with error when user not found', async () => {
            // Arrange
            userRepositoryMock.findByEmail.resolves(null);
            // Act
            await userController.getCurrentUser(reqMock, resMock, nextMock);
            // Assert
            expect(userRepositoryMock.findByEmail.calledOnceWith('test@example.com')).to.be.true;
            expect(resMock.success.called).to.be.false;
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(UserNotFoundError);
        });
    });
    
    describe('updateCurrentUser', () => {
        it('should update and return user', async () => {
            // Arrange
            const updateData = { name: 'Updated Name' };
            reqMock.body = updateData;
            const mockUpdatedUser = {
                id: 'user123',
                email: 'test@example.com',
                name: 'Updated Name'
            };
            userRepositoryMock.update.resolves(mockUpdatedUser);
            resMock.success.returns({ status: 'success', data: { user: mockUpdatedUser } });
            // Act
            await userController.updateCurrentUser(reqMock, resMock, nextMock);
            // Assert
            expect(userRepositoryMock.update.calledOnce).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ user: mockUpdatedUser });
            expect(nextMock.called).to.be.false;
        });
        
        it('should remove sensitive fields from update data', async () => {
            // Arrange
            const updateData = {
                name: 'Updated Name',
                email: 'hacked@example.com',
                role: 'admin',
                isAdmin: true
            };
            reqMock.body = updateData;
            const mockUpdatedUser = {
                id: 'user123',
                email: 'test@example.com',
                name: 'Updated Name'
            };
            userRepositoryMock.update.resolves(mockUpdatedUser);
            // Act
            await userController.updateCurrentUser(reqMock, resMock, nextMock);
            // Assert
            const expectedUpdateData = { name: 'Updated Name' };
            expect(userRepositoryMock.update.calledWith('test@example.com', expectedUpdateData)).to.be.true;
        });
    });
    
    describe('setFocusArea', () => {
        it('should set focus area and return updated user', async () => {
            // Arrange
            reqMock.body = { focusArea: 'productivity' };
            const mockUser = {
                id: 'user123',
                email: 'test@example.com'
            };
            const mockUpdatedUser = {
                id: 'user123',
                email: 'test@example.com',
                focusArea: 'productivity'
            };
            userRepositoryMock.findByEmail.onFirstCall().resolves(mockUser);
            userRepositoryMock.findByEmail.onSecondCall().resolves(mockUpdatedUser);
            focusAreaCoordinatorMock.setUserFocusArea.resolves();
            // Act
            await userController.setFocusArea(reqMock, resMock, nextMock);
            // Assert
            expect(userRepositoryMock.findByEmail.calledTwice).to.be.true;
            expect(focusAreaCoordinatorMock.setUserFocusArea.calledOnceWith('test@example.com', 'productivity')).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ user: mockUpdatedUser });
        });
        
        it('should throw error when focus area is not provided', async () => {
            // Arrange
            reqMock.body = {};
            // Act
            await userController.setFocusArea(reqMock, resMock, nextMock);
            // Assert
            expect(nextMock.calledOnce).to.be.true;
            expect(nextMock.firstCall.args[0]).to.be.instanceOf(FocusAreaError);
            expect(userRepositoryMock.findByEmail.called).to.be.false;
            expect(focusAreaCoordinatorMock.setUserFocusArea.called).to.be.false;
        });
    });
    
    describe('listUsers', () => {
        it('should return list of users', async () => {
            // Arrange
            const mockUsers = [
                { id: 'user1', email: 'user1@example.com' },
                { id: 'user2', email: 'user2@example.com' }
            ];
            userRepositoryMock.findAll.resolves(mockUsers);
            // Act
            await userController.listUsers(reqMock, resMock, nextMock);
            // Assert
            expect(userRepositoryMock.findAll.calledOnce).to.be.true;
            expect(resMock.success.calledOnce).to.be.true;
            expect(resMock.success.firstCall.args[0]).to.deep.equal({ users: mockUsers });
        });
    });
});
