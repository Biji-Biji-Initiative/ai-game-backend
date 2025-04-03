'use client';

import { useState } from 'react';
import { ChallengeList } from '@/components/challenges/challenge-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetChallenges } from '@/services/api/services/challengeService';

export default function ChallengeBrowserPage() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Get all challenges
  const { data: challengesResponse, isLoading } = useGetChallenges();
  
  // Extract all available tags from challenges
  const allTags = challengesResponse?.success && challengesResponse.data 
    ? Array.from(
        new Set(
          challengesResponse.data.flatMap(challenge => challenge.tags)
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
  
  // Get challenges from the response
  const allChallenges = challengesResponse?.success && challengesResponse.data 
    ? challengesResponse.data 
    : [];
  
  // Filter challenges
  const filteredChallenges = allChallenges.filter(challenge => {
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply difficulty filter
    const matchesDifficulty = difficultyFilter === '' || 
      challenge.difficulty === difficultyFilter;
    
    // Apply tags filter
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => challenge.tags.includes(tag));
    
    return matchesSearch && matchesDifficulty && matchesTags;
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
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
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
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
                {allTags.map(tag => (
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
    </div>
  );
}
