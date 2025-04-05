import { useRef, useEffect } from 'react';
import { shallow } from 'zustand/shallow';

/**
 * Wrapper for Zustand store to debug subscriptions and prevent infinite loops
 * @param storeName Name of the store for logging
 * @param useStore The Zustand store hook to use
 * @returns A wrapped version of the store with debugging
 */
export function createDebugStore<T extends object>(
  storeName: string,
  useStore: (selector: (state: T) => any, equalityFn?: (a: any, b: any) => boolean) => any
) {
  // Create a counter to track subscriptions
  const subscriptionCount: Record<string, number> = {};
  
  // Return a wrapped version of the store
  return function useDebugStore<U>(
    selector: (state: T) => U,
    equalityFn: (a: U, b: U) => boolean = shallow,
    selectorName = 'unnamed'
  ): U {
    const selectorId = `${storeName}.${selectorName}`;
    const renderCountRef = useRef(0);
    const prevStateRef = useRef<U | null>(null);
    
    // Call the original store
    const result = useStore(selector, equalityFn);
    
    // Debug on each render
    useEffect(() => {
      renderCountRef.current += 1;
      subscriptionCount[selectorId] = (subscriptionCount[selectorId] || 0) + 1;
      
      console.group(`🔍 ${selectorId} render #${renderCountRef.current}`);
      
      // Check if state changed
      if (prevStateRef.current !== null) {
        const changed = !equalityFn(prevStateRef.current, result);
        console.log(`State changed: ${changed}`);
        
        if (changed) {
          console.log('Previous:', prevStateRef.current);
          console.log('Current:', result);
          
          // If it's an object, show specific changes
          if (typeof result === 'object' && result !== null) {
            const prevObj = prevStateRef.current as any;
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
              console.log('Changed properties:', changedKeys);
              changedKeys.forEach(key => {
                console.log(`${key}:`, prevObj?.[key], ' → ', nextObj?.[key]);
              });
            }
          }
        }
      }
      
      // Check for potential subscription issues
      if (subscriptionCount[selectorId] > 25) {
        console.error(`⚠️ ${selectorId} has ${subscriptionCount[selectorId]} subscriptions - potential memory leak or infinite loop`);
        debugger; // Break in DevTools if open
      }
      
      console.groupEnd();
      
      prevStateRef.current = result;
      
      return () => {
        subscriptionCount[selectorId] = Math.max(0, (subscriptionCount[selectorId] || 0) - 1);
      };
    });
    
    return result;
  };
} 