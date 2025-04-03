'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, GamePhase, Challenge as GameChallenge } from '@/store/useGameStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
// Use the Challenge type from the game store
type Challenge = GameChallenge;

// Mock data for challenges
const mockChallenges: Challenge[] = [
  {
    id: 'c1',
    title: 'AI Ethics in Healthcare',
    description: 'Explore the ethical implications of AI in medical diagnosis and treatment planning.',
    difficulty: 'Medium',
    category: 'Ethics',
    estimatedTime: '25 min',
    matchScore: 92,
    tags: ['healthcare', 'ethics', 'decision-making']
  },
  {
    id: 'c2',
    title: 'Creative Collaboration with AI',
    description: 'Learn techniques for effective human-AI collaboration in creative fields.',
    difficulty: 'Easy',
    category: 'Creativity',
    estimatedTime: '15 min',
    matchScore: 88,
    tags: ['creativity', 'collaboration', 'art']
  },
  {
    id: 'c3',
    title: 'Critical Analysis of AI-Generated Content',
    description: 'Develop skills to critically evaluate and improve AI-generated content.',
    difficulty: 'Hard',
    category: 'Critical Thinking',
    estimatedTime: '40 min',
    matchScore: 85,
    tags: ['content', 'analysis', 'critical-thinking']
  },
  {
    id: 'c4',
    title: 'AI in Education',
    description: 'Examine how AI is transforming education and how humans can adapt.',
    difficulty: 'Medium',
    category: 'Education',
    estimatedTime: '30 min',
    matchScore: 78,
    tags: ['education', 'learning', 'teaching']
  },
  {
    id: 'c5',
    title: 'Emotional Intelligence vs AI',
    description: 'Compare human emotional intelligence with AI capabilities in understanding emotions.',
    difficulty: 'Easy',
    category: 'Psychology',
    estimatedTime: '20 min',
    matchScore: 95,
    tags: ['emotions', 'psychology', 'empathy']
  }
];

// Import ApiResponse type
import { ApiResponse } from '@/services/api/apiResponse';

