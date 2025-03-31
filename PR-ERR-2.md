# PR: ERR-2 - Implement Dead Letter Queue for Event Bus

## 📝 Description

This PR implements a Dead Letter Queue (DLQ) mechanism for the event bus system, ensuring that failed events are not lost but instead stored in a database for later inspection, troubleshooting, and potential retry. This improves the system's resilience and observability.

## 🔍 Changes Overview

1. Created a DeadLetterQueueService to manage storing and retrieving failed events
2. Extended RobustEventBus to support the Dead Letter Queue
3. Added REST API endpoints for DLQ management
4. Created database migration for the DLQ table
5. Added comprehensive unit tests

## 🔧 Technical Details

### 1. Dead Letter Queue Service

The DLQ service provides these core functionalities:
- Storing failed events with full context (error, handler info, etc.)
- Retrieving failed events with filtering and pagination
- Retrying failed events individually or in batches
- Resolving or deleting failed events

### 2. Event Bus Integration

The RobustEventBus has been enhanced to:
- Automatically send failed events to the DLQ
- Provide methods to interact with the DLQ (retry, resolve, etc.)
- Include DLQ status in metrics

### 3. API Endpoints

New administrative endpoints:
- `GET /api/v1/events/dlq` - List failed events with filtering
- `POST /api/v1/events/dlq/:id/retry` - Retry a specific failed event
- `POST /api/v1/events/dlq/retry-all` - Retry all failed events matching criteria
- `DELETE /api/v1/events/dlq/:id` - Delete a failed event
- `PUT /api/v1/events/dlq/:id/resolve` - Mark a failed event as resolved

### 4. Database Schema

The DLQ table includes:
- Event metadata (ID, name, timestamp, etc.)
- Event data for replay
- Error details for troubleshooting
- Retry tracking (count, last attempt, status)

## 🧪 Testing

Unit tests cover:
- Storing failed events in the DLQ
- Retrieving failed events with filters
- Retrying failed events
- Error handling in all operations

## 🛡️ Security Considerations

- DLQ management endpoints require admin authorization
- All inputs are validated using Zod schemas
- No sensitive data is exposed in API responses

## 📋 Implementation Notes

1. The DLQ is enabled by default for all event handlers
2. Failed events are stored with their original data for accurate replay
3. Retry attempts update the status and count in the database
4. Each operation is properly logged for auditing and debugging

## 👥 Reviewers

Please focus on:
1. Error handling completeness
2. Transaction safety
3. API security
4. Integration with existing code 