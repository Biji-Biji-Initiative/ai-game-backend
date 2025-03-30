'use strict';

/**
 * Creates CORS configuration options based on application config
 * 
 * @param {Object} config - Application configuration object
 * @param {Object} logger - Logger instance
 * @returns {Object} CORS options for Express cors middleware
 */
export function getCorsOptions(config, logger) {
  const corsOptions = {
    origin: config.isProduction 
      ? (origin, callback) => {
          // In production, allow only whitelisted origins
          if (!origin || (Array.isArray(config.cors.allowedOrigins) && config.cors.allowedOrigins.includes(origin))) {
            callback(null, true);
          } else {
            logger.warn('CORS blocked request from unauthorized origin', { origin });
            callback(new Error('Not allowed by CORS'));
          }
        }
      : config.cors.allowedOrigins, // In development, use the value from config (defaults to '*')
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: config.cors.exposedHeaders,
    credentials: config.cors.credentials,
    maxAge: config.cors.maxAge
  };
  
  return corsOptions;
}

export default { getCorsOptions }; 