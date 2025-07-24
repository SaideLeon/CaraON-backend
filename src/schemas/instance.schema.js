const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const instanceActionSchema = z.object({
  params: z.object({
    instanceId: z.string(),
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

module.exports = {
  instanceActionSchema,
  instanceSchema,
};