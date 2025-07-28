import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const instanceActionSchema = z.object({
  params: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido.'),
  }),
});

const instanceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  instanceId: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi({ refId: 'Instance' });

// New schema for createInstance
const CreateInstanceBody = z.object({
  name: z.string().min(3, 'O nome da instância precisa ter no mínimo 3 caracteres.'),
});

const createInstanceSchema = z.object({
  body: CreateInstanceBody.openapi({ refId: 'CreateInstance' }),
});

registry.register('Instance', instanceSchema);
registry.register('CreateInstance', CreateInstanceBody); // Register the new schema

export {
  instanceActionSchema,
  instanceSchema,
  createInstanceSchema, // Export the new schema
};