const { OpenApiGeneratorV3 } = require('@asteasolutions/zod-to-openapi');

const registry = new OpenApiGeneratorV3({
  openapi: '3.0.0',
  info: {
    title: 'CaraON API',
    version: '1.0.0',
    description: 'Documentação da API CaraON',
  },
  security: [
    {
      bearerAuth: [],
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
});

function generateOpenApi(app, swaggerUi) {
  const openApiSpec = registry.generate();
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

module.exports = {
  registry,
  generateOpenApi,
};