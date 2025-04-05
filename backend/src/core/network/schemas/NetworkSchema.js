import { z } from "zod";
'use strict';

/**
 * Schema for cognitive domains
 * Defines the different types of cognitive abilities
 */
const cognitiveDomainEnum = z.enum([
  'memory',
  'creativity',
  'logic',
  'pattern',
  'speed'
]).describe('Type of cognitive ability');

/**
 * Schema for network nodes
 * Represents individual cognitive abilities in the neural network
 */
const networkNodeSchema = z
  .object({
    id: z
      .string()
      .uuid('Node ID must be a valid UUID format')
      .describe('Unique identifier for the node'),
    name: z
      .string()
      .min(1, 'Node name is required and cannot be empty')
      .max(100, 'Node name cannot exceed 100 characters')
      .describe('Name of the cognitive ability'),
    description: z
      .string()
      .min(1, 'Description is required and cannot be empty')
      .max(500, 'Description cannot exceed 500 characters')
      .describe('Description of the cognitive ability'),
    level: z
      .number()
      .int('Level must be a whole number')
      .min(1, 'Level must be at least 1')
      .max(10, 'Level cannot exceed 10')
      .describe('Current level of this ability (1-10 scale)'),
    domain: cognitiveDomainEnum,
    position: z
      .object({
        x: z
          .number()
          .min(0, 'X position must be at least 0')
          .max(100, 'X position cannot exceed 100')
          .describe('Horizontal position as percentage (0-100)'),
        y: z
          .number()
          .min(0, 'Y position must be at least 0')
          .max(100, 'Y position cannot exceed 100')
          .describe('Vertical position as percentage (0-100)'),
      })
      .describe('Position of the node in the visualization'),
    connections: z
      .array(z.string().uuid('Connection ID must be a valid UUID format'))
      .describe('IDs of connected nodes'),
    unlocked: z
      .boolean()
      .default(false)
      .describe('Whether this node has been unlocked'),
    progress: z
      .number()
      .min(0, 'Progress must be at least 0')
      .max(100, 'Progress cannot exceed 100')
      .default(0)
      .describe('Progress towards next level (0-100 percentage)'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe('Additional metadata for this node'),
  })
  .strict();

/**
 * Schema for network connections
 * Represents relationships between cognitive abilities
 */
const networkConnectionSchema = z
  .object({
    source: z
      .string()
      .uuid('Source node ID must be a valid UUID format')
      .describe('ID of the source node'),
    target: z
      .string()
      .uuid('Target node ID must be a valid UUID format')
      .describe('ID of the target node'),
    strength: z
      .number()
      .min(0, 'Strength must be at least 0')
      .max(1, 'Strength cannot exceed 1')
      .describe('Strength of the connection (0-1 scale)'),
    active: z
      .boolean()
      .default(false)
      .describe('Whether this connection is active'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe('Additional metadata for this connection'),
  })
  .strict();

/**
 * Main Neural Network schema
 * Comprehensive validation for neural network entities
 */
const NetworkSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user this network belongs to'),
    nodes: z
      .array(networkNodeSchema)
      .min(1, 'At least one node is required')
      .describe('Cognitive ability nodes in the network'),
    connections: z
      .array(networkConnectionSchema)
      .default([])
      .describe('Connections between nodes'),
    overallLevel: z
      .number()
      .min(1, 'Overall level must be at least 1')
      .max(10, 'Overall level cannot exceed 10')
      .describe('Overall cognitive level (1-10 scale)'),
    lastUpdated: z
      .string()
      .datetime('Last updated must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('When the network was last updated'),
    createdAt: z
      .string()
      .datetime('Created at must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('Creation timestamp'),
    updatedAt: z
      .string()
      .datetime('Updated at must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('Last update timestamp'),
  })
  .strict();

/**
 * Schema for network statistics
 * Provides analytics about the neural network
 */
const networkStatsSchema = z
  .object({
    totalNodes: z
      .number()
      .int('Total nodes must be a whole number')
      .nonnegative('Total nodes cannot be negative')
      .describe('Total number of nodes in the network'),
    unlockedNodes: z
      .number()
      .int('Unlocked nodes must be a whole number')
      .nonnegative('Unlocked nodes cannot be negative')
      .describe('Number of unlocked nodes'),
    averageNodeLevel: z
      .number()
      .min(0, 'Average node level must be at least 0')
      .max(10, 'Average node level cannot exceed 10')
      .describe('Average level across all nodes'),
    dominantDomain: cognitiveDomainEnum
      .describe('Cognitive domain with highest average level'),
    weakestDomain: cognitiveDomainEnum
      .describe('Cognitive domain with lowest average level'),
    totalConnections: z
      .number()
      .int('Total connections must be a whole number')
      .nonnegative('Total connections cannot be negative')
      .describe('Total number of connections in the network'),
    activeConnections: z
      .number()
      .int('Active connections must be a whole number')
      .nonnegative('Active connections cannot be negative')
      .describe('Number of active connections'),
    networkDensity: z
      .number()
      .min(0, 'Network density must be at least 0')
      .max(1, 'Network density cannot exceed 1')
      .describe('Ratio of actual to possible connections'),
  })
  .strict();

/**
 * Schema for network progress
 * Tracks changes in the neural network over time
 */
const networkProgressSchema = z
  .object({
    previousLevel: z
      .number()
      .min(1, 'Previous level must be at least 1')
      .max(10, 'Previous level cannot exceed 10')
      .describe('Previous overall cognitive level'),
    currentLevel: z
      .number()
      .min(1, 'Current level must be at least 1')
      .max(10, 'Current level cannot exceed 10')
      .describe('Current overall cognitive level'),
    levelProgress: z
      .number()
      .min(0, 'Level progress must be at least 0')
      .max(100, 'Level progress cannot exceed 100')
      .describe('Progress towards next level (0-100 percentage)'),
    recentlyUnlockedNodes: z
      .array(networkNodeSchema)
      .default([])
      .describe('Nodes that were recently unlocked'),
    recentlyActivatedConnections: z
      .array(networkConnectionSchema)
      .default([])
      .describe('Connections that were recently activated'),
    timestamp: z
      .string()
      .datetime('Timestamp must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('When this progress was recorded'),
  })
  .strict();

/**
 * Schema for network update parameters
 * Used when updating the network after game results
 */
const networkUpdateSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user whose network to update'),
    challengeResults: z
      .object({
        challengeId: z
          .string()
          .uuid('Challenge ID must be a valid UUID format')
          .describe('ID of the completed challenge'),
        score: z
          .number()
          .min(0, 'Score must be at least 0')
          .max(100, 'Score cannot exceed 100')
          .describe('Overall score for the challenge'),
        domainScores: z
          .record(z.number().min(0).max(100))
          .describe('Scores for each cognitive domain'),
        completionTime: z
          .number()
          .positive('Completion time must be positive')
          .describe('Time taken to complete the challenge in seconds'),
      })
      .describe('Results from the completed challenge'),
  })
  .strict();

export { NetworkSchema };
export { networkNodeSchema };
export { networkConnectionSchema };
export { networkStatsSchema };
export { networkProgressSchema };
export { networkUpdateSchema };
export { cognitiveDomainEnum };
export default {
  NetworkSchema,
  networkNodeSchema,
  networkConnectionSchema,
  networkStatsSchema,
  networkProgressSchema,
  networkUpdateSchema,
  cognitiveDomainEnum
};
