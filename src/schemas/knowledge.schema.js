import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const uploadPdfSchema = z.object({
  params: z.object({
    userId: z.string(),
    instanceId: z.string(),
  }),
});

export {
  uploadPdfSchema,
};
