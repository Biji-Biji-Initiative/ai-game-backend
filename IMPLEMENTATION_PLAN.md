# Responses API Implementation Plan

## Overview

This document outlines the implementation plan for completing the remaining tickets to fully integrate the OpenAI Responses API throughout our codebase. The tickets are arranged in priority order, with implementation steps, dependencies, and effort estimates provided for each.

## Priority 1: Complete Tool Call Lifecycle

### Ticket 1: Verify and Integrate Tool Result Submission Mechanism

**Description:** Verify and implement the correct payload structure for submitting tool results back to OpenAI.

**Dependencies:** None, this is a foundational feature other tickets depend on.

**Effort:** Medium

**Implementation Steps:**
1. Research exact payload structure required by POST /v1/responses for tool results submission
2. Create a dedicated `submitToolResults` method in client.js that constructs the payload properly
3. Update `functionTools.createToolResultInput` if necessary based on findings
4. Add integration tests for the complete tool call workflow

**Files to Modify:**
- src/infra/openai/client.js (primary)
- src/infra/openai/functionTools.js (may need minor updates)
- tests/integration/toolCallWorkflow.test.js (new)

### Ticket 2: Enhance Tool Call Handling in responseHandler.js

**Description:** Improve response handler to better differentiate between text and tool call responses.

**Dependencies:** Ticket 1 should be completed first as they're closely related.

**Effort:** Medium

**Implementation Steps:**
1. Modify `OpenAIResponseHandler.process` to specifically check for tool_call items in output
2. Add a `responseType` field to the processed response object ('text' or 'tool_call')
3. Include parsed tool calls directly in the response object when tool calls are present
4. Update unit tests to cover both response types

**Files to Modify:**
- src/infra/openai/responseHandler.js
- tests/unit/openai/responseHandler.test.js

## Priority 2: Streaming Integration

### Ticket 3: Integrate StreamProcessor in Consumers

**Description:** Update stream consumers to leverage the new structured StreamProcessor.

**Dependencies:** None for implementation, but ideally after Ticket 1 & 2 for consistent patterns.

**Effort:** Medium

**Implementation Steps:**
1. Refactor `challengeEvaluationService.streamEvaluation` to use `client.createStreamController`
2. Update to use the specific callbacks (onText, onToolCall, onComplete, onError)
3. Remove direct raw stream processing logic
4. If terminal-client.js is kept, update it too
5. Add tests verifying correct event handling

**Files to Modify:**
- src/core/challenge/services/challengeEvaluationService.js
- src/terminal-client.js (if kept)
- Any other stream consumers

### Ticket 4: Enhance Mock Stream for Tool Calls

**Description:** Update the mock stream to accurately simulate tool call events.

**Dependencies:** None, but complements Ticket 3.

**Effort:** Medium

**Implementation Steps:**
1. Update mock implementation in `client.streamMessage` to include the correct event sequence for tool calls
2. Add simulation for all relevant events (response.output_item.added, response.function_call_arguments.delta, etc.)
3. Ensure the final response.completed event includes the correct tool_call structure
4. Add unit tests verifying mock stream behavior

**Files to Modify:**
- src/infra/openai/client.js
- tests/unit/openai/client.test.js

## Priority 3: Feature Adoption

### Ticket 5: Integrate Built-in Tool Usage

**Description:** Integrate support for OpenAI's built-in tools like web_search.

**Dependencies:** Ticket 1 & 2 should be completed first.

**Effort:** Medium

**Implementation Steps:**
1. Update client.js methods to accept tool definitions created by defineBuiltInTool
2. Ensure the payload correctly includes these tool definitions
3. Update response handler to correctly process outputs from built-in tools
4. Identify and update relevant prompt builders to optionally request built-in tools
5. Add tests for built-in tool requests and responses

**Files to Modify:**
- src/infra/openai/client.js
- src/infra/openai/responseHandler.js
- src/infra/openai/functionTools.js (minor updates)
- Relevant prompt builders

### Ticket 6: Integrate File Input Usage

**Description:** Support file inputs for document analysis use cases.

**Dependencies:** None, but ideally after higher priority tickets.

**Effort:** Medium

**Implementation Steps:**
1. Update client.js methods to handle input formats containing file references
2. Identify use cases where file inputs would be beneficial (document evaluation, etc.)
3. Update corresponding services/prompt builders to utilize file inputs
4. Ensure file IDs are correctly obtained and handled

**Files to Modify:**
- src/infra/openai/client.js
- Relevant services/builders that would benefit from file inputs

## Priority 4: Client Parameter Enhancements

### Ticket 7: Integrate include Parameter Usage

**Description:** Pass the include parameter to the API for more control over response contents.

**Dependencies:** None, low priority feature.

**Effort:** Small

**Implementation Steps:**
1. Add optional include parameter to relevant methods in OpenAIClient
2. Validate against IncludeOption from types.js
3. Pass the validated include array in API request payload
4. Add tests verifying the parameter is passed correctly

**Files to Modify:**
- src/infra/openai/client.js
- src/infra/openai/types.js (possibly)

### Ticket 8: Integrate truncation Parameter Usage

**Description:** Allow specifying truncation strategy in API requests.

**Dependencies:** None, low priority feature.

**Effort:** Small

**Implementation Steps:**
1. Add optional truncation parameter to relevant methods in OpenAIClient
2. Validate against TruncationStrategy from types.js
3. Pass the validated truncation value in API request payload
4. Add tests verifying the parameter is passed correctly

**Files to Modify:**
- src/infra/openai/client.js
- src/infra/openai/types.js (possibly)

### Ticket 9: Integrate metadata Parameter Usage

**Description:** Pass metadata in API requests for tracking purposes.

**Dependencies:** None, low priority feature.

**Effort:** Small

**Implementation Steps:**
1. Ensure the validated metadata from options.metadata is correctly included in API requests
2. Add tests verifying the parameter is passed correctly

**Files to Modify:**
- src/infra/openai/client.js

### Ticket 10: Integrate user Identifier Usage

**Description:** Pass the user identifier in API requests for monitoring and abuse prevention.

**Dependencies:** None, but higher priority than other parameter enhancements.

**Effort:** Small

**Implementation Steps:**
1. Ensure the validated user identifier is correctly passed as the user field in API requests
2. Add tests verifying the parameter is passed correctly

**Files to Modify:**
- src/infra/openai/client.js

## Implementation Timeline

### Week 1: Tool Call Lifecycle & High Priority Updates
- Implement Ticket 1: Tool Result Submission 
- Implement Ticket 2: Response Handler Enhancement
- Continue updating prompt builders for ARCH-03-VERIFY

### Week 2: Streaming Integration & Core Features
- Implement Ticket 3: Stream Consumer Integration
- Implement Ticket 4: Mock Stream Enhancement
- Implement Ticket 10: User Identifier Usage

### Week 3: Advanced Feature Integration
- Implement Ticket 5: Built-in Tool Support
- Implement Ticket 6: File Input Support
- Complete any remaining prompt builder updates

### Week 4: Parameter Enhancements & Testing
- Implement Tickets 7-9: Parameter Enhancements
- Complete comprehensive testing
- Update documentation

## Dependencies Graph

```
Ticket 1 ──┬──> Ticket 2 ───> Ticket 5
           │
           └──> Ticket 3
                 │
                 v
               Ticket 4

Tickets 6, 7, 8, 9, 10 (Independent)
```

## Verification Plan

After implementing each ticket:
1. Run the verification script to check prompt builders
2. Add appropriate unit tests 
3. Update the implementation status document
4. Update the migration guide as needed 