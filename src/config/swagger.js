'use strict';

/**
 * Swagger Configuration
 *
 * Contains configuration for Swagger documentation
 */
const path = require('path');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AI Fight Club API',
    version: '1.0.0',
    description: 'API documentation for the AI Fight Club application',
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
    contact: {
      name: 'Support',
      url: 'https://aifightclub.example.com',
      email: 'support@aifightclub.example.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  // Path to the API docs
  apis: [
    path.resolve(__dirname, '../core/*/controllers/*.js'),
    path.resolve(__dirname, '../core/*/schemas/*.js'),
    path.resolve(__dirname, '../core/*/models/*.js'),
    path.resolve(__dirname, '../core/infra/http/routes/*.js'),
    path.resolve(__dirname, '../../openapi/**/*.yaml'),
  ],
};

module.exports = options;
