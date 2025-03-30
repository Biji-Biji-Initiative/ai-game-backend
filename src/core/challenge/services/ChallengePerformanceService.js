import { createErrorMapper, withServiceErrorHandling } from "../../infra/errors/errorStandardization.js";
import { ChallengeError } from "../errors/ChallengeErrors.js";
'use strict';
/**
 * Service for handling challenge performance analysis
 */
class ChallengePerformanceService {
    /**
     * Create a new ChallengePerformanceService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.challengeRepository - Repository for challenges
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies = {}) {
        const { challengeRepository, logger } = dependencies;
        if (!challengeRepository) {
            throw new Error('challengeRepository is required for ChallengePerformanceService');
        }
        this.challengeRepository = challengeRepository;
        this.logger = logger || console;
        // Create error mapper for standardized error handling
        const errorMapper = createErrorMapper({
            'Error': ChallengeError
        }, ChallengeError);
        // Apply standardized error handling to methods
        this.calculatePerformanceMetrics = withServiceErrorHandling(this.calculatePerformanceMetrics.bind(this), { methodName: 'calculatePerformanceMetrics', domainName: 'challenge', logger: this.logger, errorMapper });
        this.analyzeProgressTrend = withServiceErrorHandling(this.analyzeProgressTrend.bind(this), { methodName: 'analyzeProgressTrend', domainName: 'challenge', logger: this.logger, errorMapper });
    }
    /**
     * Calculate user performance metrics from challenge history
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Performance metrics
     */
    async calculatePerformanceMetrics(userId) {
        if (!userId) {
            throw new Error('User ID is required for performance metrics calculation');
        }
        // Get user's challenge history
        const challengeHistory = await this.challengeRepository.getUserChallengeHistory(userId);
        if (!challengeHistory || challengeHistory.length === 0) {
            return {
                completedChallenges: 0,
                averageScore: 0,
                strengthAreas: [],
                improvementAreas: [],
                streaks: {
                    current: 0,
                    longest: 0
                }
            };
        }
        // Calculate basic metrics
        const completedChallenges = challengeHistory.filter(c => c.status === 'completed').length;
        // Calculate average score
        const scores = challengeHistory
            .filter(c => c.status === 'completed' && c.score !== undefined)
            .map(c => c.score);
        const averageScore = scores.length > 0
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : 0;
        // Identify strength and improvement areas based on trait scores
        const traitScores = {};
        // Collect all trait scores from evaluations
        challengeHistory
            .filter(c => c.evaluation && c.evaluation.traitScores)
            .forEach(challenge => {
            Object.entries(challenge.evaluation.traitScores).forEach(([trait, score]) => {
                if (!traitScores[trait]) {
                    traitScores[trait] = [];
                }
                traitScores[trait].push(score);
            });
        });
        // Calculate average for each trait
        const traitAverages = {};
        Object.entries(traitScores).forEach(([trait, scores]) => {
            traitAverages[trait] = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        });
        // Sort traits by average score
        const sortedTraits = Object.entries(traitAverages)
            .sort((a, b) => b[1] - a[1])
            .map(([trait, _]) => trait);
        // Top 3 traits are strengths, bottom 3 are improvement areas
        const strengthAreas = sortedTraits.slice(0, 3);
        const improvementAreas = sortedTraits.slice(-3).reverse();
        // Calculate streaks
        let currentStreak = 0;
        let longestStreak = 0;
        // Sort challenges by date
        const sortedChallenges = [...challengeHistory]
            .filter(c => c.completedAt)
            .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
        // Calculate streaks (consecutive days with completed challenges)
        if (sortedChallenges.length > 0) {
            let lastDate = null;
            sortedChallenges.forEach(challenge => {
                const challengeDate = new Date(challenge.completedAt).toDateString();
                if (lastDate === null) {
                    // First challenge
                    currentStreak = 1;
                    longestStreak = 1;
                }
                else if (challengeDate === lastDate) {
                    // Same day, don't count as streak
                }
                else {
                    // Check if it's the next day
                    const lastDateObj = new Date(lastDate);
                    const challengeDateObj = new Date(challengeDate);
                    const dayDiff = Math.floor((challengeDateObj - lastDateObj) / (24 * 60 * 60 * 1000));
                    if (dayDiff === 1) {
                        // Consecutive day
                        currentStreak++;
                        longestStreak = Math.max(longestStreak, currentStreak);
                    }
                    else {
                        // Streak broken
                        currentStreak = 1;
                    }
                }
                lastDate = challengeDate;
            });
        }
        return {
            completedChallenges,
            averageScore,
            strengthAreas,
            improvementAreas,
            streaks: {
                current: currentStreak,
                longest: longestStreak
            }
        };
    }
    /**
     * Analyze user progress over time
     * @param {string} userId - User ID
     * @param {number} timeWindow - Time window in days to analyze
     * @returns {Promise<Object>} Progress analysis
     */
    async analyzeProgressTrend(userId, timeWindow = 30) {
        if (!userId) {
            throw new Error('User ID is required for progress trend analysis');
        }
        // Get user's challenge history
        const challengeHistory = await this.challengeRepository.getUserChallengeHistory(userId);
        if (!challengeHistory || challengeHistory.length < 2) {
            return {
                trend: 'insufficient-data',
                improvement: 0,
                recentAverage: 0,
                previousAverage: 0
            };
        }
        // Sort challenges by completion date
        const sortedChallenges = [...challengeHistory]
            .filter(c => c.status === 'completed' && c.score !== undefined && c.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)); // Newest first
        if (sortedChallenges.length < 2) {
            return {
                trend: 'insufficient-data',
                improvement: 0,
                recentAverage: sortedChallenges.length ? sortedChallenges[0].score : 0,
                previousAverage: 0
            };
        }
        // Get current date
        const now = new Date();
        // Filter recent challenges (within timeWindow days)
        const recentChallenges = sortedChallenges.filter(challenge => {
            const completedDate = new Date(challenge.completedAt);
            const daysDiff = Math.floor((now - completedDate) / (24 * 60 * 60 * 1000));
            return daysDiff <= timeWindow;
        });
        // Filter previous period challenges (previous timeWindow days)
        const previousChallenges = sortedChallenges.filter(challenge => {
            const completedDate = new Date(challenge.completedAt);
            const daysDiff = Math.floor((now - completedDate) / (24 * 60 * 60 * 1000));
            return daysDiff > timeWindow && daysDiff <= (timeWindow * 2);
        });
        // Calculate averages
        const recentAverage = recentChallenges.length > 0
            ? Math.round(recentChallenges.reduce((sum, c) => sum + c.score, 0) / recentChallenges.length)
            : 0;
        const previousAverage = previousChallenges.length > 0
            ? Math.round(previousChallenges.reduce((sum, c) => sum + c.score, 0) / previousChallenges.length)
            : 0;
        // Calculate improvement
        const improvement = previousAverage > 0
            ? Math.round(((recentAverage - previousAverage) / previousAverage) * 100)
            : 0;
        // Determine trend
        let trend;
        if (improvement >= 10) {
            trend = 'significant-improvement';
        }
        else if (improvement > 0) {
            trend = 'slight-improvement';
        }
        else if (improvement === 0) {
            trend = 'stable';
        }
        else if (improvement > -10) {
            trend = 'slight-decline';
        }
        else {
            trend = 'significant-decline';
        }
        return {
            trend,
            improvement,
            recentAverage,
            previousAverage
        };
    }
}
export default ChallengePerformanceService;
