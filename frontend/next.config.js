/**
 * @type {import('next').NextConfig}
 *
 * Next.js configuration for AI Fight Club frontend
 */

/**
 * Validates required environment variables
 * Only enforced in production to make local development easier
 */
const validateEnv = () => {
  const requiredEnvs = [];
  
  // In production, validate required environment variables
  if (process.env.NODE_ENV === 'production') {
    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    
    if (missingEnvs.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
    }
  }
};

// Run validation
validateEnv();

const nextConfig = {
  // Set environment variables
  env: {
    PORT: "3333", // Using string to comply with Next.js requirements
  },
  
  // Configure API proxy for backend requests
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3333/api/:path*',
      },
    ];
  },
  // Disable strict mode to reduce potential issues with HMR
  reactStrictMode: false,
  // Remove swcMinify as it's causing conflicts with Babel
  poweredByHeader: false, // Remove X-Powered-By header for security
  images: {
    domains: [],
    // Configure image optimization
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: [],
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // Cache optimization
    optimizeCss: true,
    // Disable turbo as it might conflict with our setup
    turbo: false,
  },
  // Server packages configuration
  serverExternalPackages: [], 
  // Configure webpack for additional optimizations
  webpack: (config, { isServer, webpack, dev }) => {
    // Fix for the interop require default issue
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Add compatibility mode for interop helpers
        '_interop_require_default': require.resolve(
          'next/dist/compiled/@babel/runtime/helpers/interopRequireDefault'
        ),
      };
      
      // Add additional headers for HMR requests when in dev mode
      if (dev) {
        // Ensure the hotMiddleware configuration exists
        if (!config.devServer) {
          config.devServer = {};
        }
        
        // Configure HMR headers
        config.devServer.headers = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        };
      }
    }

    // Handle server vs client specific configuration
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    } else {
      // Client-side fixes for exports/module issues
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        exports: false,
      };
      
      // Hot Module Replacement improvements
      if (dev) {
        // For Fast Refresh to work properly
        config.plugins.push(
          new webpack.HotModuleReplacementPlugin({
            multiStep: true, // More gradual updates, less full reloads
          })
        );
        
        // Configure Fast Refresh
        config.experiments = {
          ...config.experiments,
          topLevelAwait: true,
          layers: true,
        };
      }
    }

    return config;
  },
};

module.exports = nextConfig;
