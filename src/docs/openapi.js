const { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { z } = require('zod');
const path = require('path');

// Estende os métodos do Zod com suporte ao OpenAPI (.openapi())
extendZodWithOpenApi(z);

// Instância única do registry (importada pelos schemas para registrar)
const { registry } = require('./openapi.registry');

// Importação dos schemas — cada um deve usar `registry.register(...)` internamente
require('../schemas/agent.schema');
require('../schemas/brand.schema');
require('../schemas/cart.schema');
require('../schemas/category.schema');
require('../schemas/instance.schema');
require('../schemas/order.schema');
require('../schemas/organization.schema');
require('../schemas/product.schema');
require('../schemas/template.schema');
require('../schemas/tool.schema');
require('../schemas/user.schema');
require('../schemas/message.schema');
require('../schemas/contact.schema');

/**
 * Gera a documentação OpenAPI e monta o middleware Swagger.
 * @param {import('express').Application} app
 * @param {Array<{url: string, description: string}>} servers
 */
function generateOpenApi(app, servers) {
  // 1. Gera as definições dos schemas a partir do Zod
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const zodSchemas = generator.generateComponents();

  // 2. Configura o swagger-jsdoc para ler os comentários JSDoc
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'CaraON API',
        version: '1.0.0',
        description: 'Documentação da API CaraON para gerenciamento de instâncias, agentes e produtos.',
      },
      servers,
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: [path.resolve(__dirname, '../api/*.js')], // Caminho para os arquivos de rotas
  };

  const jsdocSpec = swaggerJsdoc(options);

  // 3. Mescla as duas especificações
  const openApiSpec = {
    ...jsdocSpec,
    components: {
      ...jsdocSpec.components,
      ...zodSchemas.components, // Adiciona os schemas do Zod
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };


  // Rota da documentação Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

module.exports = {
  generateOpenApi,
};
