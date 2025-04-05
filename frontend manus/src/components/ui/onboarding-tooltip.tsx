'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { HelpCircle, X } from 'lucide-react';
import { useUserPreferencesStore } from '@/store/user-preferences-store';

interface OnboardingTooltipProps {
  id: string;
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  showDismissButton?: boolean;
  width?: 'narrow' | 'medium' | 'wide';
}

/**
 * A tooltip component for onboarding users with helpful hints
 * Respects the user's preference to show/hide tutorials
 */
export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  id,
  content,
  children,
  side = 'right',
  align = 'center',
  className = '',
  showDismissButton = true,
  width = 'medium',
}) => {
  const { showTutorials, setShowTutorials } = useUserPreferencesStore();
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // Don't show tooltip if tutorials are disabled or this specific tooltip was dismissed
  if (!showTutorials || isDismissed) {
    return <>{children}</>;
  }

  // Get width class
  const widthClass = width === 'narrow' ? 'max-w-xs' : width === 'wide' ? 'max-w-md' : 'max-w-sm';

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen} delayDuration={500}>
        <TooltipTrigger asChild onClick={() => setOpen(true)}>
          <div className="relative inline-block group">
            {children}
            <div className="absolute top-0 right-0 -mt-2 -mr-2 flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full z-10 opacity-80 hover:opacity-100 pointer-events-none group-hover:opacity-100">
              <HelpCircle className="w-3 h-3" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align} 
          className={`${widthClass} bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 shadow-lg p-4 ${className}`}
        >
          <div className="space-y-3">
            {showDismissButton && (
              <div className="flex justify-end">
                <button 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => setIsDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="text-sm">{content}</div>
            
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Switch 
                  id={`tutorial-switch-${id}`} 
                  checked={showTutorials}
                  onCheckedChange={setShowTutorials}
                />
                <Label htmlFor={`tutorial-switch-${id}`} className="text-xs">
                  Show tutorials
                </Label>
              </div>
              
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-7 border-blue-300 dark:border-blue-800"
                onClick={() => setOpen(false)}
              >
                Got it
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 