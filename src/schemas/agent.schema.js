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
  instanceId: z.string().openapi({description: "O ID da instância a ser atualizada."}),
  router_instructions: z.string(),
  agents: z.array(AriacAgentSchema),
}).openapi({refId: 'UpdateHierarchyBody'});

const updateHierarchySchema = z.object({
  body: UpdateHierarchyBody,
});

registry.register('UpdateHierarchyBody', UpdateHierarchyBody);
registry.register('AriacAgent', AriacAgentSchema);
registry.register('AriacTool', AriacToolSchema);

export {
  updateHierarchySchema,
};
