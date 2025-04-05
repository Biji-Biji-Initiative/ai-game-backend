import { useRef, useEffect, useMemo, useCallback } from 'react';
import { shallow } from 'zustand/shallow';

/**
 * Hook to debug Zustand selectors and track state changes
 * @param name Name of the selector for logging
 * @param store Zustand store hook (e.g., useGameStore)
 * @param selector Selector function that extracts state from the store
 * @param equalityFn Equality function to use (defaults to shallow)
 * @returns Result of the selector
 */
export function useSelectorDebug<T, U>(
  name: string,
  store: any,
  selector: (state: T) => U,
  equalityFn = shallow
) {
  // Memoize the selector function to avoid recreating it on each render
  const memoizedSelector = useCallback(selector, []);
  
  // Use the store directly to handle subscriptions properly
  const storeState = store.getState();
  
  // Compute the selection result only once per render
  const result = useMemo(() => {
    return memoizedSelector(storeState);
  }, [memoizedSelector, storeState]);
  
  // For debugging, track previous values
  const prevResultRef = useRef<U | null>(null);
  
  // Log changes to the console when selection changes
  useEffect(() => {
    const prevResult = prevResultRef.current;
    
    // Skip the first render
    if (prevResult === null) {
      prevResultRef.current = result;
      return;
    }
    
    // Compare the previous and current results
    const prevObj = prevResult as any;
    const nextObj = result as any;
    
    // Get all keys from both objects
    const allKeys = [...new Set([
      ...Object.keys(prevObj || {}), 
      ...Object.keys(nextObj || {})
    ])];
    
    // Check which values changed
    const changedKeys = allKeys.filter(
      key => prevObj?.[key] !== nextObj?.[key]
    );
    
    if (changedKeys.length > 0) {
      console.group(`🔄 ${name} selector changed`);
      changedKeys.forEach(key => {
        console.log(`${key}: ${JSON.stringify(prevObj?.[key])} → ${JSON.stringify(nextObj?.[key])}`);
      });
      console.groupEnd();
    }
    
    prevResultRef.current = result;
  }, [result, name]);
  
  // Subscribe to store changes
  useEffect(() => {
    // Create a subscription to the store
    const unsubscribe = store.subscribe(
      // Callback to run when store state changes
      (state: T) => {
        // We don't need to do anything here, the component will re-render
        // and the memoized result will be recalculated
      }
    );
    
    // Cleanup subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, [store]);
  
  return result;
} 