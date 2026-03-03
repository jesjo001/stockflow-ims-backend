import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './config/env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StockFlow IMS API',
      version: '1.0.0',
      description: 'Inventory Management System REST API',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Development server',
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
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

export const specs = swaggerJsdoc(options);
