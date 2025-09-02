import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Estende os métodos do Zod com suporte ao OpenAPI (.openapi())
extendZodWithOpenApi(z);

// Instância única do registry (importada pelos schemas para registrar)
import { registry } from './openapi.registry.js';

// Importação dos schemas — cada um deve usar `registry.register(...)` internamente
import '../schemas/agent.schema.js';
import '../schemas/brand.schema.js';
import '../schemas/cart.schema.js';
import '../schemas/category.schema.js';
import '../schemas/instance.schema.js';
import '../schemas/order.schema.js';
import '../schemas/organization.schema.js';
import '../schemas/product.schema.js';
import '../schemas/template.schema.js';
import '../schemas/tool.schema.js';
import '../schemas/user.schema.js';
import '../schemas/message.schema.js';
import '../schemas/contact.schema.js';
import '../schemas/knowledge.schema.js';

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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

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

export default generateOpenApi;
