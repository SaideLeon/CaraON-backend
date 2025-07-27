const { z } = require('zod');
const { registry } = require('../docs/openapi.registry');
const { extendZodWithOpenApi } = require('@asteasolutions/zod-to-openapi');

extendZodWithOpenApi(z);

const AgentTypeEnum = z.enum(['ROUTER', 'PARENT', 'CHILD']);

const CreateAgentBody = z.object({
  name: z.string().min(3, 'O nome do agente é obrigatório.'),
  persona: z.string().min(10, 'A persona precisa ter no mínimo 10 caracteres.'),
  type: AgentTypeEnum,
  instanceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de instância inválido').optional(),
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de organização inválido').optional(),
  parentAgentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de agente pai inválido').optional(),
  toolIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de ferramenta inválido')).optional(),
});

const createAgentSchema = z.object({
    body: CreateAgentBody.openapi({refId: 'CreateAgentBody'}),
}).superRefine((data, ctx) => {
    if (data.body.type === 'ROUTER' && !data.body.instanceId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'instanceId é obrigatório para agentes do tipo ROUTER',
            path: ['body', 'instanceId'],
        });
    }
    if (data.body.type === 'PARENT' && (!data.body.instanceId || !data.body.organizationId)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'instanceId e organizationId são obrigatórios para agentes do tipo PARENT',
            path: ['body', 'organizationId'],
        });
    }
    if (data.body.type === 'CHILD' && !data.body.parentAgentId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'parentAgentId é obrigatório para agentes do tipo CHILD',
            path: ['body', 'parentAgentId'],
        });
    }
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


registry.register('CreateAgentBody', CreateAgentBody);
registry.register('UpdateAgentPersonaBody', UpdateAgentPersonaBody);
registry.register('UpdateAgentBody', UpdateAgentBody);


module.exports = {
  createAgentSchema,
  listChildAgentsSchema,
  updateAgentPersonaSchema,
  updateAgentSchema,
  exportAgentAnalyticsSchema,
  getAgentByIdSchema,
  listParentAgentsSchema,
  deleteAgentSchema,
};