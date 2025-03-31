/**
 * Handler for GetUserQuery
 */
import { GetUserQuery } from '../GetUserQuery.js';

export class GetUserHandler {
  /**
   * @type {'../../../domain/ports/repositories/UserRepository.js136.UserRepository}
   * @private
   */
  _userRepository;

  /**
   * Creates a new GetUserHandler
   *
   * @param {import ''../../../domain/ports/repositories/UserRepository.js'.UserRepository} userRepository - User repository
   */
  constructor(userRepository) {
    this._userRepository = userRepository;
  }

  /**
   * Handle the query
   *
   * @param {GetUserQuery} query - Query to handle
   * @returns {Promise<import '../../../domain/entities/User.js'.User|null>} User entity or null
   */
  async handle(query) {
    return await this._userRepository.findById(query.userId);
  }
}
