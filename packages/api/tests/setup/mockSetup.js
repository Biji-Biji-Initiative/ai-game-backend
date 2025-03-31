/**
 * Mock Setup for Domain Tests
 *
 * This file sets up mocks for external services to allow domain tests to run
 * without requiring actual external connections.
 */
// Import the domain events mock
import eventBusMock, { EventTypes } from '../mocks/domainEventsMock.js';
// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.SUPABASE_KEY = 'mock-supabase-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';
// Mock Supabase client
const mockSupabaseClient = {
    from: table => ({
        select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
            in: () => Promise.resolve({ data: [], error: null }),
            match: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
        update: () => ({
            eq: () => Promise.resolve({ data: { id: 'mock-id' }, error: null })
        }),
        delete: () => ({
            eq: () => Promise.resolve({ data: { id: 'mock-id' }, error: null })
        })
    }),
    auth: {
        signIn: () => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null }),
        signUp: () => Promise.resolve({ data: { user: { id: 'mock-user-id' } }, error: null }),
        signOut: () => Promise.resolve({ error: null })
    },
    storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: 'https://mock-url.com/file' } })
        })
    }
};
// Mock OpenAI client
const mockOpenAIClient = {
    chat: {
        completions: {
            create: () => Promise.resolve({
                id: 'mock-response-id',
                choices: [
                    {
                        message: {
                            content: '{"mock": "data"}'
                        }
                    }
                ]
            })
        }
    }
};
// We can't mock module.prototype.require in ESM mode
// For mock purposes, create a global that can be accessed by tests
globalThis.__mocks = {
    supabase: mockSupabaseClient,
    openai: mockOpenAIClient,
    eventBus: eventBusMock,
    EventTypes
};
// Export the mocks for direct imports
export const mocks = {
    supabase: mockSupabaseClient,
    openai: mockOpenAIClient,
    eventBus: eventBusMock,
    EventTypes
};
// Named exports
export { eventBusMock };
export { EventTypes };
