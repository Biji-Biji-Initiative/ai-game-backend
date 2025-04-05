// Modify the existing directRoutes.js file to include the new routes

import { extendMountAllRoutes } from './routeExtensions.js';

// Add this code at the end of the mountAllRoutes function in directRoutes.js
// right before the "return true;" statement (around line 398)

// Mount new feature routes
extendMountAllRoutes(app, container, config, logger, apiRouter, isRouteRegistered, prefix);

// Then return true as before
