/**
 * Bundled API Endpoints
 * Provides a default set of API endpoints for testing
 */
import { Endpoint, EndpointParameter } from '../types/modules';

export const bundledEndpoints: Endpoint[] = [
  {
    id: 'health',
    name: 'API Health',
    category: 'System',
    description: 'Check the health status of the API',
    path: '/api/v1/health',
    method: 'GET',
    parameters: [],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['health', 'system']
  },
  {
    id: 'status',
    name: 'API Status',
    category: 'System',
    description: 'Get detailed status of the API and its dependencies',
    path: '/api/v1/status',
    method: 'GET',
    parameters: [],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['system']
  },
  {
    id: 'users-list',
    name: 'List Users',
    category: 'Users',
    description: 'Get a list of all users',
    path: '/api/v1/users',
    method: 'GET',
    parameters: [
      {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        type: 'integer',
        default: 1
      },
      {
        name: 'limit',
        in: 'query',
        description: 'Number of users per page',
        required: false,
        type: 'integer',
        default: 10
      }
    ],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['users']
  },
  {
    id: 'users-get',
    name: 'Get User',
    category: 'Users',
    description: 'Get a specific user by ID',
    path: '/api/v1/users/{id}',
    method: 'GET',
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'User ID',
        required: true,
        type: 'string'
      }
    ],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['users']
  },
  {
    id: 'users-create',
    name: 'Create User',
    category: 'Users',
    description: 'Create a new user',
    path: '/api/v1/users',
    method: 'POST',
    parameters: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'User name',
                example: 'John Doe'
              },
              email: {
                type: 'string',
                description: 'User email',
                example: 'john@example.com'
              },
              role: {
                type: 'string',
                description: 'User role',
                enum: ['admin', 'user'],
                example: 'user'
              }
            },
            required: ['name', 'email']
          }
        }
      }
    },
    headers: {},
    responseExample: null,
    requiresAuth: false,
    tags: ['users']
  },
  {
    id: 'products-list',
    name: 'List Products',
    category: 'Products',
    description: 'Get a list of all products',
    path: '/api/v1/products',
    method: 'GET',
    parameters: [
      {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        type: 'integer',
        default: 1
      },
      {
        name: 'limit',
        in: 'query',
        description: 'Number of products per page',
        required: false,
        type: 'integer',
        default: 10
      },
      {
        name: 'category',
        in: 'query',
        description: 'Filter by category',
        required: false,
        type: 'string'
      }
    ],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['products']
  },
  {
    id: 'products-get',
    name: 'Get Product',
    category: 'Products',
    description: 'Get a specific product by ID',
    path: '/api/v1/products/{id}',
    method: 'GET',
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'Product ID',
        required: true,
        type: 'string'
      }
    ],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['products']
  },
  {
    id: 'products-create',
    name: 'Create Product',
    category: 'Products',
    description: 'Create a new product',
    path: '/api/v1/products',
    method: 'POST',
    parameters: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Product name',
                example: 'Smartphone X1'
              },
              description: {
                type: 'string',
                description: 'Product description',
                example: 'The latest smartphone with advanced features'
              },
              price: {
                type: 'number',
                description: 'Product price',
                example: 999.99
              },
              category: {
                type: 'string',
                description: 'Product category',
                example: 'Electronics'
              }
            },
            required: ['name', 'price']
          }
        }
      }
    },
    headers: {},
    responseExample: null,
    requiresAuth: false,
    tags: ['products']
  },
  {
    id: 'orders-list',
    name: 'List Orders',
    category: 'Orders',
    description: 'Get a list of all orders',
    path: '/api/v1/orders',
    method: 'GET',
    parameters: [
      {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        type: 'integer',
        default: 1
      },
      {
        name: 'limit',
        in: 'query',
        description: 'Number of orders per page',
        required: false,
        type: 'integer',
        default: 10
      },
      {
        name: 'userId',
        in: 'query',
        description: 'Filter by user ID',
        required: false,
        type: 'string'
      },
      {
        name: 'status',
        in: 'query',
        description: 'Filter by order status',
        required: false,
        type: 'string',
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
      }
    ],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['orders']
  },
  {
    id: 'orders-get',
    name: 'Get Order',
    category: 'Orders',
    description: 'Get a specific order by ID',
    path: '/api/v1/orders/{id}',
    method: 'GET',
    parameters: [
      {
        name: 'id',
        in: 'path',
        description: 'Order ID',
        required: true,
        type: 'string'
      }
    ],
    headers: {},
    requestBody: null,
    responseExample: null,
    requiresAuth: false,
    tags: ['orders']
  },
  {
    id: 'orders-create',
    name: 'Create Order',
    category: 'Orders',
    description: 'Create a new order',
    path: '/api/v1/orders',
    method: 'POST',
    parameters: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID',
                example: 'usr_123456'
              },
              items: {
                type: 'array',
                description: 'Order items',
                items: {
                  type: 'object',
                  properties: {
                    productId: {
                      type: 'string',
                      description: 'Product ID',
                      example: 'prod_123456'
                    },
                    quantity: {
                      type: 'integer',
                      description: 'Quantity',
                      example: 1
                    },
                    price: {
                      type: 'number',
                      description: 'Price per unit',
                      example: 999.99
                    }
                  },
                  required: ['productId', 'quantity']
                }
              },
              shippingAddress: {
                type: 'object',
                description: 'Shipping address',
                properties: {
                  street: {
                    type: 'string',
                    description: 'Street address',
                    example: '123 Main St'
                  },
                  city: {
                    type: 'string',
                    description: 'City',
                    example: 'San Francisco'
                  },
                  state: {
                    type: 'string',
                    description: 'State/Province',
                    example: 'CA'
                  },
                  postalCode: {
                    type: 'string',
                    description: 'Postal code',
                    example: '94105'
                  },
                  country: {
                    type: 'string',
                    description: 'Country',
                    example: 'USA'
                  }
                },
                required: ['street', 'city', 'country']
              }
            },
            required: ['userId', 'items']
          }
        }
      }
    },
    headers: {},
    responseExample: null,
    requiresAuth: false,
    tags: ['orders']
  }
]; 