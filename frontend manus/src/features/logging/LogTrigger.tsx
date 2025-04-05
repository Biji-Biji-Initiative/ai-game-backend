'use client';

import React from 'react';
import { Terminal } from 'lucide-react';
import { useLogContext } from './LogContext';
import { Button } from '@/components/ui/button';

interface LogTriggerProps {
  className?: string;
}

/**
 * LogTrigger component
 * A button that toggles the visibility of the log panel
 */
export const LogTrigger: React.FC<LogTriggerProps> = ({ className = '' }) => {
  const { togglePanel } = useLogContext();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={togglePanel}
      className={`flex items-center gap-1 ${className}`}
      title="Open Developer Console"
    >
      <Terminal className="h-4 w-4" />
      <span className="hidden sm:inline">Console</span>
    </Button>
  );
};

export default LogTrigger;
