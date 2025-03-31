/**
 * Command to create a new user
 */
export class CreateUserCommand {
  /**
   * @type {string}
   */
  email;

  /**
   * @type {string}
   */
  name;

  /**
   * @type {string[]}
   */
  roles;

  /**
   * Creates a new CreateUserCommand
   *
   * @param {Object} data - Command data
   * @param {string} data.email - User email
   * @param {string} data.name - User name
   * @param {string[]} [data.roles] - User roles
   */
  constructor({ email, name, roles = ['user'] }) {
    this.email = email;
    this.name = name;
    this.roles = roles;
  }
}
