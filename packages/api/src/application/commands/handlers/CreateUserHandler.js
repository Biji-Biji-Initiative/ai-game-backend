/**
 * Handler for CreateUserCommand
 */
import { v4 as uuidv4 } from 'uuid';
'../../../domain/valueObjects/Email.js78;
''../../../domain/aggregates/UserAggregate.js141;
import { CreateUserCommand } from ''../CreateUserCommand.js';

export class CreateUserHandler {
  /**
   * @type {'../../../domain/ports/repositories/UserRepository.js268.UserRepository}
   * @private
   */
  _userRepository;

  /**
   * @type {''../../../domain/ports/repositories/EventRepository.js405.EventRepository}
   * @private
   */
  _eventRepository;

  /**
   * Creates a new CreateUserHandler
   *
   * @param {import ''../../../domain/ports/repositories/UserRepository.js'.UserRepository} userRepository - User repository
   * @param {import '../../../domain/ports/repositories/EventRepository.js'.EventRepository} eventRepository - Event repository
   */
  constructor(userRepository, eventRepository) {
    this._userRepository = userRepository;
    this._eventRepository = eventRepository;
  }

  /**
   * Handle the command
   *
   * @param {CreateUserCommand} command - Command to handle
   * @returns {Promise<string>} New user ID
   */
  async handle(command) {
    // Create email value object
    const email = new Email(command.email);

    // Check if user already exists
    const existingUser = await this._userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error(`User with email ${email.value} already exists`);
    }

    // Generate a new ID
    const id = uuidv4();

    // Create user aggregate
    const userAggregate = UserAggregate.create(
      id,
      email,
      command.name,
      command.roles
    );

    // Save user
    await this._userRepository.save(userAggregate.user);

    // Save events
    const events = userAggregate.events;
    await this._eventRepository.saveMany(events);

    // Clear events (to prevent duplicate publishing)
    userAggregate.clearEvents();

    return id;
  }
}
