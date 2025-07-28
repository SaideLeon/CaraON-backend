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

registry.register('Instance', instanceSchema);

export {
  instanceActionSchema,
  instanceSchema,
};