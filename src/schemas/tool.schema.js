import { z } from 'zod';

const toolTypeEnum = z.enum(['DATABASE', 'API', 'WEBHOOK', 'GENKIT_FLOW', 'CUSTOM']);

const databaseConfigSchema = z.object({
  connectionString: z.string().min(1, 'A string de conexão é obrigatória para ferramentas de banco de dados.'),
  collection: z.string().min(1, 'A coleção é obrigatória para ferramentas de banco de dados.'),
  query: z.string().optional(),
});

const apiConfigSchema = z.object({
  endpoint: z.string().url('O endpoint deve ser uma URL válida para ferramentas de API.'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.record(z.any()).optional(),
});

const webhookConfigSchema = z.object({
  url: z.string().url('A URL deve ser válida para ferramentas de webhook.'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
});

const genkitFlowConfigSchema = z.object({
  flowName: z.string().min(1, 'O nome do fluxo Genkit é obrigatório.'),
});

const customConfigSchema = z.record(z.any()).optional();

const createToolSchema = z.object({
  body: z.discriminatedUnion('type', [
    z.object({
      name: z.string().min(3, 'O nome da ferramenta é obrigatório.'),
      description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.'),
      type: z.literal(toolTypeEnum.enum.DATABASE),
      config: databaseConfigSchema,
    }),
    z.object({
      name: z.string().min(3, 'O nome da ferramenta é obrigatório.'),
      description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.'),
      type: z.literal(toolTypeEnum.enum.API),
      config: apiConfigSchema,
    }),
    z.object({
      name: z.string().min(3, 'O nome da ferramenta é obrigatório.'),
      description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.'),
      type: z.literal(toolTypeEnum.enum.WEBHOOK),
      config: webhookConfigSchema,
    }),
    z.object({
      name: z.string().min(3, 'O nome da ferramenta é obrigatório.'),
      description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.'),
      type: z.literal(toolTypeEnum.enum.GENKIT_FLOW),
      config: genkitFlowConfigSchema,
    }),
    z.object({
      name: z.string().min(3, 'O nome da ferramenta é obrigatório.'),
      description: z.string().min(10, 'A descrição precisa ter no mínimo 10 caracteres.'),
      type: z.literal(toolTypeEnum.enum.CUSTOM),
      config: customConfigSchema,
    }),
  ]),
});

const toolIdParamSchema = z.object({
  params: z.object({
    toolId: z.string(),
  }),
});


export {
  createToolSchema,
  toolIdParamSchema
};
