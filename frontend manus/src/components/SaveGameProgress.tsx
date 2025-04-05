'use client';

import React, { useState } from 'react';
import { signIn, useSession, signOut as _signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SaveGameProgressProps {
  gameData: Record<string, unknown>; // Use Record<string, unknown> instead of any
  onSaveComplete?: () => void;
  onCancel?: () => void;
}

/**
 * Component for saving game progress when a user completes the game.
 * It handles both:
 * 1. For logged-in users: Directly save their progress
 * 2. For anonymous users: Prompt to login/register first
 */
export default function SaveGameProgress({ gameData, onSaveComplete, onCancel }: SaveGameProgressProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  // Function to save the game progress to the backend
  const saveProgress = async () => {
    if (!session?.user) {
      setShowLoginOptions(true);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Call the backend API to save game progress
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/complete_challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          challengeId: gameData.challengeId || 'default-challenge',
          score: gameData.score || 0,
          metrics: gameData.metrics || {},
          completedAt: new Date().toISOString(),
          // Add any other game data needed by your backend
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save game progress');
      }

      // Set saved flag
      setSavedSuccessfully(true);
      
      // Call completion callback if provided
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error: unknown) {
      console.error('Error saving game progress:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred while saving your progress');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for Google sign-in
  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: window.location.href });
  };

  // Handler for email/password sign-in
  const handleCredentialsSignIn = () => {
    // Store current location or game state in localStorage if needed
    // localStorage.setItem('savedGameData', JSON.stringify(gameData));
    
    // Redirect to login page
    router.push('/login');
  };

  // Handler for anonymous continue
  const handleAnonymousContinue = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // If user is signed in
  if (status === 'authenticated' && !savedSuccessfully) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Save Your Progress</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300">
            Signed in as <span className="font-semibold">{session.user.email}</span>
          </p>
        </div>
        
        {error && (
          <div className="p-3 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
            {error}
          </div>
        )}
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={saveProgress}
            disabled={isSaving}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          >
            {isSaving ? 'Saving...' : 'Save Progress'}
          </button>
          
          <button
            onClick={handleAnonymousContinue}
            disabled={isSaving}
            className="py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md"
          >
            Continue Without Saving
          </button>
        </div>
      </div>
    );
  }

  // If save was successful
  if (savedSuccessfully) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          <h2 className="text-2xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">Progress Saved!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your game progress has been successfully saved.
          </p>
          <button
            onClick={onSaveComplete}
            className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // If user is not signed in and we need to show login options
  if (showLoginOptions) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Save Your Progress</h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Sign in or create an account to save your progress and track your achievements.
        </p>
        
        <div className="flex flex-col space-y-3 mb-6">
          <button
            onClick={handleGoogleSignIn}
            className="py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-md flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            Sign in with Google
          </button>
          
          <button
            onClick={handleCredentialsSignIn}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          >
            Sign in with Email
          </button>
          
          <button
            onClick={handleAnonymousContinue}
            className="py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md"
          >
            Continue Without Saving
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Your progress will be lost if you continue without saving.
        </p>
      </div>
    );
  }

  // Initial state - show save button
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Game Complete!</h2>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Congratulations on completing the game! Would you like to save your progress?
      </p>
      
      <div className="flex flex-col space-y-3">
        <button
          onClick={saveProgress}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
        >
          Save Progress
        </button>
        
        <button
          onClick={handleAnonymousContinue}
          className="py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md"
        >
          Continue Without Saving
        </button>
      </div>
    </div>
  );
} 