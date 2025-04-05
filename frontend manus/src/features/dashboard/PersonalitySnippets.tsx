'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export const PersonalitySnippets = () => {
  const { profile } = useGameStore(state => ({
    profile: state.profile,
  }));
  
  // Track which snippet is currently displayed
  const [currentSnippetIndex, setCurrentSnippetIndex] = useState(0);
  
  // Extract snippets from profile
  const snippets = profile?.snippets || [];
  
  // Show a different snippet
  const handleRefreshSnippet = () => {
    if (snippets.length > 1) {
      setCurrentSnippetIndex((prev) => 
        (prev + 1) % snippets.length
      );
    }
  };
  
  const currentSnippet = snippets[currentSnippetIndex];
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Brain className="mr-2 h-5 w-5 text-purple-500" />
          Your Personality Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {snippets.length > 0 && currentSnippet ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {currentSnippet}
            </p>
            
            {snippets.length > 1 && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshSnippet}
                  className="text-xs flex items-center"
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Show Another
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center py-4 text-muted-foreground">
            Complete more challenges to unlock personality insights.
          </p>
        )}
      </CardContent>
    </Card>
  );
}; 