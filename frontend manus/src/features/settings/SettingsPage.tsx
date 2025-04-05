'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore } from '@/store/useGameStore';
import { useGetUserPreferences, useUpdateUserPreferences } from '@/services/api/services/userService';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { ArrowLeft, Save, Monitor, Moon, Sun, Bell, User, PaletteIcon, BrainCircuit, LayoutGrid } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Get user info from game store
  const { isAuthenticated, userId } = useGameStore(state => ({
    isAuthenticated: state.isAuthenticated,
    userId: state.userId
  }));
  
  // Get theme settings from user preferences store
  const { setDarkMode } = useUserPreferencesStore();
  
  // Get user preferences from API
  const { 
    data: preferencesData, 
    isLoading: isLoadingPreferences,
    error: preferencesError 
  } = useGetUserPreferences(userId, isAuthenticated);
  
  // State for user preferences form
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  const [learningStyle, setLearningStyle] = useState<'visual' | 'auditory' | 'reading' | 'kinesthetic'>('visual');
  const [preferredDifficulty, setPreferredDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  
  // Update preferences mutation
  const updatePreferencesMutation = useUpdateUserPreferences();
  
  // Initialize form values when preferences data is loaded
  useEffect(() => {
    if (preferencesData?.success && preferencesData.data) {
      const prefs = preferencesData.data;
      
      setTheme(prefs.theme || 'system');
      setFontSize(prefs.fontSize || 'medium');
      setAnimationsEnabled(prefs.animationsEnabled !== undefined ? prefs.animationsEnabled : true);
      setEmailNotifications(prefs.notifications?.email !== undefined ? prefs.notifications.email : true);
      setBrowserNotifications(prefs.notifications?.browser !== undefined ? prefs.notifications.browser : true);
      setLearningStyle(prefs.learningStyle || 'visual');
      setPreferredDifficulty(prefs.preferredDifficulty || 'intermediate');
    }
  }, [preferencesData]);
  
  // Handle theme change
  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    
    // Update dark mode based on selection
    if (value === 'dark') {
      setDarkMode(true);
    } else if (value === 'light') {
      setDarkMode(false);
    } else {
      // For 'system', check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  };
  
  // Handle form submission
  const handleSavePreferences = async () => {
    setIsSaving(true);
    
    try {
      const result = await updatePreferencesMutation.mutateAsync({
        theme,
        fontSize,
        animationsEnabled,
        notifications: {
          email: emailNotifications,
          browser: browserNotifications
        },
        learningStyle,
        preferredDifficulty
      });
      
      if (result.success) {
        toast({
          title: "Settings saved",
          description: "Your preferences have been updated successfully.",
          variant: "default"
        });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Save failed",
        description: "Could not save your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Settings
          </CardTitle>
          <CardDescription>
            Configure your preferences and customize your experience
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="appearance">
                <PaletteIcon className="w-4 h-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="learning">
                <BrainCircuit className="w-4 h-4 mr-2" />
                Learning
              </TabsTrigger>
              <TabsTrigger value="account">
                <User className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
            </TabsList>
            
            {isLoadingPreferences ? (
              <div className="p-4 space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Theme</h3>
                    <RadioGroup 
                      value={theme} 
                      onValueChange={(value: string) => handleThemeChange(value as 'light' | 'dark' | 'system')}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="flex items-center cursor-pointer">
                          <Sun className="mr-2 h-4 w-4" />
                          Light
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="flex items-center cursor-pointer">
                          <Moon className="mr-2 h-4 w-4" />
                          Dark
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system" className="flex items-center cursor-pointer">
                          <Monitor className="mr-2 h-4 w-4" />
                          System
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Font Size</h3>
                    <Select 
                      value={fontSize}
                      onValueChange={(value) => setFontSize(value as 'small' | 'medium' | 'large')}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={animationsEnabled}
                      onCheckedChange={setAnimationsEnabled}
                      id="animations"
                    />
                    <Label htmlFor="animations">Enable animations</Label>
                  </div>
                </TabsContent>
                
                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates and progress reports via email
                      </p>
                    </div>
                    <Switch 
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      id="email-notifications"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="browser-notifications">Browser Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates while using the application
                      </p>
                    </div>
                    <Switch 
                      checked={browserNotifications}
                      onCheckedChange={setBrowserNotifications}
                      id="browser-notifications"
                    />
                  </div>
                </TabsContent>
                
                {/* Learning Tab */}
                <TabsContent value="learning" className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Preferred Learning Style</h3>
                    <p className="text-sm text-muted-foreground">
                      This helps personalize how information is presented to you
                    </p>
                    <RadioGroup 
                      value={learningStyle} 
                      onValueChange={(value: string) => setLearningStyle(value as 'visual' | 'auditory' | 'reading' | 'kinesthetic')}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="visual" id="visual" />
                        <Label htmlFor="visual">Visual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auditory" id="auditory" />
                        <Label htmlFor="auditory">Auditory</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reading" id="reading" />
                        <Label htmlFor="reading">Reading/Writing</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="kinesthetic" id="kinesthetic" />
                        <Label htmlFor="kinesthetic">Kinesthetic</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Preferred Challenge Difficulty</h3>
                    <Select 
                      value={preferredDifficulty}
                      onValueChange={(value) => setPreferredDifficulty(value as 'beginner' | 'intermediate' | 'advanced' | 'expert')}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                {/* Account Tab */}
                <TabsContent value="account" className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Visit your profile page to edit your account information.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/profile/edit')}
                      className="w-full sm:w-auto"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-4 border-t pt-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSavePreferences}
            disabled={isSaving || isLoadingPreferences || !!preferencesError}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
          >
            {isSaving ? (
              <>
                <LayoutGrid className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
} 