'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, LayoutDashboard } from 'lucide-react'; // Import icons
import { useGoogleAuth, useEmailSignup } from '@/services/api/services/authService';
import { useToast } from '@/components/ui/use-toast';
// Import types from centralized type system
import { LoginRequest, SignupRequest } from '@/types/api';

export function AuthPrompt() {
  const router = useRouter();
  const { isAuthenticated, login } = useGameStore(state => ({
    isAuthenticated: state.isAuthenticated,
    login: state.login
  }));

  const { toast } = useToast();

  // Authentication mutations
  const googleAuth = useGoogleAuth();
  const emailSignup = useEmailSignup();
  
  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    try {
      const response = await googleAuth.mutateAsync();
      if (response.success && response.data) {
        const { user } = response.data;
        // Update the game store with the authenticated user
        login({
          userId: user.id,
          userInfo: {
            name: user.fullName || 'Google User',
            email: user.email,
            avatarUrl: user.photoUrl
          }
        });
        
        toast({
          title: "Successfully signed in",
          description: "Welcome back!",
          variant: "default",
        });
        
        // Navigate to dashboard after login
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      toast({
        title: "Sign-in failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle Email Sign-up
  const handleEmailSignUp = async () => {
    try {
      // In a real app, we'd collect email/password
      // For this mock, we'll just simulate a successful signup
      const mockSignupData: SignupRequest = {
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        password: 'password123',
        fullName: 'New User',
      };
      
      const response = await emailSignup.mutateAsync(mockSignupData);
      if (response.success && response.data) {
        const { user } = response.data;
        // Update the game store with the authenticated user
        login({
          userId: user.id,
          userInfo: {
            name: user.fullName || 'New User',
            email: user.email,
            avatarUrl: user.photoUrl
          }
        });
        
        toast({
          title: "Account created",
          description: "Your account has been created successfully!",
          variant: "default",
        });
        
        // Navigate to dashboard after signup
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Email sign-up failed:', error);
      toast({
        title: "Sign-up failed",
        description: "Could not create your account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle dashboard navigation
  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  // Don't show the prompt if the user is already authenticated
  if (isAuthenticated) {
    // Show a button to go to the dashboard
    return (
      <div className="w-full max-w-5xl mx-auto mt-6 text-center">
        <Button onClick={navigateToDashboard} variant="outline">
          <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8 shadow-md">
      <CardHeader>
        <CardTitle>Save Your Progress</CardTitle>
        <CardDescription>
          Sign in or create an account to save your profile, track your progress, and get personalized challenges.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={handleGoogleSignIn} 
          className="flex-1"
          disabled={googleAuth.isLoading}
        >
          {googleAuth.isLoading ? (
            <span className="animate-pulse">Signing in...</span>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" /> Sign in with Google
            </>
          )}
        </Button>
        <Button 
          onClick={handleEmailSignUp} 
          variant="secondary" 
          className="flex-1"
          disabled={emailSignup.isLoading}
        >
          {emailSignup.isLoading ? (
            <span className="animate-pulse">Creating account...</span>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" /> Create Account
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 