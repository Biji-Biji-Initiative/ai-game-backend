/**
 * User entity tests
 */
import { User } from '@src/domain/entities/User.js';
import { Email } from '@src/domain/valueObjects/Email.js';

describe('User Entity', () => {
  it('should create a valid user', () => {
    // Arrange
    const id = 'test-id';
    const email = new Email('test@example.com');
    const name = 'Test User';
    const createdAt = new Date();
    const roles = ['user', 'admin'];

    // Act
    const user = new User(id, email, name, createdAt, roles);

    // Assert
    expect(user.id).toBe(id);
    expect(user.email).toBe(email);
    expect(user.name).toBe(name);
    expect(user.createdAt).toBe(createdAt);
    expect(user.roles).toEqual(roles);
  });

  it('should validate required fields', () => {
    // Arrange
    const email = new Email('test@example.com');

    // Act & Assert
    expect(() => new User(null, email, 'Test')).toThrow('User must have an ID');
    expect(() => new User('id', null, 'Test')).toThrow('User must have an email');
    expect(() => new User('id', email, '')).toThrow('User must have a name');
  });

  it('should check if user has a specific role', () => {
    // Arrange
    const user = new User(
      'id',
      new Email('test@example.com'),
      'Test User',
      new Date(),
      ['user', 'editor']
    );

    // Act & Assert
    expect(user.hasRole('user')).toBe(true);
    expect(user.hasRole('editor')).toBe(true);
    expect(user.hasRole('admin')).toBe(false);
  });

  it('should check if user is an admin', () => {
    // Arrange
    const adminUser = new User(
      'id',
      new Email('admin@example.com'),
      'Admin User',
      new Date(),
      ['user', 'admin']
    );

    const regularUser = new User(
      'id2',
      new Email('user@example.com'),
      'Regular User',
      new Date(),
      ['user']
    );

    // Act & Assert
    expect(adminUser.isAdmin()).toBe(true);
    expect(regularUser.isAdmin()).toBe(false);
  });

  it('should add a role to the user', () => {
    // Arrange
    const user = new User(
      'id',
      new Email('test@example.com'),
      'Test User',
      new Date(),
      ['user']
    );

    // Act
    user.addRole('editor');

    // Assert
    expect(user.roles).toContain('editor');
    expect(user.roles.length).toBe(2);

    // Act - add same role again
    user.addRole('editor');

    // Assert - no duplicate
    expect(user.roles.length).toBe(2);
  });

  it('should remove a role from the user', () => {
    // Arrange
    const user = new User(
      'id',
      new Email('test@example.com'),
      'Test User',
      new Date(),
      ['user', 'editor', 'viewer']
    );

    // Act
    user.removeRole('editor');

    // Assert
    expect(user.roles).not.toContain('editor');
    expect(user.roles.length).toBe(2);

    // Act - remove non-existent role
    user.removeRole('admin');

    // Assert - no change
    expect(user.roles.length).toBe(2);
  });
});
