import NextAuth from "next-auth";
import { authConfig, GamePhase } from "../../../../../auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

/**
 * This is the NextAuth.js authentication configuration used by the auth() function
 * for server-side authentication and by the middleware.
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    // Email/Password Login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is where you would normally validate credentials with your backend
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Make a request to the backend login endpoint
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          
          // Return the user object with the game phase
          if (data?.data?.user) {
            return {
              id: data.data.user.id || "1", // Fallback to "1" if id is not available
              name: data.data.user.fullName,
              email: data.data.user.email,
              gamePhase: GamePhase.ACCOUNT_CREATED, // Set initial game phase
              accessToken: data.data.accessToken, // Store the access token for API calls
            };
          }
          
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
      // Add any additional Google-specific configuration here
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          gamePhase: GamePhase.ACCOUNT_CREATED, // Set initial game phase
        };
      }
    }),

    // Magic Link Email Provider
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp.example.com",
        port: process.env.EMAIL_SERVER_PORT ? parseInt(process.env.EMAIL_SERVER_PORT) : 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER || "dummy-user",
          pass: process.env.EMAIL_SERVER_PASSWORD || "dummy-password",
        },
      },
      from: process.env.EMAIL_FROM || "noreply@example.com",
      // Custom magic link handling
      sendVerificationRequest: async ({ identifier, url, provider: _provider }) => {
        // In production, this would send an email with the magic link
        // For our placeholder, we'll just log it
        console.warn(`Magic link for ${identifier}: ${url}`);
        
        // Ideally, we would send a request to a backend API to handle this
        // Example:
        // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sendMagicLink`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ email: identifier, callbackUrl: url })
        // });
      },
    }),
  ],
  callbacks: {
    // Add JWT callback to include game phase and access token in token
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.gamePhase = user.gamePhase;
        
        // For credential login, we already have the access token from the authorize function
        if (user.accessToken) {
          token.accessToken = user.accessToken;
        }
        
        // For OAuth (Google) login, we might get the access token from the account
        if (account?.access_token) {
          token.accessToken = account.access_token;
          
          // We should also register or login this user with our backend
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/oauth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: account.provider,
                accessToken: account.access_token,
                idToken: account.id_token,
                // Add any other needed OAuth data
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data?.data?.accessToken) {
                token.accessToken = data.data.accessToken; // Update with the backend token
              }
            }
          } catch (error) {
            console.error("OAuth backend authentication error:", error);
          }
        }
      }
      return token;
    },
    // Add session callback to make game phase and access token available in client
    async session({ session, token }) {
      if (token && session.user) {
        session.user.gamePhase = token.gamePhase as GamePhase;
        session.accessToken = token.accessToken as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-request', // Used for magic link email verification
    error: '/login',    // Error page
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === 'development',
}); 