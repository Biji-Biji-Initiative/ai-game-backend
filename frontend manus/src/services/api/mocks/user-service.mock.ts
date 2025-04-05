import { ApiResponse } from '../interfaces/api-client';
import { User, FocusArea, HumanEdgeProfile, HumanEdgeTraits, FormattedHumanEdgeTrait } from '../interfaces/models';
import { UserService } from '../interfaces/services';

/**
 * Mock implementation of the UserService
 */
export class MockUserService implements UserService {
  private users: User[] = [
    {
      id: '1',
      email: 'user1@example.com',
      fullName: 'User One',
      displayName: 'User One',
      professionalTitle: 'Software Developer',
      status: 'active',
      roles: ['user'],
      onboardingCompleted: true,
      isActive: true,
      hasCompletedProfile: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }
  ];

  private focusAreas: FocusArea[] = [
    {
      id: '1',
      name: 'Critical Thinking',
      description: 'Enhance your ability to analyze and evaluate information.',
      traits: ['analytical', 'logical', 'problem-solving']
    },
    {
      id: '2',
      name: 'Communication',
      description: 'Improve your ability to express ideas clearly.',
      traits: ['verbal', 'persuasive', 'articulate']
    },
    {
      id: '3',
      name: 'Creativity',
      description: 'Strengthen your ability to generate innovative ideas.',
      traits: ['imaginative', 'original', 'innovative']
    }
  ];

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const user = this.users[0];
    return {
      data: user,
      error: null,
      status: 200,
      ok: true
    };
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    const user = this.users.find(u => u.id === id);
    return {
      data: user,
      error: user ? null : { message: 'User not found' },
      status: user ? 200 : 404,
      ok: !!user
    };
  }

  async updateUser(user: Partial<User>): Promise<ApiResponse<User>> {
    const index = this.users.findIndex(u => u.id === user.id);
    if (index === -1) {
      return {
        data: null,
        error: { message: 'User not found' },
        status: 404,
        ok: false
      };
    }

    this.users[index] = {
      ...this.users[index],
      ...user,
      updatedAt: new Date().toISOString()
    };

    return {
      data: this.users[index],
      error: null,
      status: 200,
      ok: true
    };
  }

  async createSession(): Promise<ApiResponse<void>> {
    return {
      data: undefined,
      error: null,
      status: 200,
      ok: true
    };
  }

  async getRecommendedFocusAreas(): Promise<ApiResponse<FocusArea[]>> {
    // In a real implementation, this would recommend focus areas based on user traits
    return {
      data: this.focusAreas,
      error: null,
      status: 200,
      ok: true
    };
  }

  async saveUserFocus(focusId: string): Promise<ApiResponse<void>> {
    const user = this.users[0];
    if (!user) {
      return {
        data: null,
        error: { message: 'User not found' },
        status: 404,
        ok: false
      };
    }

    // In a real implementation, we would save the focus area to the user's profile
    user.focusArea = focusId;
    user.updatedAt = new Date().toISOString();
    
    return {
      data: undefined,
      error: null,
      status: 200,
      ok: true
    };
  }

  async saveUserTraits(traits: Record<string, number>): Promise<ApiResponse<void>> {
    const user = this.users[0];
    if (!user) {
      return {
        data: null,
        error: { message: 'User not found' },
        status: 404,
        ok: false
      };
    }

    // In a real implementation, we would save the traits to the user's profile
    // Store traits in user metadata or a separate user traits table
    user.updatedAt = new Date().toISOString();
    
    // Log the traits for debugging purposes
    console.log('Saving user traits:', traits);
    
    return {
      data: undefined,
      error: null,
      status: 200,
      ok: true
    };
  }

  async getHumanEdgeProfile(): Promise<ApiResponse<HumanEdgeProfile>> {
    const user = this.users[0];
    if (!user) {
      return {
        data: null,
        error: { message: 'User not found' },
        status: 404,
        ok: false
      };
    }

    // In a real implementation, this would generate a profile based on user data
    // First define raw traits data as it might come from the API
    const rawTraits: HumanEdgeTraits = {
      analytical: 85,
      logical: 90,
      problemSolving: 88,
      verbal: 75,
      persuasive: 70,
      articulate: 72,
      imaginative: 80,
      original: 82,
      innovative: 84
    };
    
    // Convert raw traits to formatted traits for UI components
    const formattedTraits: FormattedHumanEdgeTrait[] = [
      { name: 'Analytical', score: rawTraits.analytical, description: 'Ability to analyze complex situations' },
      { name: 'Logical', score: rawTraits.logical, description: 'Ability to apply logical reasoning' },
      { name: 'Problem Solving', score: rawTraits.problemSolving, description: 'Ability to solve complex problems' },
      { name: 'Verbal', score: rawTraits.verbal, description: 'Verbal communication skills' },
      { name: 'Persuasive', score: rawTraits.persuasive, description: 'Ability to persuade others' },
      { name: 'Articulate', score: rawTraits.articulate, description: 'Ability to express ideas clearly' },
      { name: 'Imaginative', score: rawTraits.imaginative, description: 'Creative imagination' },
      { name: 'Original', score: rawTraits.original, description: 'Original thinking' },
      { name: 'Innovative', score: rawTraits.innovative, description: 'Innovative approach to problems' }
    ];
    
    const profile: HumanEdgeProfile = {
      id: '1',
      userId: user.id,
      focusArea: this.focusAreas[0],
      traits: formattedTraits,
      insights: [
        'Strong analytical skills',
        'Excellent problem-solving ability',
        'Good verbal communication'
      ],
      strengthAreas: [
        {
          name: 'Critical Thinking',
          description: 'Exceptional ability to analyze complex information',
          score: 88
        },
        {
          name: 'Problem Solving',
          description: 'High proficiency in finding solutions',
          score: 85
        }
      ],
      shareableUrl: 'https://example.com/profile/1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      data: profile,
      error: null,
      status: 200,
      ok: true
    };
  }
}
