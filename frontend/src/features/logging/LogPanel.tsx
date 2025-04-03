'use client';

import React from 'react';
import { X, Download, Trash, Filter } from 'lucide-react';
import { useLogContext } from './LogContext';
// LogLevel is imported but unused - removing it
import LogItem from './LogItem';
import LogControls from './LogControls';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * LogPanel component
 * A slide-out panel that displays application logs with filtering capabilities
 */
export const LogPanel: React.FC = () => {
  const {
    visibleLogs,
    isOpen,
    togglePanel,
    clearLogs,
    exportLogs,
  } = useLogContext();

  return (
    <Sheet open={isOpen} onOpenChange={togglePanel}>
      <SheetContent className="sm:max-w-xl w-[90vw] p-0" side="right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="border-b p-4 flex flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="bg-primary w-2 h-2 rounded-full animate-pulse" />
              <span>Developer Console</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({visibleLogs.length} entries)
              </span>
            </SheetTitle>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={clearLogs}
                title="Clear logs"
              >
                <Trash className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={exportLogs}
                title="Export logs"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={togglePanel}
                title="Close panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Filter controls */}
          <LogControls />

          {/* Log list */}
          <div className="flex-1 overflow-auto p-2">
            {visibleLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Filter className="h-10 w-10 mb-2 opacity-20" />
                <p>No logs match the current filters</p>
              </div>
            ) : (
              <div className="space-y-1">
                {Array.isArray(visibleLogs) && visibleLogs.map(log => (
                  <LogItem key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LogPanel;
