import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define settings types
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newsletterSubscription: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  largerText: boolean;
}

export interface UserSettings {
  // Visual preferences
  darkMode: boolean;
  animationsEnabled: boolean;
  
  // Notification preferences
  notifications: NotificationSettings;
  
  // Accessibility preferences
  accessibility: AccessibilitySettings;
  
  // Display preferences
  displayName: string;
  language: 'en' | 'es' | 'fr' | 'de' | 'zh';
  
  // Game preferences
  showTutorials: boolean;
  showTimers: boolean;
  
  // Actions
  setDarkMode: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  setDisplayName: (name: string) => void;
  setLanguage: (language: UserSettings['language']) => void;
  setShowTutorials: (show: boolean) => void;
  setShowTimers: (show: boolean) => void;
  resetSettings: () => void;
}

// Initial settings
const initialSettings = {
  // Visual preferences
  darkMode: false,
  animationsEnabled: true,
  
  // Notification preferences
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    newsletterSubscription: false,
  },
  
  // Accessibility preferences
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    largerText: false,
  },
  
  // Display preferences
  displayName: 'Player',
  language: 'en' as const,
  
  // Game preferences
  showTutorials: true,
  showTimers: true,
};

// Create the store with persistence
export const useSettingsStore = create<UserSettings>()(
  persist(
    (set) => ({
      // Initial state
      ...initialSettings,
      
      // Actions
      setDarkMode: (darkMode) => set({ darkMode }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setNotificationSettings: (settings) => 
        set((state) => ({ 
          notifications: { ...state.notifications, ...settings } 
        })),
      setAccessibilitySettings: (settings) => 
        set((state) => ({ 
          accessibility: { ...state.accessibility, ...settings } 
        })),
      setDisplayName: (displayName) => set({ displayName }),
      setLanguage: (language) => set({ language }),
      setShowTutorials: (showTutorials) => set({ showTutorials }),
      setShowTimers: (showTimers) => set({ showTimers }),
      resetSettings: () => set(initialSettings),
    }),
    {
      name: 'ai-fight-club-settings',
    }
  )
);
