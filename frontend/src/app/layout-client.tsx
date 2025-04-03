'use client';

// Remove direct import of polyfills and use our React-friendly provider instead
import React from 'react';
import { AppLayout } from "@/components/layout/app-layout";
// Import our custom error boundary instead of Next.js's problematic one
import CustomErrorBoundary from "@/components/ui/custom-error-boundary";
import QueryProvider from "@/providers/QueryProvider";
import { ApiProvider } from "@/contexts/api-context";
import AccessibilityProvider from "@/providers/AccessibilityProvider";
import { LogProvider } from "@/features/logging/LogContext";
import LogPanel from "@/features/logging/LogPanel";
import DOMClassApplier from "./dom-class-applier";
// Import our new PolyfillProvider
import PolyfillProvider from "@/providers/PolyfillProvider";

interface ClientWrapperProps {
  children: React.ReactNode;
}

/**
 * ClientWrapper component
 * 
 * This component wraps all client-side functionality to ensure layout.tsx stays
 * a server component (which is required for metadata).
 */
export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <CustomErrorBoundary>
      {/* Add PolyfillProvider for React-compatible polyfills - this improves Fast Refresh */}
      <PolyfillProvider>
        <ApiProvider>
          <QueryProvider>
            <AccessibilityProvider>
              <LogProvider>
                {/* Centralized DOM class manipulation */}
                <DOMClassApplier />
                <AppLayout>{children}</AppLayout>
                <LogPanel />
              </LogProvider>
            </AccessibilityProvider>
          </QueryProvider>
        </ApiProvider>
      </PolyfillProvider>
    </CustomErrorBoundary>
  );
} 