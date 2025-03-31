import config from "@/config/config.js";
import { createContainer } from "@/config/container/index.js";
'use strict';
// Initialize the container with all application components
const container = createContainer(config);
export { container };
export default {
    container
};
