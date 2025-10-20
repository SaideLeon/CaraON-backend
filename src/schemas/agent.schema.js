import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);



const getSessionsSchema = z.object({
  query: z.object({
    instance_id: z.string(),
    whatsapp_number: z.string().optional(),
  }),
});

const getConversationSchema = z.object({
  params: z.object({
    session_id: z.string(),
  }),
});

const uploadPdfSchema = z.object({
  params: z.object({
    user_id: z.string(),
    instance_id: z.string(),
  }),
});



export {
  getSessionsSchema,
  getConversationSchema,
  uploadPdfSchema,
};
