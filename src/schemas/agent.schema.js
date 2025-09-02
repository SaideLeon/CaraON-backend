import { z } from 'zod';
import { registry } from '../docs/openapi.registry.js';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const AriacToolSchema = z.object({
  type: z.string(),
  config: z.record(z.any()).optional().nullable(),
}).openapi('AriacTool');

const AriacAgentSchema = z.object({
  name: z.string(),
  role: z.string(),
  model_provider: z.string(),
  model_id: z.string(),
  tools: z.array(AriacToolSchema).optional(),
}).openapi('AriacAgent');

const UpdateHierarchyBody = z.object({
  instance_id: z.string().openapi({description: "O ID da instância a ser atualizada."}),
  router_instructions: z.string(),
  agents: z.array(AriacAgentSchema),
}).openapi({refId: 'UpdateHierarchyBody'});

const updateHierarchySchema = z.object({
  body: UpdateHierarchyBody,
});

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

registry.register('UpdateHierarchyBody', UpdateHierarchyBody);
registry.register('AriacAgent', AriacAgentSchema);
registry.register('AriacTool', AriacToolSchema);

export {
  updateHierarchySchema,
  getSessionsSchema,
  getConversationSchema,
  uploadPdfSchema,
};
