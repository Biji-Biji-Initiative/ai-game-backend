'use client';

import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLogContext } from './LogContext';
import { LogLevel } from '@/lib/utils/logger';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * LogControls component
 * Provides filtering controls for the log panel
 */
export const LogControls: React.FC = () => {
  const {
    logs,
    filterLevel,
    filterSource,
    searchQuery,
    setFilterLevel,
    setFilterSource,
    setSearchQuery,
  } = useLogContext();

  // Extract unique sources from logs
  const sources = useMemo(() => {
    const uniqueSources = new Set<string>();
    logs.forEach(log => {
      if (log.source) {
        uniqueSources.add(log.source);
      }
    });
    return Array.from(uniqueSources).sort();
  }, [logs]);

  // Handle level filter change
  const handleLevelChange = (value: string) => {
    setFilterLevel(value === 'all' ? null : value as LogLevel);
  };

  // Handle source filter change
  const handleSourceChange = (value: string) => {
    setFilterSource(value === 'all' ? null : value);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterLevel(null);
    setFilterSource(null);
    setSearchQuery('');
  };

  return (
    <div className="border-b p-3 space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-8"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {/* Level filter */}
        <Select
          value={filterLevel || 'all'}
          onValueChange={handleLevelChange}
        >
          <SelectTrigger className="w-1/2">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value={LogLevel.ERROR}>Errors</SelectItem>
            <SelectItem value={LogLevel.WARN}>Warnings</SelectItem>
            <SelectItem value={LogLevel.INFO}>Info</SelectItem>
            <SelectItem value={LogLevel.DEBUG}>Debug</SelectItem>
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={filterSource || 'all'}
          onValueChange={handleSourceChange}
          disabled={sources.length === 0}
        >
          <SelectTrigger className="w-1/2">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map(source => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Show clear button if filters are applied */}
      {(filterLevel || filterSource || searchQuery) && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default LogControls;