// Mock API hook for challenges
const useGetAllChallenges = () => {
  return useQuery<ApiResponse<Challenge[]>, Error>({
    queryKey: ['allChallenges'],
    queryFn: async () => {
      // Simulate API response using the new apiClient structure
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
  
  // State for filters and view mode
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('match');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPersonalized, setShowPersonalized] = useState<boolean>(true);
  
  // Fetch all challenges
  const challengesQuery = useGetAllChallenges();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  
  useEffect(() => {
    if (challengesQuery.data?.success && challengesQuery.data.data) {
      setChallenges(challengesQuery.data.data);
      setFilteredChallenges(challengesQuery.data.data);
    }
  }, [challengesQuery.data]);
  
  // Apply filters and sorting
  useEffect(() => {
    let result = [...challenges];
    
    // Filter personalized challenges if enabled
    if (showPersonalized && focus) {
      // Boost match scores based on user focus and personality
      result = result.map(challenge => {
        let boostScore = 0;
        
        // Boost based on focus area match
        if (challenge.category === focus.name) {
          boostScore += 15;
        }
        
        // Boost based on user traits
        const topTraits = personality.traits
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);
          
        topTraits.forEach(trait => {
          if (challenge.tags.some(tag => tag.toLowerCase().includes(trait.name.toLowerCase()))) {
            boostScore += 5;
          }
        });
        
        return {
          ...challenge,
          matchScore: Math.min(100, (challenge.matchScore || 70) + boostScore)
        };
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(
        challenge => 
          challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          challenge.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(challenge => challenge.difficulty === difficultyFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(challenge => challenge.category === categoryFilter);
    }
    
    // Apply tag filter
    if (tagFilter !== 'all') {
      result = result.filter(challenge => 
        challenge.tags.some(tag => tag.toLowerCase() === tagFilter.toLowerCase())
      );
    }
    
    // Apply sorting
    if (sortBy === 'match') {
      result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (sortBy === 'difficulty-asc') {
      const difficultyOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      result.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    } else if (sortBy === 'difficulty-desc') {
      const difficultyOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      result.sort((a, b) => difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]);
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    setFilteredChallenges(result);
  }, [challenges, searchTerm, difficultyFilter, categoryFilter, tagFilter, sortBy, showPersonalized, focus, personality.traits]);
  
  // Get unique categories and tags for filters
  const categories = Array.from(new Set(challenges.map(challenge => challenge.category)));
  const tags = Array.from(new Set(challenges.flatMap(challenge => challenge.tags)));
  
  const handleStartChallenge = (challenge: Challenge) => {
    // Set the selected challenge in the game store
    setCurrentChallenge(challenge);
    
    // Navigate to Round 1 to start the challenge
    setGamePhase(GamePhase.ROUND1);
    router.push('/round1');
  };
  
  return (
    <div className="space-y-6">
      {/* Main filters and view controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Explore Challenges</h2>
          <div className="flex items-center space-x-4">
            {/* Personalization toggle */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="personalization-toggle" className="text-sm">Personalized</Label>
              <Switch
                id="personalization-toggle"
                checked={showPersonalized}
                onCheckedChange={setShowPersonalized}
              />
            </div>

            {/* View mode toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-1">
              <button
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Best Match</SelectItem>
                <SelectItem value="difficulty-asc">Easiest First</SelectItem>
                <SelectItem value="difficulty-desc">Hardest First</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium pt-1">Tags:</span>
          <div 
            className={`px-3 py-1 text-sm rounded-full cursor-pointer ${tagFilter === 'all' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}
            onClick={() => setTagFilter('all')}
          >
            All
          </div>
          {tags.slice(0, 10).map(tag => (
            <div
              key={tag}
              className={`px-3 py-1 text-sm rounded-full cursor-pointer ${tagFilter === tag ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}
              onClick={() => setTagFilter(tag)}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-gray-500">
        {filteredChallenges.length} {filteredChallenges.length === 1 ? 'challenge' : 'challenges'} found
      </div>
      
      {/* Challenge grid/list view */}
      {filteredChallenges.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChallenges.map(challenge => (
              <Card key={challenge.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{challenge.title}</h3>
                    <Badge variant={
                      challenge.difficulty === 'Easy' ? 'outline' : 
                      challenge.difficulty === 'Medium' ? 'secondary' : 'destructive'
                    }>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                    {challenge.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {challenge.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className={`text-xs cursor-pointer ${tagFilter === tag ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300' : ''}`}
                        onClick={() => setTagFilter(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                    <span>{challenge.category}</span>
                    <span>~{challenge.estimatedTime}</span>
                    {challenge.matchScore && (
                      <span className={`flex items-center ${challenge.matchScore > 90 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {challenge.matchScore > 90 && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {challenge.matchScore}% match
                      </span>
                    )}
                  </div>
                  
                  <Button 
                    onClick={() => handleStartChallenge(challenge)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
                  >
                    Start Challenge
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChallenges.map(challenge => (
              <div key={challenge.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-7">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{challenge.title}</h3>
                    <Badge variant={
                      challenge.difficulty === 'Easy' ? 'outline' : 
                      challenge.difficulty === 'Medium' ? 'secondary' : 'destructive'
                    }>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {challenge.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {challenge.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className={`text-xs cursor-pointer ${tagFilter === tag ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300' : ''}`}
                        onClick={() => setTagFilter(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-12 sm:col-span-5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                    <span>Category: {challenge.category}</span>
                    <span>~{challenge.estimatedTime}</span>
                  </div>
                  
                  {challenge.matchScore && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Match Score</span>
                        <span className={challenge.matchScore > 90 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                          {challenge.matchScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full" 
                          style={{ width: `${challenge.matchScore}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => handleStartChallenge(challenge)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 mt-2"
                  >
                    Start Challenge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500 mb-4">No challenges match your filters</p>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setDifficultyFilter('all');
            setCategoryFilter('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
