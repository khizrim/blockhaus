import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import type { apiRouter } from '../api';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blockhaus API',
      version: '1.0.0',
      description: 'API documentation for Blockhaus',
    },
    servers: [
      {
        url: 'http://friday-night-push-blockhau-40.ya-praktikum.tech:3001/api/v1',
      },
    ],
  },
  apis: ['./api/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (router: typeof apiRouter) => {
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
