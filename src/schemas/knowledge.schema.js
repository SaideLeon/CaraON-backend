import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const uploadPdfSchema = z.object({
  params: z.object({
    organizationId: z.string(),
  }),
});

export {
  uploadPdfSchema,
};
