'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore } from '@/store/useGameStore';
import { ArrowLeft } from 'lucide-react';
import { UpdateProfileRequest } from '@/types/api';
import { z } from 'zod';

// Define validation schema for profile data
const ProfileDataSchema = z.object({
  fullName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  professionalTitle: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  bio: z.string().optional().nullable()
});

type SafeProfileData = z.infer<typeof ProfileDataSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Get data from game store
  const { isAuthenticated, userInfo, userId, updateUserInfo } = useGameStore(state => ({
    isAuthenticated: state.isAuthenticated,
    userInfo: state.userInfo,
    userId: state.userId,
    updateUserInfo: state.updateUserInfo
  }));
  
  // Local form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  // Check authentication and load user data
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User ID not found. Please try logging in again.',
        variant: 'destructive',
      });
      router.push('/');
      return;
    }
    
    // Initialize form state with user info
    if (userInfo) {
      try {
        // Validate user data
        const validatedData = ProfileDataSchema.parse(userInfo);
        setFullName(validatedData.fullName || '');
        setEmail(validatedData.email || '');
        setProfessionalTitle(validatedData.professionalTitle || '');
        setLocation(validatedData.location || '');
      } catch (error) {
        console.error('Error validating user info:', error);
        if (error instanceof z.ZodError) {
          const issues = error.issues.map(i => i.message).join(', ');
          setValidationError(`Profile data validation error: ${issues}`);
          
          // Still set the basic data even if validation fails
          setFullName(userInfo.fullName || '');
          setEmail(userInfo.email || '');
          setProfessionalTitle(userInfo.professionalTitle || '');
          setLocation(userInfo.location || '');
        }
      }
    }
  }, [isAuthenticated, userInfo, userId, router, toast]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User ID not found. Please try logging in again.',
        variant: 'destructive',
      });
      router.push('/');
      return;
    }
    
    // Validate email format
    if (email && !z.string().email().safeParse(email).success) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Construct the bio using professional title and location
      let bio = '';
      if (professionalTitle && location) {
        bio = `${professionalTitle} from ${location}`;
      } else if (professionalTitle) {
        bio = professionalTitle;
      } else if (location) {
        bio = `From ${location}`;
      }
      
      // Validate the profile data before submitting
      const updatedProfileData: SafeProfileData = {
        fullName,
        email,
        bio,
        professionalTitle,
        location
      };
      
      // Validate the data using our schema
      const validationResult = ProfileDataSchema.safeParse(updatedProfileData);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.issues.map(issue => issue.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      
      // Would typically send to API in a real implementation
      // Note: This variable is defined but not used as we're simulating an API call
      const _updateProfileRequest: UpdateProfileRequest = {
        userId,
        fullName: fullName || 'User', // Ensure fullName is not empty
        email: email || '', // UpdateProfileRequest requires email as a string
        bio: bio || undefined,
        professionalTitle: professionalTitle || undefined,
        location: location || undefined
      };
      
      // In a full implementation, you would call the API here
      // For now, we'll simulate an API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update the user info in the game store - convert null values to undefined to match UIUser partial
      updateUserInfo({
        fullName: validationResult.data.fullName || undefined,
        email: validationResult.data.email || undefined,
        bio: validationResult.data.bio || undefined,
        professionalTitle: validationResult.data.professionalTitle || undefined,
        location: validationResult.data.location || undefined
      });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved.',
        variant: 'default',
      });
      
      // Navigate back to profile page
      router.push('/profile');
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Update failed',
        description: `There was an error updating your profile: ${errorMessage}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <>
      <Button 
        variant="ghost" 
        onClick={() => router.push('/profile')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>
      
      {validationError && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
          {validationError}
        </div>
      )}
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="professionalTitle" className="text-sm font-medium">
                  Professional Title
                </label>
                <Input
                  id="professionalTitle"
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value)}
                  placeholder="e.g. Software Engineer, Designer, etc."
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Location
                </label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York, United States"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/profile')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !userId}
                aria-label={!userId ? "Submit disabled: User ID not found" : "Save changes"}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
} 