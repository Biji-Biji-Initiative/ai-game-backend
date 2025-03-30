import { v4 as uuidv4 } from "uuid";
import User from "./User.js";
import { UserValidationError } from "../../user/errors/UserErrors.js";
import { Email, createEmail } from "../../common/valueObjects/index.js";

/**
 * Factory class for creating User entities
 * 
 * This factory encapsulates the complex logic of User creation, following DDD principles
 * by moving entity creation logic out of entities and services into a dedicated factory.
 */
class UserFactory {
    /**
     * Create a new User with basic information
     * 
     * @param {Object} userData - Basic user data
     * @param {string|Email} userData.email - User's email
     * @param {string} [userData.fullName] - User's full name
     * @param {string} [userData.professionalTitle] - User's professional title
     * @param {Array<string>} [userData.roles=['user']] - User's roles
     * @returns {User} A new User instance
     * @throws {UserValidationError} If the user data is invalid
     */
    static createUser(userData) {
        // Validate and convert email to Value Object if needed
        let emailValue;
        if (userData.email instanceof Email) {
            emailValue = userData.email.value;
        } else if (typeof userData.email === 'string') {
            const emailVO = createEmail(userData.email);
            if (!emailVO) {
                throw new UserValidationError(`Invalid email format: ${userData.email}`);
            }
            emailValue = emailVO.value;
        } else {
            throw new UserValidationError('Email is required to create a user');
        }

        // Create user with default values
        const userDataWithDefaults = {
            ...userData,
            id: userData.id || uuidv4(),
            email: emailValue,
            roles: userData.roles || ['user'],
            status: userData.status || 'active',
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: userData.updatedAt || new Date().toISOString(),
            lastActive: userData.lastActive || new Date().toISOString(),
            preferences: userData.preferences || {}
        };

        return new User(userDataWithDefaults);
    }

    /**
     * Create a User from database data
     * 
     * @param {Object} data - Database data
     * @returns {User} User instance created from database
     * @throws {UserValidationError} If data is invalid
     */
    static createFromDatabase(data) {
        if (!data) {
            throw new UserValidationError('Database data is required to create User instance');
        }
        return new User(data);
    }

    /**
     * Create an admin user
     * 
     * @param {Object} userData - User data
     * @returns {User} Admin user instance
     * @throws {UserValidationError} If user data is invalid
     */
    static createAdminUser(userData) {
        const user = this.createUser(userData);
        // Ensure user has admin role
        if (!user.hasRole('admin')) {
            user.addRole('admin');
        }
        return user;
    }
}

export default UserFactory; 