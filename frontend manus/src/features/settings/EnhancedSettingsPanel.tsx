'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useGameStore } from '@/store/useGameStore';
import { Card } from '@/components/ui/card';
import { AlertCircle, Info, Settings } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/**
 * Enhanced settings panel component with more options and better organization
 * Modified to prevent infinite update loops by memoizing state and handlers
 */
export const EnhancedSettingsPanel: React.FC = () => {
  // Dialog state
  const [open, setOpen] = useState(false);
  
  // Only extract what's needed from the stores using selectors
  const {
    // Visual preferences
    darkMode,
    animationsEnabled,
    setDarkMode,
    setAnimationsEnabled,
    
    // Notification preferences
    notifications,
    setNotificationSettings,
    
    // Accessibility preferences
    accessibility,
    setAccessibilitySettings,
    
    // Display preferences
    displayName,
    language,
    setDisplayName,
    setLanguage,
    
    // Game preferences
    showTutorials,
    showTimers,
    setShowTutorials,
    setShowTimers,
    
    // Reset
    resetPreferences
  } = useUserPreferencesStore();

  const resetGame = useGameStore(state => state.resetGame);

  // Memoize state values to prevent unnecessary re-renders
  const accessibilityState = useMemo(() => ({
    highContrast: accessibility.highContrast,
    reduceMotion: accessibility.reduceMotion,
    largerText: accessibility.largerText
  }), [accessibility.highContrast, accessibility.reduceMotion, accessibility.largerText]);
  
  const notificationState = useMemo(() => ({
    emailNotifications: notifications.emailNotifications,
    pushNotifications: notifications.pushNotifications,
    newsletterSubscription: notifications.newsletterSubscription
  }), [notifications.emailNotifications, notifications.pushNotifications, notifications.newsletterSubscription]);
  
  // State for font size slider
  const [fontSize, setFontSize] = React.useState(accessibilityState.largerText ? 120 : 100);
  
  // Memoize all handler functions
  const handleFontSizeChange = useCallback((value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    setAccessibilitySettings({ largerText: newSize > 110 });
  }, [setAccessibilitySettings]);
  
  const handleResetAll = useCallback(() => {
    if (confirm('Are you sure you want to reset all settings and game progress? This cannot be undone.')) {
      resetPreferences();
      resetGame();
    }
  }, [resetPreferences, resetGame]);

  const handleDarkModeChange = useCallback((checked: boolean) => 
    setDarkMode(checked), [setDarkMode]);
    
  const handleAnimationsChange = useCallback((checked: boolean) => 
    setAnimationsEnabled(checked), [setAnimationsEnabled]);
    
  const handleHighContrastChange = useCallback((checked: boolean) => 
    setAccessibilitySettings({ highContrast: checked }), [setAccessibilitySettings]);
    
  const handleReduceMotionChange = useCallback((checked: boolean) => 
    setAccessibilitySettings({ reduceMotion: checked }), [setAccessibilitySettings]);
    
  const handleTutorialsChange = useCallback((checked: boolean) => 
    setShowTutorials(checked), [setShowTutorials]);
    
  const handleTimersChange = useCallback((checked: boolean) => 
    setShowTimers(checked), [setShowTimers]);
  
  const resetAppearanceSettings = useCallback(() => 
    resetPreferences(), [resetPreferences]);
    
  const resetAccessibilitySettings = useCallback(() => {
    setAccessibilitySettings({
      highContrast: false,
      reduceMotion: false,
      largerText: false
    });
    setFontSize(100);
  }, [setAccessibilitySettings]);
  
  const resetProfileSettings = useCallback(() => {
    setDisplayName('Player');
    setLanguage('en');
  }, [setDisplayName, setLanguage]);
  
  const resetNotificationSettings = useCallback(() => 
    setNotificationSettings({
      emailNotifications: true,
      pushNotifications: true,
      newsletterSubscription: false
    }), [setNotificationSettings]);

  // Close dialog handler  
  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);
  
  // Memoize the tabs content to prevent unnecessary re-renders
  const settingsContent = useMemo(() => (
    <Tabs defaultValue="appearance" className="w-full">
      <TabsList className="grid grid-cols-5 mb-6">
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
        <TabsTrigger value="game">Game Settings</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      
      {/* Appearance Tab */}
      <TabsContent value="appearance" className="space-y-6">
        <h3 className="text-lg font-medium">Visual Preferences</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="font-medium">
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Use a dark color theme for the application
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={handleDarkModeChange}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="animations" className="font-medium">
                Enable Animations
              </Label>
              <p className="text-sm text-muted-foreground">
                Show animations throughout the interface
              </p>
            </div>
            <Switch
              id="animations"
              checked={animationsEnabled}
              onCheckedChange={handleAnimationsChange}
            />
          </div>

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={resetAppearanceSettings}
              className="w-full sm:w-auto"
            >
              Reset Appearance Settings
            </Button>
          </div>
        </div>
      </TabsContent>
      
      {/* Accessibility Tab */}
      <TabsContent value="accessibility" className="space-y-6">
        <h3 className="text-lg font-medium">Accessibility Options</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="font-medium">
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better readability
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={accessibilityState.highContrast}
              onCheckedChange={handleHighContrastChange}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="reduce-motion" className="font-medium">
                Reduce Motion
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and motion effects
              </p>
            </div>
            <Switch
              id="reduce-motion"
              checked={accessibilityState.reduceMotion}
              onCheckedChange={handleReduceMotionChange}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <Label htmlFor="font-size" className="font-medium">
                  Font Size
                </Label>
                <p className="text-sm text-muted-foreground">
                  Adjust the text size throughout the application
                </p>
              </div>
              <span className="text-sm font-medium">{fontSize}%</span>
            </div>
            <Slider
              id="font-size"
              value={[fontSize]}
              max={150}
              min={80}
              step={5}
              onValueChange={handleFontSizeChange}
              className="w-full"
            />
          </div>

          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={resetAccessibilitySettings}
              className="w-full sm:w-auto"
            >
              Reset Accessibility Settings
            </Button>
          </div>
        </div>
      </TabsContent>
      
      {/* Game Settings Tab */}
      <TabsContent value="game" className="space-y-6">
        <h3 className="text-lg font-medium">Game Experience</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="tutorials" className="font-medium">
                Show Tutorials
              </Label>
              <p className="text-sm text-muted-foreground">
                Display helpful tips and instructions
              </p>
            </div>
            <Switch
              id="tutorials"
              checked={showTutorials}
              onCheckedChange={handleTutorialsChange}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="timers" className="font-medium">
                Show Challenge Timers
              </Label>
              <p className="text-sm text-muted-foreground">
                Display countdown timers during challenges
              </p>
            </div>
            <Switch
              id="timers"
              checked={showTimers}
              onCheckedChange={handleTimersChange}
            />
          </div>
          
          <div className="pt-4 space-y-4">
            <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <div className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300">Game Data</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Resetting your game will erase all progress, including your traits, focus area, and human edge profile.
                  </p>
                </div>
              </div>
            </Card>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTutorials(true);
                  setShowTimers(true);
                }}
                className="w-full sm:w-auto"
              >
                Reset Game Settings
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleResetAll}
                className="w-full sm:w-auto"
              >
                Reset All Game Data
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      
      {/* Profile Tab */}
      <TabsContent value="profile" className="space-y-6">
        <h3 className="text-lg font-medium">User Profile</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name" className="font-medium">
              Display Name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full"
              placeholder="Enter your display name"
            />
            <p className="text-sm text-muted-foreground">
              This name will be used throughout the application
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language" className="font-medium">
              Language
            </Label>
            <Select
              value={language}
              onValueChange={(value: string) => setLanguage(value as 'en' | 'es' | 'fr' | 'de' | 'zh')}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred language for the application
            </p>
          </div>
          
          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={resetProfileSettings}
              className="w-full sm:w-auto"
            >
              Reset Profile Settings
            </Button>
          </div>
        </div>
      </TabsContent>
      
      {/* Notifications Tab */}
      <TabsContent value="notifications" className="space-y-6">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="email-notifications" className="font-medium">
                  Email Notifications
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Receive updates about new challenges and features</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Receive updates about new challenges and features
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={notificationState.emailNotifications}
              onCheckedChange={(checked) => setNotificationSettings({ emailNotifications: checked })}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="font-medium">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications in your browser
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={notificationState.pushNotifications}
              onCheckedChange={(checked) => setNotificationSettings({ pushNotifications: checked })}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <Label htmlFor="newsletter" className="font-medium">
                Newsletter Subscription
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive our monthly newsletter with tips and updates
              </p>
            </div>
            <Switch
              id="newsletter"
              checked={notificationState.newsletterSubscription}
              onCheckedChange={(checked) => setNotificationSettings({ newsletterSubscription: checked })}
            />
          </div>
          
          <div className="pt-4">
            <Button 
              variant="outline" 
              onClick={resetNotificationSettings}
              className="w-full sm:w-auto"
            >
              Reset Notification Settings
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  ), [
    darkMode, animationsEnabled, handleDarkModeChange, handleAnimationsChange, resetAppearanceSettings,
    accessibilityState, handleHighContrastChange, handleReduceMotionChange, fontSize, handleFontSizeChange, resetAccessibilitySettings,
    showTutorials, showTimers, handleTutorialsChange, handleTimersChange, handleResetAll, 
    displayName, language, resetProfileSettings,
    notificationState, setNotificationSettings, resetNotificationSettings
  ]);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          {settingsContent}
        </div>
        <div className="pt-4">
          <Button className="w-full" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
