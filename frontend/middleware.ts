import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GamePhase } from "@/store/useGameStore";

// This middleware handles protected routes and CORS for HMR
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  
  // Handle webpack HMR CORS issues - ensure we match all hot update paths
  if (
    request.nextUrl.pathname.includes('webpack-hmr') || 
    request.nextUrl.pathname.includes('hot-update.json') ||
    request.nextUrl.pathname.includes('/_next/static/webpack/')
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
      // Add robust CORS headers for HMR
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }

  // Apply polyfills for exports/module in client side
  if (
    !request.nextUrl.pathname.startsWith('/_next/') &&
    !request.nextUrl.pathname.includes('/api/') &&
    !request.nextUrl.pathname.includes('.') &&
    request.headers.get('accept')?.includes('text/html')
  ) {
    requestHeaders.set('x-apply-polyfills', 'true');
  }

  // Skip game phase middleware for api routes and static files
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Get the current game phase from cookies (stored by Zustand persist)
  const storage = request.cookies.get("ai-fight-club-storage")?.value;
  
  // If there's no storage, allow only the welcome page and shared profiles
  if (!storage) {
    if (
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/shared") &&
      !request.nextUrl.pathname.startsWith("/prompts")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  try {
    // Parse the game state from storage
    const state = JSON.parse(storage);
    const gamePhase = state?.state?.gamePhase || GamePhase.WELCOME;
    
    // Create a map of phases to their numeric order
    const phaseOrder: Record<GamePhase, number> = {
      [GamePhase.WELCOME]: 0,
      [GamePhase.TRAITS]: 1,
      [GamePhase.FOCUS]: 2,
      [GamePhase.ROUND1]: 3,
      [GamePhase.ROUND2]: 4,
      [GamePhase.ROUND3]: 5,
      [GamePhase.RESULTS]: 6,
      [GamePhase.CONTEXT]: 0, // Give same priority as welcome
      [GamePhase.ATTITUDES]: 1 // Give same priority as traits
    };
    
    // Map routes to required phases
    const routePhaseMap: Record<string, GamePhase> = {
      "/traits": GamePhase.TRAITS,
      "/focus": GamePhase.FOCUS,
      "/round1": GamePhase.ROUND1,
      "/round2": GamePhase.ROUND2,
      "/round3": GamePhase.ROUND3,
      "/results": GamePhase.RESULTS,
    };
    
    // The required phase for the requested route
    const requiredPhase = routePhaseMap[request.nextUrl.pathname];
    
    // If this is a phase-locked route, check if the user can access it
    if (requiredPhase) {
      // Check if the current phase is at or beyond the required phase
      const currentPhaseOrder = phaseOrder[gamePhase as GamePhase];
      const requiredPhaseOrder = phaseOrder[requiredPhase as GamePhase];
      
      if (currentPhaseOrder < requiredPhaseOrder) {
        // Redirect to the current phase's route
        const currentPhaseRoute = Object.entries(routePhaseMap).find(
          ([, phase]) => phase === gamePhase
        )?.[0] || "/";
        
        return NextResponse.redirect(new URL(currentPhaseRoute, request.url));
      }
    }
  } catch (error) {
    console.error("Error parsing game state:", error);
    // If there's an error, allow access to welcome page only
    if (request.nextUrl.pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure the middleware to run for all routes except public resources
// Also include webpack HMR routes for CORS handling
export const config = {
  matcher: [
    // Game phase protection routes
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
    // HMR routes for CORS handling - more comprehensive pattern
    "/_next/webpack-hmr",
    "/_next/static/webpack/:path*",
    "/_next/.*\\.hot-update\\.json"
  ],
};
