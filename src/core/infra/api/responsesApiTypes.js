'use strict';
/**
 * Response API Types
 *
 * This module defines types and constants related to external APIs.
 * These are infrastructure concerns and should not be referenced directly by domain logic.
 */
// Response format types
const Response = {
    Formatted: 'formatted',
    Raw: 'raw',
    Markdown: 'markdown',
    JSON: 'json',
    Code: 'code',
};
// Message types for API interactions
const MessageType = {
    System: 'system',
    User: 'user',
    Assistant: 'assistant',
    Tool: 'tool',
    FunctionCall: 'function_call',
    FunctionCallResult: 'function_call_result',
};
export { Response };
export { MessageType };
export default {
    Response,
    MessageType
};
