'use strict';

import { registerControllerComponents } from './controllers-extension.js';
import { registerCoordinatorComponents } from './coordinators-extension.js';
import { registerServiceComponents } from './services-extension.js';
import { registerRepositoryComponents } from './repositories-extension.js';
import { registerAIComponents } from './ai-extension.js';

/**
 * Update the container registration to include the new components
 * This file provides instructions on how to modify the existing container files
 */

// 1. Modify src/config/container/controllers.js to include the new controllers
// Add this import at the top:
// import { registerControllerComponents as registerExtendedControllerComponents } from './controllers-extension.js';

// Then add this line at the end of the registerControllerComponents function:
// registerExtendedControllerComponents(container, logger);

// 2. Modify src/config/container/coordinators.js to include the new coordinators
// Add this import at the top:
// import { registerCoordinatorComponents as registerExtendedCoordinatorComponents } from './coordinators-extension.js';

// Then add this line at the end of the registerCoordinatorComponents function:
// registerExtendedCoordinatorComponents(container, logger);

// 3. Modify src/config/container/services.js to include the new services
// Add this import at the top:
// import { registerServiceComponents as registerExtendedServiceComponents } from './services-extension.js';

// Then add this line at the end of the registerServiceComponents function:
// registerExtendedServiceComponents(container, logger);

// 4. Modify src/config/container/repositories.js to include the new repositories
// Add this import at the top:
// import { registerRepositoryComponents as registerExtendedRepositoryComponents } from './repositories-extension.js';

// Then add this line at the end of the registerRepositoryComponents function:
// registerExtendedRepositoryComponents(container, logger);

// 5. Modify src/config/container/ai.js to include the new AI components
// Add this import at the top:
// import { registerAIComponents as registerExtendedAIComponents } from './ai-extension.js';

// Then add this line at the end of the registerAIComponents function:
// registerExtendedAIComponents(container, logger);
