import { logger } from "../../core/infra/logging/logger.js";
'use strict';

/**
 * UserDashboardReadModel
 * 
 * Provides a read-optimized model for user dashboards that combines data 
 * from multiple aggregates. This is a dedicated implementation of the 
 * Complex Cross-Domain Query pattern from our cross-aggregate query strategy.
 */
class UserDashboardReadModel {
    /**
     * Create a new UserDashboardReadModel
     * @param {Object} dependencies - The dependencies for this read model
     * @param {Object} dependencies.userRepository - Repository for user data access
     * @param {Object} dependencies.challengeRepository - Repository for challenge data access
     * @param {Object} dependencies.progressRepository - Repository for progress data access
     * @param {Object} dependencies.personalityRepository - Repository for personality data access
     * @param {Object} dependencies.cacheService - Optional cache service for performance optimization
     */
    constructor({ 
        userRepository, 
        challengeRepository, 
        progressRepository, 
        personalityRepository,
        cacheService,
    }) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.progressRepository = progressRepository;
        this.personalityRepository = personalityRepository;
        this.cacheService = cacheService;
        this.logger = logger.child({ component: 'UserDashboardReadModel' });
    }

    /**
     * Get a complete user dashboard with data from multiple aggregates
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Dashboard data combining multiple aggregates
     */
    async getUserDashboard(userId) {
        try {
            this.logger.debug('Fetching user dashboard data', { userId });
            
            // Check cache first if available
            if (this.cacheService) {
                const cachedDashboard = await this.cacheService.get(`dashboard:${userId}`);
                if (cachedDashboard) {
                    this.logger.debug('Returning cached dashboard data', { userId });
                    return cachedDashboard;
                }
            }

            // Fetch data from multiple repositories in parallel
            const [user, challenges, progress, personality] = await Promise.all([
                this.userRepository.findById(userId, true),
                this.challengeRepository.findRecentByUserId(userId, 5),
                this.progressRepository.findByUserId(userId),
                this.personalityRepository.findByUserId(userId)
            ]);

            // Compose the dashboard data structure
            const dashboard = {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    professionalTitle: user.professionalTitle,
                    location: user.location,
                    lastActive: user.lastActive,
                    focusArea: user.focusArea,
                    onboardingCompleted: user.onboardingCompleted
                },
                challenges: {
                    recent: challenges.map(challenge => ({
                        id: challenge.id,
                        title: challenge.title,
                        status: challenge.status,
                        createdAt: challenge.createdAt,
                        score: challenge.score,
                        type: challenge.challengeType,
                        difficulty: challenge.difficulty
                    })),
                    count: {
                        total: progress?.completedChallenges?.length || 0,
                        completed: progress?.completedChallenges?.filter(c => c.status === 'completed')?.length || 0,
                        inProgress: progress?.completedChallenges?.filter(c => c.status === 'in_progress')?.length || 0
                    }
                },
                progress: progress ? {
                    skillLevels: progress.skillLevels || {},
                    statistics: progress.statistics || {
                        totalChallenges: 0,
                        averageScore: 0,
                        highestScore: 0,
                        averageCompletionTime: 0,
                        streakDays: 0
                    },
                    strengths: progress.strengths || [],
                    weaknesses: progress.weaknesses || []
                } : {
                    skillLevels: {},
                    statistics: {
                        totalChallenges: 0,
                        averageScore: 0,
                        highestScore: 0,
                        averageCompletionTime: 0,
                        streakDays: 0
                    },
                    strengths: [],
                    weaknesses: []
                },
                personality: personality ? {
                    dominantTraits: personality.dominantTraits || [],
                    aiAttitudeProfile: personality.aiAttitudeProfile || {},
                    insights: personality.insights || {}
                } : {
                    dominantTraits: [],
                    aiAttitudeProfile: {},
                    insights: {}
                }
            };

            // Cache result if cache service is available
            if (this.cacheService) {
                await this.cacheService.set(`dashboard:${userId}`, dashboard, 300); // 5 minute cache
            }

            return dashboard;
        } catch (error) {
            this.logger.error('Error fetching user dashboard', {
                userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get a lightweight user profile with minimal cross-aggregate data
     * Optimized for cases where full dashboard data is not needed
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Lightweight user profile
     */
    async getLightweightUserProfile(userId) {
        try {
            this.logger.debug('Fetching lightweight user profile', { userId });
            
            // Check cache first if available
            if (this.cacheService) {
                const cachedProfile = await this.cacheService.get(`profile:${userId}`);
                if (cachedProfile) {
                    return cachedProfile;
                }
            }

            // Fetch only necessary data
            const user = await this.userRepository.findById(userId, true);
            
            const profile = {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                professionalTitle: user.professionalTitle,
                focusArea: user.focusArea,
                lastActive: user.lastActive
            };

            // Cache result if cache service is available
            if (this.cacheService) {
                await this.cacheService.set(`profile:${userId}`, profile, 600); // 10 minute cache
            }

            return profile;
        } catch (error) {
            this.logger.error('Error fetching lightweight user profile', {
                userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

export default UserDashboardReadModel; 