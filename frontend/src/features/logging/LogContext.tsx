'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import logger, { LogEntry, LogLevel } from '@/utils/logger';

interface LogContextProps {
  logs: LogEntry[];
  visibleLogs: LogEntry[];
  isOpen: boolean;
  filterLevel: LogLevel | null;
  filterSource: string | null;
  searchQuery: string;
  setFilterLevel: (level: LogLevel | null) => void;
  setFilterSource: (source: string | null) => void;
  setSearchQuery: (query: string) => void;
  togglePanel: () => void;
  clearLogs: () => void;
  exportLogs: () => void;
}

// Create the context
export const LogContext = createContext<LogContextProps | null>(null);

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogContext must be used within a LogProvider');
  }
  return context;
};

interface LogProviderProps {
  children: React.ReactNode;
}

export const LogProvider: React.FC<LogProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add throttling state to prevent too many updates
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [pendingLogs, setPendingLogs] = useState<LogEntry[]>([]);
  const [updateCount, setUpdateCount] = useState(0);
  const MAX_UPDATES_PER_SECOND = 10; // Limit updates to prevent infinite loops
  
  // Add a throttled version of setLogs that prevents too many updates
  const throttledSetLogs = (updater: (prevLogs: LogEntry[]) => LogEntry[]) => {
    const now = Date.now();
    
    // If we're updating too frequently, something might be wrong
    if (now - lastUpdateTime < 100) { // Less than 100ms between updates
      setUpdateCount(prevCount => {
        const newCount = prevCount + 1;
        // If we hit too many updates too quickly, stop updating for a moment
        if (newCount > MAX_UPDATES_PER_SECOND) {
          console.warn('Too many log updates detected - possibly an infinite loop. Pausing log updates.');
          // We'll add to pending logs instead of updating state directly
          setPendingLogs(prev => [...prev, ...updater([])]);
          return 0; // Reset the counter but stop updates
        }
        return newCount;
      });
    } else {
      // Reset counter when updates are spaced out enough
      setUpdateCount(1);
      // Process any pending logs plus the new ones
      setLogs(prevLogs => {
        if (pendingLogs.length > 0) {
          // Merge pending logs with the new update
          const result = updater([...pendingLogs, ...prevLogs]);
          setPendingLogs([]); // Clear pending logs
          return result;
        }
        return updater(prevLogs);
      });
      setLastUpdateTime(now);
    }
  };

  // Load initial logs from logger
  useEffect(() => {
    const initialLogs = logger.getLogs();
    setLogs(initialLogs);

    // Subscribe to new logs
    const unsubscribe = logger.addListener((entry) => {
      console.log('Log Listener Triggered:', entry.message, 'Source:', entry.source, 'Level:', entry.level);
      
      // Use the throttled version to prevent infinite loops
      throttledSetLogs(prevLogs => {
        // Check if clearing logs
        if (entry.id === 'clear') {
          return [];
        }
        
        // Otherwise add new log
        return [entry, ...prevLogs].slice(0, 500);
      });
    });

    return () => unsubscribe();
  }, []);

  // Apply filters to get visible logs - memoized to prevent infinite loops
  const visibleLogs = useMemo(() => {
    return logs.filter(log => {
      // Apply level filter
      if (filterLevel && log.level !== filterLevel) {
        return false;
      }

      // Apply source filter
      if (filterSource && log.source !== filterSource) {
        return false;
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          (log.source && log.source.toLowerCase().includes(query)) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [logs, filterLevel, filterSource, searchQuery]);

  // Toggle panel visibility
  const togglePanel = () => setIsOpen(prev => !prev);

  // Clear all logs
  const clearLogs = () => logger.clearLogs();

  // Export logs as JSON
  const exportLogs = () => {
    const json = logger.exportLogs();
    
    // Create a download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-fight-club-logs-${new Date().toISOString()}.json`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
  };

  return (
    <LogContext.Provider
      value={{
        logs,
        visibleLogs,
        isOpen,
        filterLevel,
        filterSource,
        searchQuery,
        setFilterLevel,
        setFilterSource,
        setSearchQuery,
        togglePanel,
        clearLogs,
        exportLogs,
      }}
    >
      {children}
    </LogContext.Provider>
  );
};

export default LogContext;
