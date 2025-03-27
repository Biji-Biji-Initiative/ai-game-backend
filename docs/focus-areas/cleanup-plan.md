# Focus Area Refactoring Cleanup Plan

## Overview

This document outlines the cleanup tasks needed after the successful refactoring of the Focus Area module to use the OpenAI Responses API. These tasks will help maintain a clean codebase and ensure all legacy code is properly removed.

## Completed Tasks

1. ✅ Implemented the Domain-Driven Design architecture for focus areas
2. ✅ Migrated the OpenAI client to use the Responses API instead of Chat Completions API
3. ✅ Updated the response handling to properly parse JSON outputs
4. ✅ Implemented thread-based conversation management
5. ✅ Created comprehensive tests for the new implementation
6. ✅ Updated documentation to reflect the new architecture and API usage
7. ✅ Removed backup files that were created during refactoring
8. ✅ Created the Challenge domain model following DDD principles
9. ✅ Implemented Challenge domain services (Generation, Thread, Evaluation)
10. ✅ Added documentation for the Challenge module
11. ✅ Created Supabase integration for the Challenge module:
     - Added database schema and migration script
     - Implemented mapping between domain model and database records
     - Updated repository to work with the new structure
     - Added documentation for Supabase integration

## Remaining Tasks

### Files to Delete

1. **Legacy Prompt Templates**
   - Any files in directories like `src/utils/prompts/` if they exist
   - Legacy prompt builder implementations that have been replaced

2. **Old Test Files**
   - Deprecated test files that test old functionality

### Code to Refactor

1. **API-Level Challenge Services**
   - Update the main `challengeService.js` to use the new domain services
   - Update controllers to use the new services



3. **Other Modules Using Chat Completions API**
   - Evaluation module
   - Any other modules using the Chat Completions API

4. **Indirect References**
   - Update any code that indirectly references the old prompt generation system
   - Ensure all imports reference the new modules

### Documentation Updates

1. **README Files**
   - Update the main project README to reflect the new architecture
   - Ensure all module READMEs are consistent

2. **Migration Guides**
   - Update the prompt migration guide with lessons learned

### Database Updates

1. **Run Database Migrations**
   - Apply the challenge table migration to the Supabase database
   - Update any existing data to match the new schema

2. **Update Database Indexes**
   - Ensure proper indexes are created for performance
   - Update any triggers and functions as needed

## Integration Testing

After cleanup, comprehensive integration testing should be performed to ensure:

1. Focus area generation works correctly with the Responses API
2. Challenge generation works with the Responses API
3. Thread management properly maintains conversation context
4. JSON responses are parsed correctly
5. Error handling works as expected
6. Supabase integration works correctly for storing and retrieving challenges

## Next Module To Migrate

Based on the current progress, the next module to migrate should be:

1. **Evaluation Module**
   - Follows similar pattern to challenges and focus areas
   - Critical for user feedback
   - Will benefit from the same architectural improvements

## Handoff Notes

When continuing this work, here's what you need to know:

1. The OpenAI Responses API has a different structure than Chat Completions:
   - System messages go in the `instructions` parameter
   - User messages go in the `input` parameter
   - JSON format is specified with `format: 'json'`
   - Response content is in `response.output_text`

2. The Domain-Driven Design architecture separates:
   - Domain models (core entities)
   - Domain services (core business logic)
   - Application services (API-level coordination)
   - Repositories (data access)

3. The Prompt Factory pattern:
   - Centralizes prompt creation
   - Supports different prompt types
   - Ensures consistent API usage

4. The Supabase integration:
   - Uses snake_case field names in the database
   - Uses Domain models with camelCase properties
   - Requires mapping between the two formats
   - Incorporates Row Level Security for data protection

5. All tests must pass before and after any changes 