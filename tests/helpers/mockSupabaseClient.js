/**
 * Mock Supabase Client for Tests
 * 
 * This module provides a complete mock for the Supabase client that can be used
 * in tests to avoid the need for actual Supabase credentials.
 */

const sinon = require('sinon');

/**
 * Creates a mock Supabase client to use in tests
 * @param {object} customResponses - Optional custom responses for specific methods
 * @returns {object} A mock Supabase client
 */
function createMockSupabaseClient(customResponses = {}) {
  // Default responses
  const defaultResponses = {
    from: {
      select: {
        data: [],
        error: null
      },
      insert: {
        data: { id: 'mock-insert-id' },
        error: null
      },
      update: {
        data: { id: 'mock-update-id' },
        error: null
      },
      delete: {
        data: { id: 'mock-delete-id' },
        error: null
      },
      upsert: {
        data: { id: 'mock-upsert-id' },
        error: null
      }
    },
    auth: {
      signIn: {
        data: { user: { id: 'mock-user-id' } },
        error: null
      },
      signUp: {
        data: { user: { id: 'mock-new-user-id' } },
        error: null
      },
      signOut: {
        error: null
      }
    },
    storage: {
      createBucket: {
        data: { name: 'mock-bucket' },
        error: null
      },
      getBucket: {
        data: { name: 'mock-bucket' },
        error: null
      },
      upload: {
        data: { path: 'mock-file-path' },
        error: null
      }
    }
  };

  // Merge custom responses with defaults
  const responses = {
    ...defaultResponses,
    ...customResponses
  };

  // Create the mock client
  const mockClient = {
    // Mock for from() method (database access)
    from: sinon.stub().callsFake(table => {
      return {
        select: sinon.stub().returns({
          eq: sinon.stub().returns({ 
            data: responses.from.select.data, 
            error: responses.from.select.error 
          }),
          in: sinon.stub().returns({ 
            data: responses.from.select.data, 
            error: responses.from.select.error 
          }),
          match: sinon.stub().returns({ 
            data: responses.from.select.data, 
            error: responses.from.select.error 
          }),
          data: responses.from.select.data,
          error: responses.from.select.error
        }),
        insert: sinon.stub().returns({
          data: responses.from.insert.data,
          error: responses.from.insert.error
        }),
        update: sinon.stub().returns({
          eq: sinon.stub().returns({
            data: responses.from.update.data,
            error: responses.from.update.error
          }),
          match: sinon.stub().returns({
            data: responses.from.update.data,
            error: responses.from.update.error
          }),
          data: responses.from.update.data,
          error: responses.from.update.error
        }),
        delete: sinon.stub().returns({
          eq: sinon.stub().returns({
            data: responses.from.delete.data,
            error: responses.from.delete.error
          }),
          match: sinon.stub().returns({
            data: responses.from.delete.data,
            error: responses.from.delete.error
          }),
          data: responses.from.delete.data,
          error: responses.from.delete.error
        }),
        upsert: sinon.stub().returns({
          data: responses.from.upsert.data,
          error: responses.from.upsert.error
        })
      };
    }),

    // Mock for auth operations
    auth: {
      signIn: sinon.stub().returns({
        data: responses.auth.signIn.data,
        error: responses.auth.signIn.error
      }),
      signUp: sinon.stub().returns({
        data: responses.auth.signUp.data,
        error: responses.auth.signUp.error
      }),
      signOut: sinon.stub().returns({
        error: responses.auth.signOut.error
      }),
      onAuthStateChange: sinon.stub().returns({
        data: { subscription: { unsubscribe: sinon.stub() } },
        error: null
      })
    },

    // Mock for storage operations
    storage: {
      createBucket: sinon.stub().returns({
        data: responses.storage.createBucket.data,
        error: responses.storage.createBucket.error
      }),
      getBucket: sinon.stub().returns({
        data: responses.storage.getBucket.data,
        error: responses.storage.getBucket.error
      }),
      from: sinon.stub().returns({
        upload: sinon.stub().returns({
          data: responses.storage.upload.data,
          error: responses.storage.upload.error
        }),
        download: sinon.stub().returns({
          data: new Uint8Array(),
          error: null
        }),
        list: sinon.stub().returns({
          data: [],
          error: null
        })
      })
    }
  };

  return mockClient;
}

/**
 * Creates a proxyquire stub that replaces the Supabase client with a mock
 * @param {object} customResponses - Optional custom responses for specific methods
 * @returns {object} A stub for use with proxyquire
 */
function createSupabaseProxyStub(customResponses = {}) {
  return {
    '@noCallThru': true,
    supabaseClient: createMockSupabaseClient(customResponses)
  };
}

module.exports = {
  createMockSupabaseClient,
  createSupabaseProxyStub
}; 