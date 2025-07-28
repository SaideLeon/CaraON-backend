import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const CreateOrganizationBody = z.object({
  name: z.string().min(3, 'O nome da organização precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome da organização' }),
});

const createOrganizationSchema = z.object({
  body: CreateOrganizationBody.openapi({ refId: 'CreateOrganization' }),
  params: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido.'),
  }),
});

const listOrganizationsSchema = z.object({
  params: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido.'),
  }),
});

registry.register('CreateOrganization', CreateOrganizationBody);

export {
  createOrganizationSchema,
  listOrganizationsSchema,
};