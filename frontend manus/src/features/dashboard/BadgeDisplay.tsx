'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Medal, Shield, Trophy } from 'lucide-react';
import { useGetUserBadges } from '@/services/api/services';
import { useRouter } from 'next/navigation';

// Define Badge type inline
interface BadgeType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'achievement' | 'skill' | 'milestone' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

interface BadgeDisplayProps {
  userId?: string;
  isAuthenticated: boolean;
}

/**
 * Component to display a user's earned badges
 */
export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ userId, isAuthenticated }) => {
  const router = useRouter();
  const { data: badgesData, isLoading } = useGetUserBadges(userId, isAuthenticated);
  
  // Map badge category to icon
  const getBadgeIcon = (category: string) => {
    switch (category) {
      case 'achievement':
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'skill':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'milestone':
        return <Medal className="h-4 w-4 text-green-500" />;
      default:
        return <Award className="h-4 w-4 text-purple-500" />;
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex justify-between items-center">
          <span className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-amber-500" />
            Badges
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/profile')}
          >
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : badgesData?.success && badgesData.data && badgesData.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {badgesData.data.slice(0, 4).map((badge: BadgeType) => (
              <div key={badge.id} className="flex items-start p-2 rounded-lg border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  {getBadgeIcon(badge.category)}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{badge.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {badge.description}
                  </p>
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs"
                  >
                    {badge.rarity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="font-medium mb-1">No badges yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Complete challenges to earn recognition badges
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/challenges')}
            >
              View Challenges
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 