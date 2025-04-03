'use client';

import { useState } from 'react';
import { useGetUserBadges, Badge } from '@/services/api/services/progressService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { 
  Award, Brain, Zap, Star, Heart, Trophy, 
  Medal, Sparkles, Badge as BadgeIcon, Crown 
} from 'lucide-react';

interface BadgeDisplayProps {
  userId?: string;
}

export function BadgeDisplay({ userId }: BadgeDisplayProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const { data: badgesData, isLoading, error } = useGetUserBadges(userId);
  
  // Map icon string names to Lucide icons
  const getIconComponent = (iconName: string, className = "h-6 w-6") => {
    switch (iconName) {
      case 'award': return <Award className={className} />;
      case 'brain': return <Brain className={className} />;
      case 'zap': return <Zap className={className} />;
      case 'star': return <Star className={className} />;
      case 'heart': return <Heart className={className} />;
      case 'trophy': return <Trophy className={className} />;
      case 'medal': return <Medal className={className} />;
      case 'sparkles': return <Sparkles className={className} />;
      case 'crown': return <Crown className={className} />;
      default: return <BadgeIcon className={className} />;
    }
  };
  
  // Get color class based on rarity
  const getRarityColorClass = (rarity: Badge['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
      case 'uncommon': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'legendary': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };
  
  // Get color for icon based on category
  const getCategoryColorClass = (category: Badge['category']) => {
    switch (category) {
      case 'achievement': return 'text-blue-600 dark:text-blue-400';
      case 'skill': return 'text-indigo-600 dark:text-indigo-400';
      case 'milestone': return 'text-green-600 dark:text-green-400';
      case 'special': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-16 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (error || !badgesData?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Badges</CardTitle>
          <CardDescription>Could not load badges at this time.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state
  if (!badgesData.data || badgesData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Badges</CardTitle>
          <CardDescription>Complete challenges to earn badges!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Badges showcase your achievements and skills. Start taking challenges to earn your first badge!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Open badge details dialog
  const openBadgeDetails = (badge: Badge) => {
    setSelectedBadge(badge);
  };
  
  // Close badge details dialog
  const closeBadgeDetails = () => {
    setSelectedBadge(null);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-indigo-500" />
            Your Badges
          </CardTitle>
          <CardDescription>
            Achievements and milestones you&apos;ve unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {badgesData.data.map((badge) => (
              <div 
                key={badge.id}
                className={`w-16 h-16 flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110 ${getRarityColorClass(badge.rarity)}`}
                onClick={() => openBadgeDetails(badge)}
                title={badge.name}
              >
                <div className={getCategoryColorClass(badge.category)}>
                  {getIconComponent(badge.icon)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Badge Details Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={closeBadgeDetails}>
        {selectedBadge && (
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${getRarityColorClass(selectedBadge.rarity)}`}>
                  <div className={getCategoryColorClass(selectedBadge.category)}>
                    {getIconComponent(selectedBadge.icon)}
                  </div>
                </div>
                <div>
                  <DialogTitle>{selectedBadge.name}</DialogTitle>
                  <DialogDescription className="mt-1 opacity-80 capitalize">
                    {selectedBadge.category} · {selectedBadge.rarity}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <p>{selectedBadge.description}</p>
              
              <div className="text-sm text-muted-foreground">
                Earned {formatDistanceToNow(new Date(selectedBadge.earnedAt), { addSuffix: true })}
              </div>
              
              {selectedBadge.progress && (
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{selectedBadge.progress.current} / {selectedBadge.progress.target}</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${selectedBadge.progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
} 