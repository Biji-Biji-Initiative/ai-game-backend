# Domain Testing Guide

## Overview

This guide focuses on testing the domain layer of our AI Gaming Backend project, which is the core business logic layer in our Domain-Driven Design architecture. Domain testing involves validating entities, value objects, aggregates, domain services, and domain events.

## Table of Contents
- [Introduction to Domain Testing](#introduction-to-domain-testing)
- [Testing Domain Entities](#testing-domain-entities)
- [Testing Value Objects](#testing-value-objects)
- [Testing Aggregates](#testing-aggregates)
- [Testing Domain Services](#testing-domain-services)
- [Testing Domain Events](#testing-domain-events)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)

## Introduction to Domain Testing

Domain testing focuses on validating the business rules and logic that represent the core of your application. These tests should ensure that:

- Domain entities maintain their invariants and business rules
- Value objects are immutable and properly encapsulate their data
- Aggregates correctly manage their internal entities and enforce consistency rules
- Domain services properly coordinate between multiple aggregates
- Domain events trigger appropriate workflows

## Testing Domain Entities

Domain entities are objects that have a distinct identity and are mutable. When testing entities:

```javascript
// Example: Testing a Player entity
describe('Player Entity', () => {
  it('should correctly increment player experience', () => {
    // Arrange
    const player = new Player({
      id: 'player-123',
      name: 'TestPlayer',
      level: 1,
      experience: 0
    });
    
    // Act
    player.addExperience(100);
    
    // Assert
    expect(player.experience).toBe(100);
  });
  
  it('should level up when experience threshold is reached', () => {
    // Arrange
    const player = new Player({
      id: 'player-123',
      name: 'TestPlayer',
      level: 1,
      experience: 950
    });
    
    // Act
    player.addExperience(50);
    
    // Assert
    expect(player.level).toBe(2);
    expect(player.experience).toBe(0); // Reset after level up
  });
});
```

## Testing Value Objects

Value objects are immutable objects that describe aspects of the domain. When testing value objects:

```javascript
// Example: Testing a GameSessionId value object
describe('GameSessionId Value Object', () => {
  it('should create valid session ID', () => {
    const sessionId = new GameSessionId('game-session-123');
    expect(sessionId.value).toBe('game-session-123');
  });
  
  it('should throw error for invalid session ID format', () => {
    expect(() => new GameSessionId('invalid_format')).toThrow(
      'Game session ID must start with "game-session-"'
    );
  });
  
  it('should be immutable', () => {
    const sessionId = new GameSessionId('game-session-123');
    expect(() => { sessionId.value = 'game-session-456'; }).toThrow();
  });
});
```

## Testing Aggregates

Aggregates are clusters of domain objects treated as a single unit. When testing aggregates:

```javascript
// Example: Testing a Game aggregate
describe('Game Aggregate', () => {
  it('should add player to game', () => {
    // Arrange
    const game = new Game({
      id: 'game-123',
      name: 'Test Game',
      maxPlayers: 4
    });
    const playerId = 'player-123';
    
    // Act
    game.addPlayer(playerId);
    
    // Assert
    expect(game.players).toContain(playerId);
  });
  
  it('should throw error when adding player to full game', () => {
    // Arrange
    const game = new Game({
      id: 'game-123',
      name: 'Test Game',
      maxPlayers: 1
    });
    game.addPlayer('player-1');
    
    // Act & Assert
    expect(() => game.addPlayer('player-2')).toThrow('Game is full');
  });
  
  it('should properly track game state transitions', () => {
    // Arrange
    const game = new Game({
      id: 'game-123',
      name: 'Test Game',
      status: 'WAITING'
    });
    
    // Act
    game.start();
    
    // Assert
    expect(game.status).toBe('IN_PROGRESS');
    
    // Act again
    game.end();
    
    // Assert again
    expect(game.status).toBe('COMPLETED');
  });
});
```

## Testing Domain Services

Domain services encapsulate business logic that doesn't naturally fit into entities or value objects:

```javascript
// Example: Testing a MatchmakingService
describe('MatchmakingService', () => {
  it('should match players of similar skill level', () => {
    // Arrange
    const matchmakingService = new MatchmakingService();
    const player1 = { id: 'player-1', skillLevel: 1500 };
    const player2 = { id: 'player-2', skillLevel: 1550 };
    const player3 = { id: 'player-3', skillLevel: 2000 };
    
    // Act
    const matches = matchmakingService.findMatches([player1, player2, player3]);
    
    // Assert
    expect(matches[0]).toContain(player1.id);
    expect(matches[0]).toContain(player2.id);
    expect(matches[0]).not.toContain(player3.id);
  });
});
```

## Testing Domain Events

Domain events represent something significant that happened in the domain:

```javascript
// Example: Testing domain events with a player registration
describe('PlayerRegisteredEvent', () => {
  it('should be published when a player is created', () => {
    // Arrange
    const eventBus = new DomainEventBus();
    const spy = jest.spyOn(eventBus, 'publish');
    const playerRepository = new PlayerRepository(eventBus);
    
    // Act
    const player = playerRepository.create({ 
      name: 'New Player', 
      email: 'player@example.com' 
    });
    
    // Assert
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'PlayerRegisteredEvent',
        payload: expect.objectContaining({
          playerId: player.id
        })
      })
    );
  });
});
```

## Best Practices

1. **Focus on behavior, not implementation**: Test what the domain objects do, not how they do it.
2. **Use real domain objects**: Avoid mocking domain objects when possible, as they contain business rules.
3. **Test invariants**: Ensure that domain objects maintain their consistency rules.
4. **Isolate from infrastructure**: Domain tests should not depend on databases, APIs, etc.
5. **Use descriptive test names**: Name tests to describe the business rule being verified.
6. **Test edge cases**: Ensure domain rules work with boundary conditions.

## Common Pitfalls

1. **Over-mocking**: Mocking too many domain components can lead to tests that don't verify real behavior.
2. **Testing implementation details**: Focus on testing behavior and public API, not internal methods.
3. **Ignoring domain events**: Make sure to test that appropriate events are published.
4. **Missing negative tests**: Test not only that valid operations succeed but also that invalid operations fail.
5. **Depending on infrastructure**: Domain tests should not rely on databases or external systems.

---

For more information about testing other layers of the application, refer to the [API Testing Guide](./api-testing.md) and the main [Testing Guide](../guides/testing-guide.md). 