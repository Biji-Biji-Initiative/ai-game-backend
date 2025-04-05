import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define notification settings type
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newsletterSubscription: boolean;
}

// Define accessibility settings type
export interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  largerText: boolean;
}

// Define the state shape without actions
interface UserPreferencesStateWithoutActions {
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
}

// Define the actions separately
interface UserPreferencesActions {
  setDarkMode: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  setDisplayName: (name: string) => void;
  setLanguage: (language: UserPreferencesStateWithoutActions['language']) => void;
  setShowTutorials: (show: boolean) => void;
  setShowTimers: (show: boolean) => void;
  resetPreferences: () => void;
}

// Combine state and actions
type UserPreferencesState = UserPreferencesStateWithoutActions & UserPreferencesActions;

// Initial state matches the state shape without actions
const initialState: UserPreferencesStateWithoutActions = {
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
export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      ...initialState,
      
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
      resetPreferences: () => set(initialState),
    }),
    {
      name: 'ai-fight-club-user-preferences',
      skipHydration: true,
    }
  )
);

// Initialize the store client-side only to avoid SSR hydration issues
if (typeof window !== 'undefined') {
  useUserPreferencesStore.persist.rehydrate();
}
