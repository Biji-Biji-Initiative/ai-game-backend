'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react';
import { LogEntry, LogLevel } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';

interface LogItemProps {
  log: LogEntry;
}

/**
 * LogItem component
 * Renders a single log entry with collapsible details
 */
export const LogItem: React.FC<LogItemProps> = ({ log }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Format timestamp
  const timestamp = new Date(log.timestamp).toLocaleTimeString();

  // Level-specific styling
  const getLevelDetails = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          badge: 'bg-red-500'
        };
      case LogLevel.WARN:
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-100 dark:bg-amber-900/20',
          badge: 'bg-amber-500'
        };
      case LogLevel.INFO:
        return {
          icon: <Info className="h-4 w-4" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          badge: 'bg-blue-500'
        };
      case LogLevel.DEBUG:
      default:
        return {
          icon: <Bug className="h-4 w-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          badge: 'bg-gray-500'
        };
    }
  };

  const levelDetails = getLevelDetails(log.level);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`rounded-md overflow-hidden ${levelDetails.bgColor} text-sm`}
    >
      <div className="p-2 flex items-start">
        <div className={`mr-2 ${levelDetails.color}`}>
          {levelDetails.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{timestamp}</span>
            {log.source && (
              <Badge variant="outline" className="text-xs">
                {log.source}
              </Badge>
            )}
          </div>
          
          <div className="mt-1 break-words">{log.message}</div>
        </div>
        
        {log.data && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-2 p-1 h-6 w-6">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>
      
      {log.data && (
        <CollapsibleContent>
          <div className="p-2 pt-0 pl-8 font-mono text-xs overflow-x-auto">
            <pre className="bg-background/50 p-2 rounded">
              {typeof log.data === 'string' 
                ? log.data 
                : JSON.stringify(log.data, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export default LogItem;
