import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const listContactsSchema = z.object({
  params: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(20),
  }),
});

const ContactSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  phoneNumber: z.string(),
  name: z.string().optional(),
  pushName: z.string().optional(),
  createdAt: z.string().datetime(),
}).openapi('Contact');

registry.register('Contact', ContactSchema);

export {
  listContactsSchema,
};
