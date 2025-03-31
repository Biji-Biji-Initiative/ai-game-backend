/**
 * Query to get user details
 */
export class GetUserQuery {
  /**
   * @type {string}
   */
  userId;

  /**
   * Creates a new GetUserQuery
   *
   * @param {string} userId - User ID
   */
  constructor(userId) {
    this.userId = userId;
  }
}
