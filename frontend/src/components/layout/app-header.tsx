'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store';
import { GamePhase, useIsPhaseCompleted } from '@/store/useGameStore';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SettingsPanel } from '@/components/settings/settings-panel';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { announce } from '@/components/accessibility/screen-reader-announcer';
import { useGetProgressSummary } from '@/services/api/services/progressService';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Re-enabled LogTrigger to debug the infinite update loop
import LogTrigger from '@/features/logging/LogTrigger';

/**
 * Application header component with navigation, title and settings
 */
export const AppHeader: React.FC = () => {
  const { gamePhase, resetGame, isAuthenticated, userId } = useGameStore(state => ({
    gamePhase: state.gamePhase,
    resetGame: state.resetGame,
    isAuthenticated: state.isAuthenticated,
    userId: state.userId
  }));
  const pathname = usePathname();
  const router = useRouter();
  const { setDarkMode } = useUserPreferencesStore();
  
  // Get progress data for authenticated users
  const { data: progressData } = useGetProgressSummary(userId, isAuthenticated);
  
  // Register keyboard shortcuts
  useKeyboardShortcuts([
    {
      keys: KEYBOARD_SHORTCUTS.NAVIGATE_HOME,
      handler: () => {
        router.push('/');
        announce.polite('Navigated to home page');
      },
      preventDefault: true,
    },
    {
      keys: KEYBOARD_SHORTCUTS.NAVIGATE_DASHBOARD,
      handler: () => {
        router.push('/dashboard');
        announce.polite('Navigated to dashboard page');
      },
      preventDefault: true,
    },
    {
      keys: KEYBOARD_SHORTCUTS.NAVIGATE_CHALLENGES,
      handler: () => {
        router.push('/challenges');
        announce.polite('Navigated to challenges page');
      },
      preventDefault: true,
    },
    {
      keys: KEYBOARD_SHORTCUTS.NAVIGATE_RESULTS,
      handler: () => {
        router.push('/results');
        announce.polite('Navigated to results page');
      },
      preventDefault: true,
    },
    {
      keys: KEYBOARD_SHORTCUTS.OPEN_SETTINGS,
      handler: () => {
        router.push('/settings');
        announce.polite('Opened settings page');
      },
      preventDefault: true,
    },
    {
      keys: KEYBOARD_SHORTCUTS.TOGGLE_DARK_MODE,
      handler: () => {
        const { darkMode } = useUserPreferencesStore.getState();
        setDarkMode(!darkMode);
        announce.polite('Toggled dark mode');
      },
      preventDefault: true,
    },
  ]);
  
  // Announce page changes for screen readers
  useEffect(() => {
    // Get the current page name from the pathname
    const pageName = pathname === '/' 
      ? 'Home' 
      : pathname.split('/')[1].charAt(0).toUpperCase() + pathname.split('/')[1].slice(1);
    
    // Announce the page change
    announce.polite(`Navigated to ${pageName} page`);
  }, [pathname]);
  
  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center gap-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-6 w-6"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span className="font-bold">AI Fight Club</span>
          </Link>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1">
          <ul className="flex gap-4">
            <li>
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                  pathname === '/' ? 'text-foreground' : 'text-foreground/60'
                }`}
              >
                Welcome
              </Link>
            </li>
            <li>
              <Link 
                href="/context" 
                className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                  pathname === '/context' ? 'text-foreground' : 'text-foreground/60'
                }`}
              >
                Context
              </Link>
            </li>
            {useIsPhaseCompleted(GamePhase.TRAITS) && (
              <li>
                <Link 
                  href="/traits" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/traits' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Traits
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.ATTITUDES) && (
              <li>
                <Link 
                  href="/attitudes" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/attitudes' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  AI Attitudes
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.FOCUS) && (
              <li>
                <Link 
                  href="/focus" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/focus' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Focus
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.FOCUS) && (
              <li>
                <Link 
                  href="/challenges" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/challenges' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Challenges
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.ROUND1) && (
              <li>
                <Link 
                  href="/round1" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/round1' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Round 1
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.ROUND2) && (
              <li>
                <Link 
                  href="/round2" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/round2' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Round 2
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.ROUND3) && (
              <li>
                <Link 
                  href="/round3" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/round3' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Round 3
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.RESULTS) && (
              <li>
                <Link 
                  href="/results" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/results' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Results
                </Link>
              </li>
            )}
            {useIsPhaseCompleted(GamePhase.RESULTS) && (
              <li>
                <Link 
                  href="/dashboard" 
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === '/dashboard' ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  Dashboard
                </Link>
              </li>
            )}
          </ul>
        </nav>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* User Level and Rank (for authenticated users) */}
          {isAuthenticated && progressData?.success && progressData.data && (
            <div className="flex items-center gap-3 mr-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/30 p-1.5 pl-2 pr-3 rounded-full">
                      <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        Level {progressData.data.level}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your current level: {progressData.data.level}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progressData.data.xpToNextLevel} XP to next level
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1 py-1">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      <span>{progressData.data.rank}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your current rank: {progressData.data.rank}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/profile/edit')}
                className="rounded-full p-1.5 h-auto"
              >
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                  {/* Display first letter of user's name, or fallback to "U" */}
                  {useGameStore.getState().userInfo.name?.[0]?.toUpperCase() || 'U'}
                </div>
              </Button>
            </div>
          )}
          
          {/* Added LogTrigger back for debugging */}
          <LogTrigger />
          <ThemeToggle />
          <SettingsPanel />
          
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">
              Settings
            </Link>
          </Button>
          
          {gamePhase && gamePhase !== 'welcome' && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={resetGame}
            >
              Reset Game
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
