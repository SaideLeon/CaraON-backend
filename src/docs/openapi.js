const swaggerUi = require('swagger-ui-express');
const { OpenApiGeneratorV3, OpenAPIRegistry } = require('@asteasolutions/zod-to-openapi');

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

function generateOpenApi(app) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const docs = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'CaraON API',
      description: 'Documentação da API do CaraON',
    },
    servers: [{ url: '/api/v1' }],
    security: [{ bearerAuth: [] }],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(docs));
}

module.exports = {
  registry,
  generateOpenApi,
};