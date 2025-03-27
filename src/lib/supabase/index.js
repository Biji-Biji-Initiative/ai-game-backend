/**
 * Supabase Client Export
 * 
 * This file is a compatibility layer that exports the Supabase client
 * from the infrastructure layer, to maintain backward compatibility
 * with code that imports from lib/supabase.
 */

const { supabaseClient } = require('../../core/infra/db/supabaseClient');

// Export the supabaseClient as the default export for backward compatibility
module.exports = supabaseClient; 