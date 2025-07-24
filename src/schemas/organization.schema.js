const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const CreateOrganizationBody = z.object({
    name: z.string().min(3, 'O nome da organização precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome da organização' }),
});

const createOrganizationSchema = z.object({
  body: CreateOrganizationBody.openapi({ refId: 'CreateOrganization' }),
  params: z.object({
    instanceId: z.string(),
  }),
});

const listOrganizationsSchema = z.object({
  params: z.object({
    instanceId: z.string(),
  }),
});

registry.register('CreateOrganization', CreateOrganizationBody);

module.exports = {
  createOrganizationSchema,
  listOrganizationsSchema,
};