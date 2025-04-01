import path from "path";
import { fileURLToPath } from 'url';
import config from "#app/config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

'use strict';

/**
 * Swagger configuration for API documentation
 * This is the single source of truth for the OpenAPI specification
 */
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'AI Fight Club API',
        version: '1.0.0',
        description: 'API documentation for the AI Fight Club application - a platform for AI coding challenges and evaluation',
        license: {
            name: 'ISC',
            url: 'https://opensource.org/licenses/ISC',
        },
        contact: {
            name: 'Support',
            url: 'https://aifightclub.example.com',
            email: 'support@aifightclub.example.com',
        },
        termsOfService: 'https://aifightclub.example.com/terms',
        'x-api-versioning': {
            strategy: 'uri-path',
            current: 'v1',
            deprecated: [],
            sunset: []
        }
    },
    servers: [
        {
            url: config.api.prefix,
            description: 'Current server (relative path)',
        },
        {
            url: config.fullApiUrl,
            description: 'Complete API URL',
        }
    ],
    // Add a minimal paths object to satisfy OpenAPI spec requirements
    // The rest of the paths will be populated by swagger-jsdoc from JSDoc annotations
    paths: {
        '/health': {
            get: {
                summary: 'Health check endpoint',
                description: 'Returns the health status of the API',
                tags: ['System'],
                parameters: [
                    {
                        name: 'format',
                        in: 'query',
                        description: 'Response format (json or text)',
                        schema: {
                            type: 'string',
                            enum: ['json', 'text'],
                            default: 'json'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'API is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            example: 'ok'
                                        },
                                        mode: {
                                            type: 'string',
                                            example: config.server.environment
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token authentication. Use the token from the login response. Tokens expire after 24 hours.',
            },
        },
        parameters: {
            limitParam: {
                name: 'limit',
                in: 'query',
                description: 'Maximum number of items to return per page (default: 20, max: 100)',
                schema: {
                    type: 'integer',
                    default: 20,
                    minimum: 1,
                    maximum: 100
                }
            },
            offsetParam: {
                name: 'offset',
                in: 'query',
                description: 'Number of items to skip (for pagination)',
                schema: {
                    type: 'integer',
                    default: 0,
                    minimum: 0
                }
            },
            sortParam: {
                name: 'sort',
                in: 'query',
                description: 'Field to sort by (prefix with - for descending order)',
                schema: {
                    type: 'string',
                    example: '-createdAt'
                }
            },
            filterParam: {
                name: 'filter',
                in: 'query',
                description: 'Filter criteria in format: field:operator:value (e.g., difficulty:eq:advanced)',
                schema: {
                    type: 'string'
                }
            }
        },
        responses: {
            UnauthorizedError: {
                description: 'Authentication information is missing or invalid',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    example: false
                                },
                                message: {
                                    type: 'string',
                                    example: 'Unauthorized - Invalid or missing token'
                                }
                            }
                        }
                    }
                }
            },
            NotFoundError: {
                description: 'The specified resource was not found',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    example: false
                                },
                                message: {
                                    type: 'string',
                                    example: 'Resource not found'
                                }
                            }
                        }
                    }
                }
            },
            ValidationError: {
                description: 'The request data failed validation',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    example: false
                                },
                                message: {
                                    type: 'string',
                                    example: 'Validation error'
                                },
                                errors: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            field: {
                                                type: 'string'
                                            },
                                            message: {
                                                type: 'string'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            RateLimitError: {
                description: 'Too many requests, rate limit exceeded',
                headers: {
                    'X-RateLimit-Limit': {
                        schema: {
                            type: 'integer'
                        },
                        description: 'Request limit per hour'
                    },
                    'X-RateLimit-Remaining': {
                        schema: {
                            type: 'integer'
                        },
                        description: 'Remaining requests in the current period'
                    },
                    'X-RateLimit-Reset': {
                        schema: {
                            type: 'integer',
                            format: 'unix-time'
                        },
                        description: 'Time when the rate limit resets'
                    }
                },
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    example: false
                                },
                                message: {
                                    type: 'string',
                                    example: 'Rate limit exceeded'
                                },
                                retryAfter: {
                                    type: 'integer',
                                    example: 30,
                                    description: 'Seconds to wait before retrying'
                                }
                            }
                        }
                    }
                }
            },
            PaginatedResponse: {
                description: 'A paginated list of items',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    example: true
                                },
                                data: {
                                    type: 'array',
                                    items: {
                                        type: 'object'
                                    }
                                },
                                pagination: {
                                    type: 'object',
                                    properties: {
                                        total: {
                                            type: 'integer',
                                            description: 'Total number of items available'
                                        },
                                        limit: {
                                            type: 'integer',
                                            description: 'Number of items per page'
                                        },
                                        offset: {
                                            type: 'integer',
                                            description: 'Current offset from the first item'
                                        },
                                        hasMore: {
                                            type: 'boolean',
                                            description: 'Whether more items are available'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        schemas: {
            PaginationParams: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'integer',
                        default: 20,
                        minimum: 1,
                        maximum: 100,
                        description: 'Maximum number of items to return'
                    },
                    offset: {
                        type: 'integer',
                        default: 0,
                        minimum: 0,
                        description: 'Number of items to skip'
                    },
                    sort: {
                        type: 'string',
                        description: 'Field to sort by (prefix with - for descending order)'
                    }
                }
            },
            FilterParams: {
                type: 'object',
                properties: {
                    field: {
                        type: 'string',
                        description: 'Field name to filter on'
                    },
                    operator: {
                        type: 'string',
                        enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like'],
                        description: 'Comparison operator'
                    },
                    value: {
                        type: 'string',
                        description: 'Value to compare against'
                    }
                }
            },
            // Core entity schemas
            User: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Unique identifier for the user'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'Email address of the user' 
                    },
                    name: {
                        type: 'string',
                        description: 'Full name of the user'
                    },
                    profileCompleted: {
                        type: 'boolean',
                        description: 'Whether the user has completed their profile'
                    },
                    role: {
                        type: 'string',
                        enum: ['user', 'admin'],
                        description: 'User role'
                    },
                    focusAreas: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Focus areas selected by the user'
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'When the user was created'
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'When the user was last updated'
                    }
                }
            },
            Challenge: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Unique identifier for the challenge'
                    },
                    title: {
                        type: 'string',
                        description: 'Title of the challenge'
                    },
                    description: {
                        type: 'string',
                        description: 'Detailed description of the challenge'
                    },
                    difficulty: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
                        description: 'Difficulty level of the challenge'
                    },
                    focusArea: {
                        type: 'string',
                        description: 'Primary focus area of the challenge'
                    },
                    type: {
                        type: 'string', 
                        enum: ['implementation', 'debugging', 'optimization', 'design'],
                        description: 'Type of challenge'
                    },
                    formatType: {
                        type: 'string',
                        enum: ['code', 'text', 'mixed'],
                        description: 'Format type for the challenge response'
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'When the challenge was created'
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time', 
                        description: 'When the challenge was last updated'
                    }
                }
            }
        }
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
    externalDocs: {
        description: 'Additional Documentation',
        url: 'https://docs.aifightclub.example.com'
    },
    tags: [
        {
            name: 'Auth',
            description: 'Authentication operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/auth'
            }
        },
        {
            name: 'Users',
            description: 'User management operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/users'
            }
        },
        {
            name: 'Challenges',
            description: 'Challenge management operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/challenges'
            }
        },
        {
            name: 'Evaluations',
            description: 'Evaluation operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/evaluations'
            }
        },
        {
            name: 'Progress',
            description: 'User progress tracking operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/progress'
            }
        },
        {
            name: 'FocusAreas',
            description: 'Focus area management operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/focus-areas'
            }
        },
        {
            name: 'UserJourney',
            description: 'User journey tracking operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/user-journey'
            }
        },
        {
            name: 'System',
            description: 'System operations',
            externalDocs: {
                url: 'https://docs.aifightclub.example.com/system'
            }
        }
    ]
};

