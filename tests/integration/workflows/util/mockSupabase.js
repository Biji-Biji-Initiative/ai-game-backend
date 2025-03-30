/**
 * Mock implementation of the Supabase client for integration tests
 * This eliminates external dependencies and prevents row-level security issues
 */

// In-memory storage for mock data
const mockDatabase = {
  users: new Map(),
  profiles: new Map(),
  challenges: new Map(),
  evaluations: new Map()
};

/**
 * Create a mock Supabase client for testing
 * @returns {Object} Mock Supabase client that mimics the real client API
 */
export function createMockSupabaseClient() {
  const mockClient = {
    // Base query builder
    from: (table) => {
      let filters = [];
      let selectedFields = '*';
      let resultData = null;
      
      const collection = mockDatabase[table] || new Map();
      
      const queryBuilder = {
        // Selection methods
        select: (fields = '*') => {
          selectedFields = fields;
          return queryBuilder;
        },
        
        // Filter methods
        eq: (field, value) => {
          filters.push((item) => item[field] === value);
          return queryBuilder;
        },
        
        // Result methods
        single: async () => {
          try {
            // Find the first item that matches all filters
            let result = null;
            
            for (const [id, item] of collection.entries()) {
              if (filters.every(filter => filter(item))) {
                result = { ...item };
                break;
              }
            }
            
            return {
              data: result,
              error: result ? null : { message: 'No matching record found' }
            };
          } catch (error) {
            return { data: null, error: { message: error.message } };
          }
        },
        
        maybeSingle: async () => {
          try {
            // Find the first item that matches all filters or return null
            let result = null;
            
            for (const [id, item] of collection.entries()) {
              if (filters.every(filter => filter(item))) {
                result = { ...item };
                break;
              }
            }
            
            return { data: result, error: null };
          } catch (error) {
            return { data: null, error: { message: error.message } };
          }
        },
        
        // Data modification
        insert: (data) => {
          try {
            // For arrays of items
            if (Array.isArray(data)) {
              const insertedItems = [];
              for (const item of data) {
                const id = item.id || crypto.randomUUID();
                collection.set(id, { ...item, id });
                insertedItems.push({ ...item, id });
              }
              
              resultData = insertedItems;
            } else {
              // For single item
              const id = data.id || crypto.randomUUID();
              collection.set(id, { ...data, id });
              resultData = { ...data, id };
            }
            
            return queryBuilder;
          } catch (error) {
            resultData = null;
            return {
              select: () => queryBuilder,
              single: async () => ({ data: null, error: { message: error.message } })
            };
          }
        },
        
        update: (updates) => {
          try {
            let updatedItem = null;
            
            for (const [id, item] of collection.entries()) {
              if (filters.every(filter => filter(item))) {
                const updated = { ...item, ...updates };
                collection.set(id, updated);
                updatedItem = updated;
                break;
              }
            }
            
            resultData = updatedItem;
            return queryBuilder;
          } catch (error) {
            resultData = null;
            return {
              select: () => queryBuilder,
              single: async () => ({ data: null, error: { message: error.message } })
            };
          }
        },
        
        // Update the delete method to support method chaining
        delete: () => {
          let toDelete = [];
          
          return {
            eq: (field, value) => {
              filters.push((item) => item[field] === value);
              
              // Execute the delete when called
              try {
                for (const [id, item] of collection.entries()) {
                  if (filters.every(filter => filter(item))) {
                    collection.delete(id);
                    toDelete.push(item);
                  }
                }
                
                return { error: null };
              } catch (error) {
                return { error: { message: error.message } };
              }
            },
            // For direct deletion without filters
            execute: () => {
              try {
                let deletedItems = [];
                
                for (const [id, item] of collection.entries()) {
                  if (filters.every(filter => filter(item))) {
                    collection.delete(id);
                    deletedItems.push(item);
                  }
                }
                
                return { error: null };
              } catch (error) {
                return { error: { message: error.message } };
              }
            }
          };
        }
      };
      
      return queryBuilder;
    },
    
    // Auth methods
    auth: {
      signIn: async () => ({ data: { user: { id: 'mock-user-id' } }, error: null }),
      signOut: async () => ({ error: null })
    },
    
    // Clear mock data (for test cleanup)
    _clearMockData: () => {
      for (const collection of Object.values(mockDatabase)) {
        collection.clear();
      }
    }
  };
  
  return mockClient;
}

/**
 * Reset the mock database between tests
 */
export function resetMockDatabase() {
  for (const collection of Object.values(mockDatabase)) {
    collection.clear();
  }
}

/**
 * Add predefined data to the mock database for testing
 * @param {string} table - Table name
 * @param {Array} items - Array of items to add
 */
export function seedMockData(table, items) {
  if (!mockDatabase[table]) {
    mockDatabase[table] = new Map();
  }
  
  for (const item of items) {
    const id = item.id || crypto.randomUUID();
    mockDatabase[table].set(id, { ...item, id });
  }
} 