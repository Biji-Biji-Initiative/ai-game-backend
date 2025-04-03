'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore } from '@/store/useGameStore';
import { useUpdateUserProfile } from '@/services/api/services/userService';
import { Loader2, Save, ArrowLeft } from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get user info from game store
  const { userInfo, saveUserInfo, isAuthenticated, userId } = useGameStore(state => ({
    userInfo: state.userInfo,
    saveUserInfo: state.saveUserInfo,
    isAuthenticated: state.isAuthenticated,
    userId: state.userId
  }));
  
  // Form state
  const [name, setName] = useState(userInfo.name || '');
  const [email, setEmail] = useState(userInfo.email || '');
  const [professionalTitle, setProfessionalTitle] = useState(userInfo.professionalTitle || '');
  const [location, setLocation] = useState(userInfo.location || '');
  
  // Get update profile mutation
  const updateProfileMutation = useUpdateUserProfile();
  
  // Check authentication and redirect if needed
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Add a check to ensure userId exists before proceeding
    if (!userId) {
      console.error('User ID is missing, cannot update profile.');
      toast({
        title: "Authentication Error",
        description: "Could not identify user. Please log in again.",
        variant: "destructive"
      });
      setIsLoading(false);
      // Optional: Redirect to login or show a more prominent error
      // router.push('/login'); 
      return; // Stop the function here
    }
    
    try {
      // Update profile via API
      const result = await updateProfileMutation.mutateAsync({
        userId: userId,
        data: {
          name,
          bio: `${professionalTitle}${location ? ` - ${location}` : ''}`          
        }
      });
      
      if (result.success) {
        // Update game store
        saveUserInfo({
          name,
          email,
          professionalTitle,
          location
        });
        
        toast({
          title: "Profile updated",
          description: "Your profile information has been saved successfully.",
          variant: "default"
        });
        
        // Redirect back to profile (or dashboard as it was)
        router.push('/dashboard');
      } else {
        // Use the error from the result if available, otherwise a generic message
        throw new Error(result.error?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        // Display the error message from the catch block
        description: error instanceof Error ? error.message : "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return null; // Don't render anything if not authenticated (will redirect)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              Edit Your Profile
            </CardTitle>
            <CardDescription>
              Update your personal and professional information
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="professionalTitle">Professional Title</Label>
                <Input
                  id="professionalTitle"
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value)}
                  placeholder="e.g. Software Engineer, Product Manager"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => router.push('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
} 