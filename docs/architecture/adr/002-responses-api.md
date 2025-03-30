# ADR-002: Migration to OpenAI Responses API

## Status
Accepted

## Date
2023-11-10

## Context
Our application heavily relies on OpenAI's API for generating AI-powered content, including challenges, evaluations, and personality insights. Previously, we were using OpenAI's Chat Completions API, which had several limitations:

1. **Stateless Interactions**: Chat Completions API required us to manage conversation state ourselves, leading to complex state management code.

2. **Limited Tool Integration**: While Chat Completions supported function calling, the implementation was cumbersome and required significant error handling.

3. **Response Format Issues**: We frequently encountered JSON parsing errors when requesting specific response formats.

4. **Inconsistent Output**: The lack of structured response formats led to variation in outputs that required extensive post-processing.

5. **Conversation Management**: Managing conversation history and context was handled manually in our codebase.

When OpenAI released the new Responses API, it addressed many of these limitations with features like built-in state management, improved tool usage, and better response formatting.

## Decision
We have decided to migrate all OpenAI API interactions from the Chat Completions API to the Responses API. Specifically, we will:

1. **Replace all API Calls**: Update our OpenAIClient to use the Responses API endpoints.

2. **Adopt Stateful Conversations**: Leverage the built-in conversation state management of the Responses API.

3. **Standardize Parameters**: Use the new parameter format (input, instructions, response_format, etc.).

4. **Refactor Prompt System**: Update our prompt builders to generate prompts in the format expected by the Responses API.

5. **Adopt New Features**: Use new capabilities like dedicated conversation_id for stateful interactions.

6. **Streamline Error Handling**: Simplify error handling for common API issues.

## Consequences

### Positive
1. **Simplified Code**: Significant reduction in state management complexity.
2. **Improved Reliability**: More consistent response formats with fewer parsing errors.
3. **Better Performance**: More efficient conversations with built-in state management.
4. **Enhanced Capabilities**: Access to new features as they're added to the Responses API.
5. **Future-Proofing**: Alignment with OpenAI's strategic direction.
6. **Reduced Boilerplate**: Less code needed for conversation handling and context management.

### Negative
1. **Migration Effort**: Significant refactoring required to update all API calls.
2. **Potential Breaking Changes**: Changes to the response format may break existing code.
3. **Learning Curve**: Team needs to learn the new API patterns.
4. **Documentation Updates**: Extensive documentation updates required.
5. **Temporary Inconsistency**: During migration, both APIs might be in use simultaneously.

### Mitigations
1. **Incremental Migration**: Migrate one domain at a time, starting with the most critical ones.
2. **Comprehensive Testing**: Ensure thorough testing of migrated components.
3. **Abstraction Layer**: Maintain our abstraction layer to shield application code from API changes.
4. **Fallback Mechanism**: Implement fallback to Chat Completions for critical features during transition.
5. **Documentation**: Update documentation to reflect the new API usage.

## Implementation Plan
1. Create a new OpenAIResponsesClient alongside existing OpenAIClient
2. Update prompt builders to support the new API format
3. Migrate challenge generation first, then evaluations
4. Update stateful conversation management
5. Add comprehensive tests
6. Phase out old API calls after successful migration

## References
- OpenAI API Documentation (refer to the official OpenAI platform documentation)
- Internal design documents on AI integration
- Migration proof-of-concept results 