'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import logger, { LogEntry, LogLevel } from '@/lib/utils/logger';

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
  
  // Use refs for mutable values that shouldn't trigger re-renders
  const pendingLogsRef = useRef<LogEntry[]>([]);
  const isThrottledRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logsRef = useRef<LogEntry[]>([]);
  
  // Update the ref whenever logs change
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);
  
  // Constants
  const THROTTLE_TIME = 500; // ms
  const MAX_LOG_ENTRIES = 500;
  
  // Process all pending logs in a batch
  const processPendingLogs = useCallback(() => {
    if (pendingLogsRef.current.length === 0) {return;}
    
    setLogs(prevLogs => {
      // Special case for clearing logs
      if (pendingLogsRef.current.length === 1 && pendingLogsRef.current[0].id === 'clear') {
        pendingLogsRef.current = [];
        return [];
      }
      
      // Combine pending logs with existing logs
      const allEntries = [...pendingLogsRef.current, ...prevLogs];
      
      // Limit to MAX_LOG_ENTRIES to prevent memory issues
      const result = allEntries.slice(0, MAX_LOG_ENTRIES);
      
      // Clear pending logs
      pendingLogsRef.current = [];
      
      return result;
    });
    
    // Reset throttle state
    isThrottledRef.current = false;
    lastUpdateTimeRef.current = Date.now();
  }, []); // No dependencies needed
  
  // Add logs to pending queue and schedule processing if needed
  const queueLogUpdate = useCallback((newEntries: LogEntry[]) => {
    // Add new entries to pending logs
    pendingLogsRef.current = [...pendingLogsRef.current, ...newEntries];
    
    // If already throttled, just let the existing timer handle it
    if (isThrottledRef.current) {return;}
    
    // Check if we need to throttle
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 100) {
      // Start throttling
      isThrottledRef.current = true;
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Set timer to process logs after throttle period
      timerRef.current = setTimeout(() => {
        processPendingLogs();
      }, THROTTLE_TIME);
    } else {
      // Not throttling, process immediately
      processPendingLogs();
    }
  }, [processPendingLogs]); // Only depend on processPendingLogs

  // Load initial logs and set up listener - this effect only runs once
  useEffect(() => {
    const initialLogs = logger.getLogs();
    setLogs(initialLogs);

    // Subscribe to new logs
    const unsubscribe = logger.addListener((entry) => {
      queueLogUpdate([entry]);
    });

    // Clean up on unmount
    return () => {
      unsubscribe();
      // Clear any pending timeout
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [queueLogUpdate]); // Add queueLogUpdate as a dependency

  // Apply filters to get visible logs - memoized to prevent recalculation
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
  }, [logs, filterLevel, filterSource, searchQuery]); // Required dependencies for filtering

  // Define simple actions 
  const togglePanel = useCallback(() => setIsOpen(prev => !prev), []);
  const clearLogs = useCallback(() => logger.clearLogs(), []);

  // Export logs as JSON
  const exportLogs = useCallback(() => {
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
  }, []); // No dependencies needed

  // Create memoized context value to prevent unnecessary renders
  const contextValue = useMemo(() => ({
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
  }), [
    logs, 
    visibleLogs, 
    isOpen, 
    filterLevel, 
    filterSource, 
    searchQuery,
    togglePanel, // Include stable function references
    clearLogs,
    exportLogs
  ]);

  return (
    <LogContext.Provider value={contextValue}>
      {children}
    </LogContext.Provider>
  );
};

export default LogContext;
