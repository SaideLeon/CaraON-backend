const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const CreateParentAgentBody = z.object({
  name: z.string().min(3, 'O nome do agente é obrigatório.'),
  persona: z.string().min(20, 'A persona precisa ter no mínimo 20 caracteres.'),
});

const createParentAgentSchema = z.object({
  body: CreateParentAgentBody.openapi({refId: 'CreateParentAgentBody'}),
  params: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido'),
    organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de organização inválido').optional(),
  }),
});

const CreateChildAgentFromTemplateBody = z.object({
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de template inválido'),
  name: z.string().min(3, 'O nome do agente é obrigatório.'),
  persona: z.string().min(20, 'A persona precisa ter no mínimo 20 caracteres.').optional(),
});

const createChildAgentFromTemplateSchema = z.object({
  body: CreateChildAgentFromTemplateBody.openapi({refId: 'CreateChildAgentFromTemplateBody'}),
  params: z.object({
    parentAgentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente pai inválido'),
  }),
});

const CreateCustomChildAgentBody = z.object({
  name: z.string().min(3, 'O nome do agente é obrigatório.'),
  persona: z.string().min(20, 'A persona precisa ter no mínimo 20 caracteres.'),
  tools: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de ferramenta inválido')).optional(),
});

const createCustomChildAgentSchema = z.object({
  body: CreateCustomChildAgentBody.openapi({refId: 'CreateCustomChildAgentBody'}),
  params: z.object({
    parentAgentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente pai inválido'),
  }),
});

const listChildAgentsSchema = z.object({
  params: z.object({
    parentAgentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente pai inválido'),
  }),
});

const UpdateAgentPersonaBody = z.object({
  persona: z.string().min(20, 'A nova persona precisa ter no mínimo 20 caracteres.'),
});

const updateAgentPersonaSchema = z.object({
  body: UpdateAgentPersonaBody.openapi({refId: 'UpdateAgentPersonaBody'}),
  params: z.object({
    agentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente inválido'),
  }),
});

const UpdateAgentBody = z.object({
  name: z.string().min(3, 'O nome do agente é obrigatório.').optional(),
  persona: z.string().min(20, 'A persona precisa ter no mínimo 20 caracteres.').optional(),
  priority: z.number().int('A prioridade deve ser um número inteiro.').optional(),
});

const updateAgentSchema = z.object({
  body: UpdateAgentBody.openapi({refId: 'UpdateAgentBody'}),
  params: z.object({
    agentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente inválido'),
  }),
});

const exportAgentAnalyticsSchema = z.object({
  query: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido'),
    organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de organização inválido').optional(),
  }),
});

const getAgentByIdSchema = z.object({
  params: z.object({
    agentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente inválido'),
  }),
});

const listParentAgentsSchema = z.object({
  params: z.object({
    instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido'),
  }),
});

const deleteAgentSchema = z.object({
  params: z.object({
    agentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente inválido'),
  }),
});


registry.register('CreateParentAgentBody', CreateParentAgentBody);
registry.register('CreateChildAgentFromTemplateBody', CreateChildAgentFromTemplateBody);
registry.register('CreateCustomChildAgentBody', CreateCustomChildAgentBody);
registry.register('UpdateAgentPersonaBody', UpdateAgentPersonaBody);
registry.register('UpdateAgentBody', UpdateAgentBody);


module.exports = {
  createParentAgentSchema,
  createChildAgentFromTemplateSchema,
  createCustomChildAgentSchema,
  listChildAgentsSchema,
  updateAgentPersonaSchema,
  updateAgentSchema,
  exportAgentAnalyticsSchema,
  getAgentByIdSchema,
  listParentAgentsSchema,
  deleteAgentSchema,
};