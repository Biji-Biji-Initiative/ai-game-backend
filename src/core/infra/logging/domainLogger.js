import { Logger } from "./logger.js";
'use strict';
// Create domain-specific loggers
const userLogger = new Logger('domain:user');
const personalityLogger = new Logger('domain:personality');
const challengeLogger = new Logger('domain:challenge');
const evaluationLogger = new Logger('domain:evaluation');
const focusAreaLogger = new Logger('domain:focusArea');
const progressLogger = new Logger('domain:progress');
const adaptiveLogger = new Logger('domain:adaptive');
const userJourneyLogger = new Logger('domain:userJourney');
const traitsAnalysisLogger = new Logger('domain:personality:traitsAnalysis');
// Create infrastructure loggers
const infraLogger = new Logger('infra');
const httpLogger = new Logger('infra:http');
const dbLogger = new Logger('infra:db');
const apiLogger = new Logger('infra:api');
const eventsLogger = new Logger('infra:events');
// Create application-level logger
const appLogger = new Logger('app');
export { userLogger };
export { personalityLogger };
export { challengeLogger };
export { evaluationLogger };
export { focusAreaLogger };
export { progressLogger };
export { adaptiveLogger };
export { userJourneyLogger };
export { traitsAnalysisLogger };
export { infraLogger };
export { httpLogger };
export { dbLogger };
export { apiLogger };
export { eventsLogger };
export { appLogger };
export default {
    userLogger,
    personalityLogger,
    challengeLogger,
    evaluationLogger,
    focusAreaLogger,
    progressLogger,
    adaptiveLogger,
    userJourneyLogger,
    traitsAnalysisLogger,
    infraLogger,
    httpLogger,
    dbLogger,
    apiLogger,
    eventsLogger,
    appLogger
};
