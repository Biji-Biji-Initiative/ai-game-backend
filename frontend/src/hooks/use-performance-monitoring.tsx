import React, { useEffect, useRef } from 'react';

/**
 * Higher-order component to monitor component rendering performance
 * @param Component The component to monitor
 * @param options Configuration options
 * @returns The monitored component
 */
export function withPerformanceMonitoring<P>(
  Component: React.ComponentType<P>,
  options: {
    name?: string;
    warningThreshold?: number; // in ms
    breakOnRenderCount?: number;
  } = {}
) {
  const componentName = options.name || Component.displayName || Component.name || 'UnknownComponent';
  const warningThreshold = options.warningThreshold || 16; // 60fps = ~16ms per frame
  const breakOnRenderCount = options.breakOnRenderCount || 50;

  function MonitoredComponent(props: P) {
    const renderCount = useRef(0);
    const startTime = useRef(performance.now());
    
    useEffect(() => {
      renderCount.current += 1;
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      if (renderTime > warningThreshold) {
        console.warn(
          `🐢 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms to render (#${renderCount.current})`
        );
      }
      
      if (renderCount.current === 1) {
        console.log(`🚀 ${componentName} mounted`);
      } else {
        console.log(`🔄 ${componentName} re-rendered (#${renderCount.current})`);
      }
      
      if (renderCount.current > breakOnRenderCount) {
        console.error(`⚠️ ${componentName} rendered too many times (${renderCount.current}), possible infinite loop`);
        debugger; // Break in DevTools if open
      }
      
      // Reset for next render
      startTime.current = performance.now();
      
      return () => {
        if (renderCount.current === 1) {
          console.log(`👋 ${componentName} unmounted after 1 render`);
        } else {
          console.log(`👋 ${componentName} unmounted after ${renderCount.current} renders`);
        }
      };
    });
    
    return <Component {...props} />;
  }
  
  MonitoredComponent.displayName = `Monitored(${componentName})`;
  
  return MonitoredComponent;
}

/**
 * Hook version of the performance monitoring
 * @param componentName Name of the component for logging
 * @param warningThreshold Render time threshold for warnings (ms)
 * @returns The current render count
 */
export function usePerformanceMonitoring(
  componentName: string,
  warningThreshold = 16
) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    if (renderTime > warningThreshold) {
      console.warn(
        `🐢 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms to render (#${renderCount.current})`
      );
    }
    
    if (renderCount.current === 1) {
      console.log(`🚀 ${componentName} mounted`);
    } else {
      console.log(`🔄 ${componentName} re-rendered (#${renderCount.current})`);
    }
    
    // Reset for next render
    startTime.current = performance.now();
    
    return () => {
      console.log(`👋 ${componentName} unmounted after ${renderCount.current} renders`);
    };
  });
  
  return renderCount.current;
} 