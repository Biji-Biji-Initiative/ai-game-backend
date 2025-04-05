'use client';

// import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

/**
 * This component wraps the application with a mock SessionProvider
 * that bypasses authentication checks during development.
 * 
 * TEMPORARY MOCK: This implementation bypasses NextAuth to allow
 * frontend development without a backend connection.
 * 
 * To restore real authentication:
 * 1. Uncomment the import above
 * 2. Replace the implementation with the commented version below
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  console.log('Using MOCKED SessionProvider - bypassing NextAuth');
  return <>{children}</>;
  
  // Real implementation (commented out for now):
  // return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

export default SessionProvider; 