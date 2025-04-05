'use client';

import React from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import CustomErrorBoundary from "@/components/ui/custom-error-boundary";
import { QueryProvider } from "@/providers/QueryProvider";
import { ApiProvider } from "@/contexts/api-context";
import AccessibilityProvider from "@/providers/AccessibilityProvider";
import SessionProvider from "@/providers/SessionProvider";
import DOMClassApplier from "@/features/ui/DOMClassApplier";
import { Toaster } from "@/components/ui/toaster";
import { DebugPanel } from '@/components/dev/DebugPanel';

// These providers don't exist yet - we'll need to create them
// import LogProvider from "@/providers/LogProvider";
// import { ThemeProvider } from '@/providers/ThemeProvider';
// import { AuthProvider } from '@/providers/AuthProvider';
// import { StoreProvider } from '@/providers/StoreProvider';
// import { ToastProvider } from '@/providers/ToastProvider';

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
      <DOMClassApplier>
        <SessionProvider>
          <ApiProvider>
            <QueryProvider>
              <AccessibilityProvider>
                {/* Removed missing LogProvider */}
                <AppLayout>
                  {children}
                  <Toaster />
                  {process.env.NODE_ENV === 'development' && <DebugPanel />}
                </AppLayout>
              </AccessibilityProvider>
            </QueryProvider>
          </ApiProvider>
        </SessionProvider>
      </DOMClassApplier>
    </CustomErrorBoundary>
  );
} 