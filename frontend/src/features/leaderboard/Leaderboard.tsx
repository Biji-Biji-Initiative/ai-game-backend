'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Medal, Award, Star } from 'lucide-react';
import { useGetLeaderboard, LeaderboardOptions } from '@/services/api/services/leaderboardService';

export default function Leaderboard() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all_time'>('all_time');
  
  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, error } = useGetLeaderboard({ 
    timeframe, 
    limit: 20 
  });
  
  // Get tier badge color and icon
  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'diamond':
        return (
          <Badge className="bg-indigo-500 hover:bg-indigo-600 flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Diamond
          </Badge>
        );
      case 'platinum':
        return (
          <Badge className="bg-cyan-500 hover:bg-cyan-600 flex items-center gap-1">
            <Star className="h-3 w-3" /> Platinum
          </Badge>
        );
      case 'gold':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
            <Medal className="h-3 w-3" /> Gold
          </Badge>
        );
      case 'silver':
        return (
          <Badge className="bg-gray-400 hover:bg-gray-500 flex items-center gap-1">
            <Award className="h-3 w-3" /> Silver
          </Badge>
        );
      case 'bronze':
        return (
          <Badge className="bg-orange-700 hover:bg-orange-800 flex items-center gap-1">
            <Award className="h-3 w-3" /> Bronze
          </Badge>
        );
      default:
        return null;
    }
  };
  
  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Get rank display with emoji for top 3
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {return <span className="font-bold text-amber-500">🥇 1st</span>;}
    if (rank === 2) {return <span className="font-bold text-gray-400">🥈 2nd</span>;}
    if (rank === 3) {return <span className="font-bold text-orange-700">🥉 3rd</span>;}
    return <span>{rank}th</span>;
  };
  
  return (
    <>
      <Button 
        variant="ghost" 
        onClick={() => router.push('/dashboard')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <Card className="w-full shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                <Trophy className="mr-2 h-6 w-6" />
                Global Leaderboard
              </CardTitle>
              <CardDescription>
                See how you stack up against other AI Fight Club participants
              </CardDescription>
            </div>
            
            <div className="w-full sm:w-auto">
              <Select 
                value={timeframe} 
                onValueChange={(value: string) => {
                  // Ensure the value is one of the valid timeframe options
                  if (value === 'day' || value === 'week' || value === 'month' || value === 'all_time') {
                    setTimeframe(value);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error || !leaderboardData?.success ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Could not load leaderboard data. Please try again later.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableCaption>
                  {timeframe === 'day' && 'Leaderboard for today'}
                  {timeframe === 'week' && 'Leaderboard for this week'}
                  {timeframe === 'month' && 'Leaderboard for this month'}
                  {timeframe === 'all_time' && 'All-time leaderboard'}
                </TableCaption>
                
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">Challenges</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {leaderboardData.data && leaderboardData.data.map((entry) => (
                    <TableRow key={entry.userId} className={entry.rank <= 3 ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        {getRankDisplay(entry.rank)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{entry.username}</div>
                      </TableCell>
                      <TableCell>
                        {getTierBadge(entry.tier)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatNumber(entry.points)}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.wins}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.challengesCompleted}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
} 