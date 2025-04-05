'use client';

import React from 'react';
import { useAccessibility } from '@/contexts/accessibility-context';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AccessibilityPanel() {
  // Get the current settings from the accessibility context
  const { highContrast, largerText, reduceMotion, applyAccessibilityClass } = useAccessibility();
  
  // Get the setter methods from the user preferences store
  const { setAccessibilitySettings, resetPreferences } = useUserPreferencesStore();

  return (
    <Card className={applyAccessibilityClass('w-full max-w-md')}>
      <CardHeader>
        <CardTitle>Accessibility Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={(checked) => 
                setAccessibilitySettings({ highContrast: checked })
              }
            />
            <Label htmlFor="high-contrast">High Contrast Mode</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="larger-text"
              checked={largerText}
              onCheckedChange={(checked) => 
                setAccessibilitySettings({ largerText: checked })
              }
            />
            <Label htmlFor="larger-text">Larger Text</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="reduce-motion"
              checked={reduceMotion}
              onCheckedChange={(checked) => 
                setAccessibilitySettings({ reduceMotion: checked })
              }
            />
            <Label htmlFor="reduce-motion">Reduce Motion</Label>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              // Reset all preferences to defaults
              resetPreferences();
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
