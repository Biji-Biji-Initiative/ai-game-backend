'use client';

import React from 'react';
import { useUserPreferencesStore } from '../../store/user-preferences-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';

/**
 * Settings panel component using shadcn/ui Dialog and Zustand store
 */
export const SettingsPanel: React.FC = () => {
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your AI Fight Club experience
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="appearance" className="mt-4">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="dark-mode" className="font-medium">
                  Dark Mode
                </Label>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="animations" className="font-medium">
                  Enable Animations
                </Label>
                <Switch
                  id="animations"
                  checked={animationsEnabled}
                  onCheckedChange={setAnimationsEnabled}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="tutorials" className="font-medium">
                  Show Tutorials
                </Label>
                <Switch
                  id="tutorials"
                  checked={showTutorials}
                  onCheckedChange={setShowTutorials}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="timers" className="font-medium">
                  Show Challenge Timers
                </Label>
                <Switch
                  id="timers"
                  checked={showTimers}
                  onCheckedChange={setShowTimers}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
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
                />
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
              </div>
            </div>
          </TabsContent>
          
          {/* Accessibility Tab */}
          <TabsContent value="accessibility" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="high-contrast" className="font-medium">
                  High Contrast Mode
                </Label>
                <Switch
                  id="high-contrast"
                  checked={accessibility.highContrast}
                  onCheckedChange={(checked) => setAccessibilitySettings({ highContrast: checked })}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="reduce-motion" className="font-medium">
                  Reduce Motion
                </Label>
                <Switch
                  id="reduce-motion"
                  checked={accessibility.reduceMotion}
                  onCheckedChange={(checked) => setAccessibilitySettings({ reduceMotion: checked })}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="larger-text" className="font-medium">
                  Larger Text
                </Label>
                <Switch
                  id="larger-text"
                  checked={accessibility.largerText}
                  onCheckedChange={(checked) => setAccessibilitySettings({ largerText: checked })}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="email-notifications" className="font-medium">
                  Email Notifications
                </Label>
                <Switch
                  id="email-notifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ emailNotifications: checked })}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="push-notifications" className="font-medium">
                  Push Notifications
                </Label>
                <Switch
                  id="push-notifications"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ pushNotifications: checked })}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="newsletter" className="font-medium">
                  Newsletter Subscription
                </Label>
                <Switch
                  id="newsletter"
                  checked={notifications.newsletterSubscription}
                  onCheckedChange={(checked) => setNotificationSettings({ newsletterSubscription: checked })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={resetPreferences}>
            Reset Settings
          </Button>
          <Button variant="default" asChild>
            <a href="/settings">Advanced Settings</a>
          </Button>
          <DialogTrigger asChild>
            <Button type="submit">Save Changes</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
