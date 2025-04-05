import NextAuth from "next-auth";
import { authConfig, GamePhase, ROUTE_PHASES, PROGRESSION_PATHS } from "../../../../../auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JWT } from "next-auth/jwt";

// Extend the built-in User type to include our game phase
declare module "next-auth" {
  interface User {
    gamePhase?: GamePhase;
  }
  
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      gamePhase?: GamePhase;
    }
  }
}

// Extend JWT type to include our custom fields
declare module "next-auth/jwt" {
  interface JWT {
    gamePhase?: GamePhase;
  }
}

// Create API route handler with providers
const _handler = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is where you would normally validate credentials with your backend
        // For now, we'll use placeholder validation logic
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // TODO: Replace with actual API call to your backend
          // Example API call structure:
          // const response = await fetch('https://your-api.com/auth/login', {
          //   method: 'POST',
          //   body: JSON.stringify(credentials),
          //   headers: { 'Content-Type': 'application/json' }
          // });
          // const user = await response.json();
          
          // For development: simulate successful login with test account
          if (credentials.email === "user@example.com" && credentials.password === "password") {
            return {
              id: "1",
              name: "Test User",
              email: credentials.email,
              gamePhase: GamePhase.ACCOUNT_CREATED, // Initial game phase for new users
            };
          }
          
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    // Note: We're not spreading authConfig.callbacks here because
    // we need to redefine the authorized callback with correct types
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      
      // Public routes are always accessible
      const isPublicRoute = ['/login', '/register', '/'].includes(pathname);
      if (isPublicRoute) {
        return true;
      }
      
      // Protected routes require login
      if (!isLoggedIn) {
        return false;
      }
      
      // Check if user has reached the game phase required for this route
      const requiredPhase = ROUTE_PHASES[pathname];
      if (!requiredPhase) {
        return true; // If no specific phase is required, allow access
      }
      
      // Get user's current game phase from the user object
      const userPhase = auth.user?.gamePhase || GamePhase.PUBLIC;
      
      // Check if user has completed all prerequisites for the required phase
      const prerequisites = PROGRESSION_PATHS[requiredPhase] || [];
      return prerequisites.includes(userPhase) || userPhase === requiredPhase;
    },
    // Add JWT callback to include game phase in token
    async jwt({ token, user }) {
      if (user) {
        token.gamePhase = user.gamePhase;
      }
      return token;
    },
    // Add session callback to make game phase available in client
    async session({ session, token }) {
      if (token && session.user) {
        session.user.gamePhase = token.gamePhase as GamePhase;
      }
      return session;
    }
  }
});

export { GET, POST } from './auth'; 