/**
 * @type {import('next').NextConfig}
 *
 * Next.js configuration for AI Fight Club frontend
 */

const nextConfig = {
  // Default port setting
  env: {
    PORT: "3000",
  },
  
  // API proxy - pointing to our backend API server running on 3080
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3080/api/:path*', // Verified backend port is 3080
      },
    ];
  },
  
  // Enable React strict mode for better development
  reactStrictMode: true,
  
  // Security improvement - remove X-Powered-By header
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },

  // Improved development mode settings
  typescript: {
    ignoreBuildErrors: false, // Force TypeScript checks during build
  },
  
  // Explicitly enable SWC compiler
  experimental: {
    forceSwcTransforms: true, // Force SWC transforms
  },
  
  onDemandEntries: {
    // Keep pages in memory longer during development
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;
