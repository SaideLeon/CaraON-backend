const { z } = require('zod');

const instanceActionSchema = z.object({
  params: z.object({
    instanceId: z.string(),
  }),
});

module.exports = {
  instanceActionSchema,
};