export default function getSwaggerOptions() {
    try {
        // Deep clone the definition to avoid mutation issues
        const clonedDefinition = JSON.parse(JSON.stringify(swaggerDefinition));
        
        // Ensure all critical properties exist to avoid null/undefined issues
        if (!clonedDefinition.components) clonedDefinition.components = {};
        if (!clonedDefinition.components.schemas) clonedDefinition.components.schemas = {};
        if (!clonedDefinition.components.responses) clonedDefinition.components.responses = {};
        if (!clonedDefinition.components.parameters) clonedDefinition.components.parameters = {};
        if (!clonedDefinition.components.securitySchemes) clonedDefinition.components.securitySchemes = {};
        
        // Also ensure paths exists
        if (!clonedDefinition.paths) clonedDefinition.paths = {};
        
        // In development mode, we can add extra debugging information
        if (config.isDevelopment) {
            clonedDefinition.info.description += ' (Development Mode)';
        }
        
        return {
            swaggerDefinition: clonedDefinition,
            apis: [
                // Core API controllers and route definitions
                path.resolve(__dirname, '../core/*/controllers/*.js'),
                path.resolve(__dirname, '../core/*/schemas/*.js'),
                path.resolve(__dirname, '../core/*/models/*.js'),
                path.resolve(__dirname, '../core/infra/http/routes/*.js'),
                // Include any standalone OpenAPI/Swagger YAML files
                path.resolve(__dirname, '../../openapi/**/*.yaml'),
            ],
            failOnErrors: false, // Don't crash on swagger errors
        };
    } catch (error) {
        console.error('Error creating Swagger options:', error);
        // Return a minimal definition that should work without errors
        return {
            swaggerDefinition: {
                openapi: '3.0.0',
                info: {
                    title: 'AI Fight Club API',
                    version: '1.0.0',
                    description: 'API Documentation'
                },
                paths: {}, // Empty paths object
                components: {
                    schemas: {},
                    responses: {},
                    parameters: {},
                    securitySchemes: {}
                }
            },
            apis: []
        };
    }
}
