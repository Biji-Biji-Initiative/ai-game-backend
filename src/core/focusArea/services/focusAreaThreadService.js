/**
 * DEPRECATED: This file has been relocated to the application layer.
 * 
 * The FocusAreaThreadService has been moved to:
 * /src/application/focusArea/services/FocusAreaThreadService.js
 * 
 * This was done as part of JIRA-18 to follow clean architecture principles.
 * The service now uses the Ports & Adapters pattern with:
 * - Port: /src/core/focusArea/ports/FocusAreaThreadStatePort.js
 * - Adapter: /src/core/infra/openai/adapters/FocusAreaThreadStateAdapter.js
 * 
 * Please update your imports to use the new file location.
 */

import FocusAreaThreadService from "@/application/focusArea/services/FocusAreaThreadService.js";

console.warn('DEPRECATED: FocusAreaThreadService is now in the application layer. Please update your imports.');

// Re-export the new implementation for backward compatibility
export default FocusAreaThreadService;