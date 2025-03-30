import userRoutes from "../../core/infra/http/routes/userRoutes.js";
import personalityRoutes from "../../core/infra/http/routes/personalityRoutes.js";
import progressRoutes from "../../core/infra/http/routes/progressRoutes.js";
import adaptiveRoutes from "../../core/infra/http/routes/adaptiveRoutes.js";
import focusAreaRoutes from "../../core/infra/http/routes/focusAreaRoutes.js";
import challengeRoutes from "../../core/infra/http/routes/challengeRoutes.js";
import evaluationRoutes from "../../core/infra/http/routes/evaluationRoutes.js";
import userJourneyRoutes from "../../core/infra/http/routes/userJourneyRoutes.js";
// AI routes - temporarily disabled
// import aiChatRoutes from "../../routes/ai/aiChatRoutes.js";
// import aiAnalysisRoutes from "../../routes/ai/aiAnalysisRoutes.js";
import * as express from "express";
'use strict';
/**
 * Routes Registration
 *
 * This module registers all API routes in the DI container.
 */
/**
 * Register route components in the container
 * @param {DIContainer} container - The DI container
 */
function registerRouteComponents(container) {
    // Register route modules
    container.register('userRoutes', c => {
        return userRoutes(c.get('userController'));
    }, true);
    container.register('personalityRoutes', c => {
        return personalityRoutes(c.get('personalityController'));
    }, true);
    container.register('progressRoutes', c => {
        return progressRoutes(c.get('progressController'));
    }, true);
    container.register('adaptiveRoutes', c => {
        return adaptiveRoutes(c.get('adaptiveController'));
    }, true);
    container.register('focusAreaRoutes', c => {
        return focusAreaRoutes(c.get('focusAreaController'));
    }, true);
    container.register('challengeRoutes', c => {
        return challengeRoutes(c.get('challengeController'));
    }, true);
    container.register('evaluationRoutes', c => {
        return evaluationRoutes(c.get('evaluationController'));
    }, true);
    container.register('userJourneyRoutes', c => {
        return userJourneyRoutes(c.get('userJourneyController'));
    }, true);
    // AI-related routes
    // container.register('aiChatRoutes', c => {
    //     return aiChatRoutes(c.get('aiChatController'));
    // }, true);
    // container.register('aiAnalysisRoutes', c => {
    //     return aiAnalysisRoutes(c.get('aiAnalysisController'));
    // }, true);
    // Register root routes that consolidate all route modules
    container.register('apiRoutes', c => {
        const router = express.Router();
        // Mount domain-specific routes
        router.use('/users', c.get('userRoutes'));
        router.use('/personalities', c.get('personalityRoutes'));
        router.use('/progress', c.get('progressRoutes'));
        router.use('/adaptive', c.get('adaptiveRoutes'));
        router.use('/focus-areas', c.get('focusAreaRoutes'));
        router.use('/challenges', c.get('challengeRoutes'));
        router.use('/evaluations', c.get('evaluationRoutes'));
        router.use('/user-journey', c.get('userJourneyRoutes'));
        // Mount AI-related routes
        // router.use('/ai/chat', c.get('aiChatRoutes'));
        // router.use('/ai/analysis', c.get('aiAnalysisRoutes'));
        return router;
    }, true);
}
export { registerRouteComponents };
export default {
    registerRouteComponents
};
