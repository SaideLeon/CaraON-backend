const { z } = require('zod');

const instanceActionSchema = z.object({
  params: z.object({
    instanceId: z.string().openapi({ description: 'ID da instância' }),
  }),
});

module.exports = {
  instanceActionSchema,
};
