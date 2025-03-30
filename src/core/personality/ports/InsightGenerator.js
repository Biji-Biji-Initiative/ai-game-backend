'use strict';
/**
 * Insight Generator Port
 *
 * This interface defines the contract for generating insights from personality data.
 * It follows the port/adapter pattern to keep infrastructure details out of the domain.
 */
/**
 * @interface InsightGenerator
 */
class InsightGenerator {
    /**
     * Generate insights based on a personality profile
     * @param {import('../models/Personality')} profile - The personality profile
     * @returns {Promise<Object>} - Generated insights
     */
    /**
     * Method generateFor
     */
    generateFor(profile) {
        throw new Error('Method not implemented');
    }
}
export default InsightGenerator;
