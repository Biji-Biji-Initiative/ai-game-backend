import { useRef, useEffect } from 'react';

/**
 * Hook to track component renders and log when props change
 * @param componentName Name of the component for logging
 * @param props Component props to track
 * @returns Current render count
 */
export function useRenderTracker(componentName: string, props: any = {}) {
  const renderCount = useRef(0);
  const prevProps = useRef<any>(props);
  
  useEffect(() => {
    renderCount.current += 1;
    
    // Check which props changed
    const changedProps = Object.keys(props).filter(
      key => prevProps.current?.[key] !== props[key]
    );
    
    console.group(`🔄 ${componentName} render #${renderCount.current}`);
    if (changedProps.length > 0) {
      console.log('Changed props:', changedProps);
      changedProps.forEach(prop => {
        console.log(`${prop}: ${JSON.stringify(prevProps.current?.[prop])} → ${JSON.stringify(props[prop])}`);
      });
    } else {
      console.log('No props changed. State or context may have changed.');
    }
    console.groupEnd();
    
    prevProps.current = {...props};
  });
  
  return renderCount.current;
} 