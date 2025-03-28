# State Management with OpenAI Responses API

This document explains how state is managed in stateful conversations with the OpenAI Responses API.

## Overview

The AI Fight Club API uses OpenAI's Responses API for all AI interactions. Unlike the legacy Chat Completions API, the Responses API provides native support for stateful conversations through threads, eliminating the need to manually manage conversation history.

## Key Concepts

### Threads

Threads in the Responses API represent persistent conversation contexts. Each thread has a unique identifier and maintains the entire conversation history.

```javascript
// Creating a new thread
const thread = await openai.createThread({
  metadata: {
    userId: 'user-123',
    challengeId: 'challenge-456'
  }
});

// Thread ID is used for all future interactions
const threadId = thread.id;
```

### Messages

Messages are added to threads to maintain conversation context. Each message has a role (user or assistant) and content.

```javascript
// Adding a user message to a thread
await openai.createMessage({
  threadId: threadId,
  role: 'user',
  content: 'How do I approach this AI ethics challenge?'
});
```

### Responses

Responses are generated based on the entire thread history, allowing for contextually aware AI interactions.

```javascript
// Creating a response based on the thread
const response = await openai.createResponse({
  threadId: threadId,
  instructions: 'You are an AI ethics expert helping the user with their challenge.',
  response_format: { type: 'json_object' }
});
```

## OpenAIStateManager

Our system uses an `OpenAIStateManager` to abstract thread management and provide a consistent interface for stateful conversations.

### Responsibilities

1. Thread creation and retrieval
2. Message history management
3. Conversation context preservation
4. Metadata association
5. Thread cleanup and maintenance

### Implementation

```javascript
class OpenAIStateManager {
  constructor(openAIClient, threadRepository) {
    this.openAIClient = openAIClient;
    this.threadRepository = threadRepository;
  }
  
  async getOrCreateThread(userId, challengeId) {
    // Check if thread exists for this user and challenge
    const existingThread = await this.threadRepository.findByUserAndChallenge(userId, challengeId);
    
    if (existingThread) {
      return existingThread.threadId;
    }
    
    // Create a new thread if one doesn't exist
    const thread = await this.openAIClient.createThread({
      metadata: { userId, challengeId }
    });
    
    // Save thread reference
    await this.threadRepository.save({
      userId,
      challengeId,
      threadId: thread.id,
      createdAt: new Date()
    });
    
    return thread.id;
  }
  
  async addUserMessage(threadId, message) {
    return this.openAIClient.createMessage({
      threadId,
      role: 'user',
      content: message
    });
  }
  
  async generateResponse(threadId, prompt, options = {}) {
    // Add user message if provided
    if (prompt) {
      await this.addUserMessage(threadId, prompt);
    }
    
    // Generate response from OpenAI
    return this.openAIClient.createResponse({
      threadId,
      instructions: options.instructions || 'You are a helpful AI assistant.',
      response_format: options.responseFormat || { type: 'text' },
      max_tokens: options.maxTokens
    });
  }
  
  async getMessageHistory(threadId, limit = 10) {
    // Retrieve message history from thread
    const messages = await this.openAIClient.listMessages(threadId, {
      limit
    });
    
    return messages.data;
  }
  
  async cleanupInactiveThreads(olderThanDays = 30) {
    // Find and delete threads older than specified days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const inactiveThreads = await this.threadRepository.findOlderThan(cutoffDate);
    
    for (const thread of inactiveThreads) {
      await this.openAIClient.deleteThread(thread.threadId);
      await this.threadRepository.delete(thread.id);
    }
    
    return inactiveThreads.length;
  }
}
```

## Usage in Domain Services

Domain services use the `OpenAIStateManager` to maintain conversation context:

```javascript
class ChallengeService {
  constructor(openAIStateManager, challengeRepository) {
    this.openAIStateManager = openAIStateManager;
    this.challengeRepository = challengeRepository;
  }
  
  async startChallenge(userId, focusAreaId) {
    // Create challenge in the database
    const challenge = await this.challengeRepository.create({
      userId,
      focusAreaId,
      status: 'ACTIVE'
    });
    
    // Initialize a thread for this challenge
    const threadId = await this.openAIStateManager.getOrCreateThread(userId, challenge.id);
    
    // Update challenge with thread reference
    await this.challengeRepository.update(challenge.id, { threadId });
    
    return challenge;
  }
  
  async getNextPrompt(userId, challengeId) {
    const challenge = await this.challengeRepository.findById(challengeId);
    
    // Get or create thread
    const threadId = await this.openAIStateManager.getOrCreateThread(userId, challengeId);
    
    // Generate the next prompt based on thread history
    const response = await this.openAIStateManager.generateResponse(
      threadId,
      null, // No new user message
      {
        instructions: `You are guiding the user through the "${challenge.title}" challenge.`,
        responseFormat: { type: 'json_object' }
      }
    );
    
    return response.output;
  }
  
  async submitResponse(userId, challengeId, userResponse) {
    // Get thread
    const threadId = await this.openAIStateManager.getOrCreateThread(userId, challengeId);
    
    // Add user response to the thread
    await this.openAIStateManager.addUserMessage(threadId, userResponse);
    
    // Record response in database
    await this.challengeRepository.updateResponse(challengeId, userResponse);
    
    return { success: true };
  }
}
```

## Benefits of Thread-Based State Management

1. **Simplified Conversation Management**: No need to manually track and append message history
2. **Improved Context Retention**: The entire conversation history is available to the AI
3. **Reduced Token Usage**: No need to resend the entire conversation history with each request
4. **Automatic Cleanup**: OpenAI automatically manages thread lifetimes
5. **Metadata Support**: Threads can be tagged with metadata for easier management

## Thread Lifecycle Management

To prevent accumulation of unused threads:

1. **Association**: Threads are associated with users and challenges
2. **Monitoring**: Thread usage is monitored to identify inactive threads
3. **Cleanup**: Regular cleanup jobs remove threads that are no longer needed
4. **Extension**: Important threads can be marked for longer retention

## Testing State Management

When testing stateful conversations:

```javascript
// In test setup
const mockOpenAIClient = {
  createThread: jest.fn().mockResolvedValue({ id: 'thread-123' }),
  createMessage: jest.fn().mockResolvedValue({ id: 'message-456' }),
  createResponse: jest.fn().mockResolvedValue({
    id: 'response-789',
    output: { nextStep: 'Sample output' }
  }),
  listMessages: jest.fn().mockResolvedValue({
    data: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ]
  })
};

const stateManager = new OpenAIStateManager(mockOpenAIClient, mockThreadRepository);

// Test stateful interaction
test('maintains conversation context across multiple interactions', async () => {
  const threadId = await stateManager.getOrCreateThread('user-123', 'challenge-456');
  
  await stateManager.addUserMessage(threadId, 'First message');
  await stateManager.generateResponse(threadId);
  
  await stateManager.addUserMessage(threadId, 'Second message');
  const response = await stateManager.generateResponse(threadId);
  
  // Verify the mock was called with the right threadId
  expect(mockOpenAIClient.createResponse).toHaveBeenCalledWith(
    expect.objectContaining({ threadId })
  );
}); 