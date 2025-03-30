# Database Schema Documentation

This document provides a comprehensive overview of the database schema used in the AI Gaming Backend project. It includes entity relationship diagrams, table descriptions, and details about relationships between entities.

## Database Overview

Our application uses MongoDB as its primary database, organized into collections that represent our domain entities. We follow a domain-driven design approach with our database schema, ensuring that our collections align with our bounded contexts.

## Entity Relationship Diagram

Below is a high-level entity relationship diagram showing the main collections and their relationships:

```
+---------------+       +---------------+       +---------------+
|               |       |               |       |               |
|     User      |------>|     Game      |<------|    Player     |
|               |       |               |       |               |
+---------------+       +---------------+       +---------------+
        |                      |                       |
        |                      |                       |
        v                      v                       v
+---------------+       +---------------+       +---------------+
|               |       |               |       |               |
|  UserProfile  |       |  GameSession  |       | PlayerStats   |
|               |       |               |       |               |
+---------------+       +---------------+       +---------------+
                               |
                               |
                               v
                        +---------------+
                        |               |
                        |    AIState    |
                        |               |
                        +---------------+
```

## Collections

### Users Collection

Stores user authentication and basic information.

**Schema:**
```json
{
  "_id": "ObjectId",
  "email": "String (unique, required)",
  "password": "String (hashed, required)",
  "username": "String (unique, required)",
  "role": "String (enum: 'admin', 'player', 'developer')",
  "createdAt": "Date",
  "updatedAt": "Date",
  "lastLogin": "Date"
}
```

**Indexes:**
- `email`: Unique index for user lookup
- `username`: Unique index for user lookup
- `createdAt`: For sorting users by creation date

### UserProfiles Collection

Stores extended user information.

**Schema:**
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (reference to Users collection)",
  "displayName": "String",
  "avatar": "String (URL)",
  "bio": "String",
  "preferences": {
    "theme": "String",
    "notifications": "Boolean"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**
- `userId`: For fast lookup of profiles by user ID

### Games Collection

Stores information about available games.

**Schema:**
```json
{
  "_id": "ObjectId",
  "title": "String (required)",
  "description": "String",
  "version": "String",
  "status": "String (enum: 'active', 'inactive', 'development')",
  "settings": {
    "maxPlayers": "Number",
    "timeLimit": "Number",
    "difficultyLevels": ["String"]
  },
  "createdBy": "ObjectId (reference to Users collection)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**
- `title`: For game search
- `status`: For filtering active games
- `createdBy`: For finding games created by a specific user

### Players Collection

Represents players in the system.

**Schema:**
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (reference to Users collection)",
  "nickname": "String",
  "level": "Number",
  "experience": "Number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**
- `userId`: For finding a player by user ID
- `level`: For finding players at specific levels
- `experience`: For sorting players by experience

### PlayerStats Collection

Tracks player statistics across games.

**Schema:**
```json
{
  "_id": "ObjectId",
  "playerId": "ObjectId (reference to Players collection)",
  "gameId": "ObjectId (reference to Games collection)",
  "gamesPlayed": "Number",
  "gamesWon": "Number",
  "highScore": "Number",
  "totalScore": "Number",
  "achievements": [
    {
      "name": "String",
      "unlockedAt": "Date"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**
- `playerId`: For finding stats by player
- `gameId`: For finding stats by game
- `playerId_gameId`: Compound index for finding specific player stats for a game

### GameSessions Collection

Represents individual game session instances.

**Schema:**
```json
{
  "_id": "ObjectId",
  "gameId": "ObjectId (reference to Games collection)",
  "players": [
    {
      "playerId": "ObjectId (reference to Players collection)",
      "role": "String",
      "status": "String (enum: 'active', 'inactive', 'disconnected')"
    }
  ],
  "status": "String (enum: 'waiting', 'active', 'completed', 'aborted')",
  "startTime": "Date",
  "endTime": "Date",
  "settings": "Object (game-specific settings)",
  "result": {
    "winner": "ObjectId (reference to Players collection)",
    "scores": [
      {
        "playerId": "ObjectId",
        "score": "Number"
      }
    ]
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**
- `gameId`: For finding sessions by game
- `players.playerId`: For finding sessions by player
- `status`: For filtering active sessions
- `startTime`: For sorting sessions by start time

### AIState Collection

Stores AI state data for game sessions.

**Schema:**
```json
{
  "_id": "ObjectId",
  "sessionId": "ObjectId (reference to GameSessions collection)",
  "gameState": "Object",
  "aiDecisions": [
    {
      "timestamp": "Date",
      "action": "String",
      "parameters": "Object",
      "reasoning": "String"
    }
  ],
  "currentPhase": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Indexes:**
- `sessionId`: For finding AI state by game session

## Data Relationships

### One-to-One Relationships

- **User → UserProfile**: Each user has one user profile
  - Connected via `userId` in UserProfiles collection

### One-to-Many Relationships

- **User → Games**: A user can create multiple games
  - Connected via `createdBy` in Games collection
  
- **User → Player**: A user can have one player identity
  - Connected via `userId` in Players collection
  
- **Game → GameSessions**: A game can have multiple sessions
  - Connected via `gameId` in GameSessions collection

- **GameSession → AIState**: A game session has one AI state
  - Connected via `sessionId` in AIState collection

### Many-to-Many Relationships

- **Players ↔ Games**: Players can participate in multiple games, and games can have multiple players
  - Connected via GameSessions collection with `players` array
  
- **Players ↔ PlayerStats**: Players can have stats for multiple games
  - Connected via `playerId` and `gameId` in PlayerStats collection

## Schema Evolution

Our database schema evolves with the application. We follow these principles for schema changes:

1. **Backward Compatibility**: Schema changes should be backward compatible when possible
2. **Migration Scripts**: We maintain migration scripts for significant schema changes
3. **Version Tracking**: Collections include schema version indicators when appropriate
4. **Gradual Rollout**: Major schema changes are rolled out gradually with dual-writing when necessary

## Sharding Strategy

For horizontal scaling, we've identified these sharding keys:

- **Users**: Sharded by user ID ranges
- **GameSessions**: Sharded by game ID to keep related sessions together
- **PlayerStats**: Sharded by player ID to keep player stats together

## Data Validation

We use MongoDB schema validation to enforce document structure:

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "username"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^.+@.+\\..+$"
        },
        // Additional validation rules
      }
    }
  }
})
```

## Indexing Strategy

Our indexing strategy focuses on:

1. **Query Patterns**: Indexes support common query patterns
2. **Write Performance**: Balanced with read performance needs
3. **Index Size**: Monitored to prevent excessive memory usage
4. **Compound Indexes**: Used for multi-field queries

## Database Access Patterns

Common database access patterns include:

1. **User Authentication**: Lookup by email/username + password verification
2. **Game Listing**: Filtered query on Games collection by status
3. **Session Management**: Queries on GameSessions by status and players
4. **Player Statistics**: Aggregations on PlayerStats collection
5. **AI Decision Making**: Updates to AIState collection during gameplay

## Best Practices

When working with our database:

1. **Use the repository pattern** for database access
2. **Validate data** before saving to the database
3. **Use transactions** for operations that modify multiple collections
4. **Consider indexing implications** when adding new queries
5. **Follow naming conventions** for consistency
6. **Document schema changes** in the project changelog 