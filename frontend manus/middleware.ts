import { NextResponse, NextRequest } from "next/server";
import { auth } from "./src/app/api/auth/[...nextauth]/auth";

/**
 * Middleware to provide authentication protection for specific routes.
 * The game itself is accessible without authentication, but certain actions
 * (like saving progress) require the user to be logged in.
 * 
 * This middleware only protects routes that require authentication before
 * even loading the page. Most auth checks happen at the component/API level.
 */
export async function middleware(request: NextRequest) {
  const session = await auth();
  
  // Allow access if the user is authenticated
  if (session) {
    return NextResponse.next();
  }
  
  // Redirect to login page if authentication is required
  return NextResponse.redirect(new URL('/login', request.url));
}

/**
 * Configure which routes require authentication.
 * 
 * Note: The game itself doesn't require login to start playing.
 * Most routes are public, and authentication is only checked when 
 * performing specific actions like saving progress.
 */
export const config = {
  matcher: [
    // Protected routes that require authentication
    "/profile",
    "/settings",
    "/saved-games",
    // Add other protected routes as needed
  ],
};
