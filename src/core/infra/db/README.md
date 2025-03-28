# Database Infrastructure

This directory contains the infrastructure components for database operations, including the standardized Supabase client implementation.

## Supabase Client

The `supabaseClient.js` file provides the standard implementation for Supabase database access across the application. 

### Usage

Import the client in your code:

```javascript
const { supabaseClient } = require('../../infra/db/supabaseClient');
```

If you need to use the admin client with service role permissions:

```javascript
const { supabaseAdmin } = require('../../infra/db/supabaseClient');
```

### Standardization Note

As part of CODE-02 architecture ticket, all imports have been standardized to use this path:

```javascript
// Correct absolute import path (from src/)
const { supabaseClient } = require('core/infra/db/supabaseClient');

// Correct relative import path (adjust the path based on your file location)
const { supabaseClient } = require('../../infra/db/supabaseClient');
```

### Mock Client

In test and development environments, if no Supabase credentials are found, a mock client is automatically provided to prevent errors.

### Creating Custom Clients

If you need a custom Supabase client with specific options:

```javascript
const { createSupabaseClient } = require('../../infra/db/supabaseClient');

const customClient = createSupabaseClient({
  useServiceRole: true, // Use admin permissions
  url: 'custom-url',    // Custom URL
  key: 'custom-key'     // Custom API key
});
``` 