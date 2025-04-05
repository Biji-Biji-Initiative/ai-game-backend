'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/components/ui/api-error';
import { UIChallenge } from '@/types/api';
import { ChallengeList } from '@/components/challenges/challenge-list';
import { Search, Filter, X } from 'lucide-react';

// Define the Challenge type for this component
type Challenge = UIChallenge;

// Mock data for challenges
const mockChallenges: Challenge[] = [
  {
    id: 'c1',
    title: 'AI Ethics in Healthcare',
    description: 'Explore the ethical implications of AI in medical diagnosis and treatment planning.',
    difficulty: 'intermediate',
    category: 'Ethics',
    estimatedTime: '25 min',
    matchScore: 92,
    tags: ['healthcare', 'ethics', 'decision-making'],
    content: 'Explore the ethical implications of AI in medical diagnosis and treatment planning.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    userEmail: 'demo@example.com',
    challengeType: 'Standard',
    formatType: 'Text'
  },
  {
    id: 'c2',
    title: 'Creative Collaboration with AI',
    description: 'Learn techniques for effective human-AI collaboration in creative fields.',
    difficulty: 'beginner',
    category: 'Creativity',
    estimatedTime: '15 min',
    matchScore: 88,
    tags: ['creativity', 'collaboration', 'art'],
    content: 'Learn techniques for effective human-AI collaboration in creative fields.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    userEmail: 'demo@example.com',
    challengeType: 'Standard',
    formatType: 'Text'
  },
  {
    id: 'c3',
    title: 'Critical Analysis of AI-Generated Content',
    description: 'Develop skills to critically evaluate and improve AI-generated content.',
    difficulty: 'advanced',
    category: 'Critical Thinking',
    estimatedTime: '40 min',
    matchScore: 85,
    tags: ['content', 'analysis', 'critical-thinking'],
    content: 'Develop skills to critically evaluate and improve AI-generated content.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    userEmail: 'demo@example.com',
    challengeType: 'Advanced',
    formatType: 'Text'
  },
  {
    id: 'c4',
    title: 'AI in Education',
    description: 'Examine how AI is transforming education and how humans can adapt.',
    difficulty: 'intermediate',
    category: 'Education',
    estimatedTime: '30 min',
    matchScore: 78,
    tags: ['education', 'learning', 'teaching'],
    content: 'Examine how AI is transforming education and how humans can adapt.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    userEmail: 'demo@example.com',
    challengeType: 'Standard',
    formatType: 'Text'
  },
  {
    id: 'c5',
    title: 'Emotional Intelligence vs AI',
    description: 'Compare human emotional intelligence with AI capabilities in understanding emotions.',
    difficulty: 'beginner',
    category: 'Psychology',
    estimatedTime: '20 min',
    matchScore: 95,
    tags: ['emotions', 'psychology', 'empathy'],
    content: 'Compare human emotional intelligence with AI capabilities in understanding emotions.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    userEmail: 'demo@example.com',
    challengeType: 'Standard',
    formatType: 'Text'
  }
];

// Import ApiResponse type
import { ApiResponse } from '@/services/api/apiResponse';

// Export the filter interface for reuse in the hook
export interface ChallengeFilters {
  search?: string;
  difficulty?: string;
  category?: string;
  tag?: string;
  tags?: string[];
  sortBy?: string;
  sortDirection?: string;
  personalized?: boolean;
}

// Enhanced mock API hook with filter parameters
const useGetAllChallenges = (filters?: ChallengeFilters) => {
  return useQuery<ApiResponse<Challenge[]>, Error>({
    queryKey: ['allChallenges', filters], // Add filters to query key for automatic refetching
    queryFn: async () => {
      // Log the current filters
      console.log('Fetching challenges with filters:', filters);
      
      // Simulate API response with mock data
      // In a real implementation, these filters would be sent to the API
      // And the filtering would be done on the server
      return {
        data: mockChallenges,
        status: 200,
        success: true,
        error: undefined
      };
    }
  });
};

export default function ChallengeBrowser() {
  const router = useRouter();
  const { focus, personality, setGamePhase, setCurrentChallenge } = useGameStore(state => ({
    focus: state.focus,
    personality: state.personality,
    setGamePhase: state.setGamePhase,
    setCurrentChallenge: state.setCurrentChallenge
  }));
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Create a query filter object for the API
  const [queryFilters, setQueryFilters] = useState<ChallengeFilters>({});
  
  // Update queryFilters when user filter inputs change
  useEffect(() => {
    // Add a small delay to avoid too many requests while typing
    const timer = setTimeout(() => {
      const newFilters: ChallengeFilters = {};
      
      if (searchQuery) {
        newFilters.search = searchQuery;
      }
      
      if (difficultyFilter) {
        newFilters.difficulty = difficultyFilter;
      }
      
      if (selectedTags.length > 0) {
        newFilters.tags = selectedTags;
      }
      
      // Always sort by newest for now
      newFilters.sortBy = 'newest';
      newFilters.sortDirection = 'desc';
      
      setQueryFilters(newFilters);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, difficultyFilter, selectedTags]);
  
  // Get all challenges - now passing the filters that will be used server-side in the future
  const { 
    data: challenges, 
    isLoading, 
    error, 
    refetch 
  } = useGetAllChallenges(queryFilters);
  
  // Extract all available tags from challenges
  const allTags = challenges && challenges.data
    ? Array.from(
        new Set(
          challenges.data.flatMap((challenge: Challenge) => challenge.tags || [])
        )
      ).sort()
    : [];
  
  // Handle filter clearing
  const clearFilters = () => {
    setSearchQuery('');
    setDifficultyFilter('');
    setSelectedTags([]);
  };
  
  // Handle tag selection/deselection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Filter challenges - this will be removed once the server handles all filtering
  // For now, we still need it since the mock service returns all challenges
  const filteredChallenges = challenges && challenges.data 
    ? challenges.data.filter((challenge: Challenge) => {
      // Apply search filter
      const matchesSearch = searchQuery === '' || 
        (challenge.title && challenge.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (challenge.description && challenge.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Apply difficulty filter
      const matchesDifficulty = difficultyFilter === '' || 
        challenge.difficulty === difficultyFilter;
      
      // Apply tags filter
      const matchesTags = selectedTags.length === 0 || 
        (challenge.tags && selectedTags.every(tag => challenge.tags!.includes(tag)));
      
      return matchesSearch && matchesDifficulty && matchesTags;
    }) 
    : [];
  
  const handleStartChallenge = (challenge: Challenge) => {
    // Set the selected challenge in the game store
    setCurrentChallenge(challenge);
    
    // Navigate to Round 1 to start the challenge
    setGamePhase(GamePhase.ROUND1);
    router.push('/round1');
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Challenge Browser</h1>
        <p className="text-muted-foreground">
          Browse and filter challenges to enhance your human edge
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter Challenges</CardTitle>
          <CardDescription>
            Find the perfect challenge for your needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Difficulty filter */}
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Difficulty" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Difficulties</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={clearFilters} disabled={!searchQuery && !difficultyFilter && selectedTags.length === 0}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
          
          {/* Tags */}
          <div>
            <p className="text-sm font-medium mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag: string) => (
                <Badge 
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Available Challenges</h2>
        <div className="pb-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading challenges...</p>
            </div>
          ) : error ? (
            <div className="mb-4">
              <ApiError 
                error={error} 
                retry={() => refetch()} 
                title="Error Loading Challenges" 
              />
            </div>
          ) : filteredChallenges.length > 0 ? (
            <ChallengeList challenges={filteredChallenges} />
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-muted-foreground">No challenges match your filters.</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
