'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { shallow } from 'zustand/shallow';

/**
 * Component to display debugging information in development mode
 */
export function DebugPanel() {
  // These hooks must be called before any conditional return
  const [isVisible, setIsVisible] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'state' | 'renders' | 'performance'>('state');
  const [stateSnapshot, setStateSnapshot] = useState<any>(null);
  
  // Early return if not in development mode
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Use a memoized selector function
  const getGameState = useCallback(() => {
    const state = useGameStore.getState();
    return {
      isAuthenticated: state.isAuthenticated,
      userId: state.userId,
      gamePhase: state.gamePhase,
      userInfo: state.userInfo,
      focus: state.focus,
      profile: state.profile ? { id: state.profile.id } : null,
      history: state.history.slice(-5) // Last 5 history items
    };
  }, []);

  // Effect to update the state snapshot when visible
  useEffect(() => {
    if (isVisible) {
      setStateSnapshot(getGameState());
    }
  }, [isVisible, getGameState]);
  
  // Track component renders once on mount
  useEffect(() => {
    setRenderCount(prevCount => prevCount + 1);
  }, []);
  
  // Subscribe to store changes to update the snapshot when visible
  useEffect(() => {
    // Only setup subscription if panel is visible
    if (!isVisible) return;
    
    const unsubscribe = useGameStore.subscribe(
      () => {
        setStateSnapshot(getGameState());
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [isVisible, getGameState]);
  
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg"
        title="Toggle Debug Panel"
      >
        🐞
      </button>
      
      {/* Debug panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-gray-800 text-white p-4 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Debug Panel</h2>
            <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-4">
            <button
              className={`py-2 px-4 ${selectedTab === 'state' ? 'border-b-2 border-blue-500' : ''}`}
              onClick={() => setSelectedTab('state')}
            >
              State
            </button>
            <button
              className={`py-2 px-4 ${selectedTab === 'renders' ? 'border-b-2 border-blue-500' : ''}`}
              onClick={() => setSelectedTab('renders')}
            >
              Renders
            </button>
            <button
              className={`py-2 px-4 ${selectedTab === 'performance' ? 'border-b-2 border-blue-500' : ''}`}
              onClick={() => setSelectedTab('performance')}
            >
              Performance
            </button>
          </div>
          
          {/* Tab content */}
          {selectedTab === 'state' && (
            <div>
              <h3 className="text-md font-semibold mb-2">Game State</h3>
              <button 
                onClick={() => setStateSnapshot(getGameState())}
                className="mb-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
              >
                Refresh State
              </button>
              <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-80">
                {JSON.stringify(stateSnapshot, null, 2)}
              </pre>
            </div>
          )}
          
          {selectedTab === 'renders' && (
            <div>
              <p className="mb-2">This panel has rendered {renderCount} times</p>
              <p className="text-xs text-gray-400">
                Enable the React DevTools profiler to see renders across all components
              </p>
            </div>
          )}
          
          {selectedTab === 'performance' && (
            <div>
              <p className="mb-2">Performance monitoring</p>
              <button
                className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm mb-2"
                onClick={() => {
                  console.log('Forcing garbage collection (if available)');
                  if (typeof window !== 'undefined' && 'gc' in window) {
                    (window as any).gc();
                  } else {
                    console.log('GC not accessible. Open Chrome with --js-flags="--expose-gc"');
                  }
                }}
              >
                Force GC (if available)
              </button>
              <p className="text-xs text-gray-400">
                Open browser DevTools and check the Console and Performance tabs
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
} 