/**
 * Mock User Data
 * 
 * Provides mock user data for the frontend implementation.
 */

import { UserProfile } from "../../services/userService";

// Mock users for development and testing
export const mockUsers: UserProfile[] = [
  {
    id: 'usr_001',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=usr_001',
    bio: 'AI enthusiast and tech professional with a passion for innovative solutions.',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-03-18T15:30:00Z'
  },
  {
    id: 'usr_002',
    name: 'Jamie Smith',
    email: 'jamie@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=usr_002',
    bio: 'Exploring the intersection of creativity and artificial intelligence.',
    createdAt: '2024-01-20T10:15:00Z',
    updatedAt: '2024-03-20T09:45:00Z'
  },
  {
    id: 'usr_003',
    name: 'Taylor Wilson',
    email: 'taylor@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=usr_003',
    bio: 'Product designer focused on AI-driven user experiences.',
    createdAt: '2024-02-05T14:30:00Z',
    updatedAt: '2024-03-19T16:20:00Z'
  },
  {
    id: 'usr_004',
    name: 'Jordan Rivera',
    email: 'jordan@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=usr_004',
    bio: 'Software developer with expertise in machine learning and natural language processing.',
    createdAt: '2024-02-12T09:00:00Z',
    updatedAt: '2024-03-21T11:10:00Z'
  },
  {
    id: 'usr_005',
    name: 'Casey Morgan',
    email: 'casey@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=usr_005',
    bio: 'Data scientist passionate about AI ethics and responsible innovation.',
    createdAt: '2024-02-18T16:45:00Z',
    updatedAt: '2024-03-17T14:30:00Z'
  }
];
