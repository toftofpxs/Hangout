import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Events API',
      version: '1.0.0',
      description: 'API pour la gestion des événements et des inscriptions',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Serveur de développement'
      },
      {
        url: 'http://localhost:5000',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token pour l\'authentification'
        }
      },
      schemas: {
        Event: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            title: {
              type: 'string',
              example: 'Conférence Tech'
            },
            description: {
              type: 'string',
              example: 'Une conférence sur les dernières technologies'
            },
            date: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-15T10:00:00Z'
            },
            location: {
              type: 'string',
              example: 'Paris, France'
            },
            capacity: {
              type: 'integer',
              example: 100
            },
            organizer_id: {
              type: 'integer',
              example: 1
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'organizer', 'admin'],
              example: 'user'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Erreur du serveur'
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js'
  ]
}

export const specs = swaggerJsdoc(options)
