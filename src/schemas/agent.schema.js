const { z } = require('zod');

const updateAgentPersonaSchema = z.object({
    body: z.object({
        persona: z.string().min(10, 'A persona precisa ter no mínimo 10 caracteres.'),
    }),
    params: z.object({
        agentId: z.string(),
    })
});

const createParentAgentSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'O nome do agente precisa ter no mínimo 3 caracteres.'),
        persona: z.string().min(10, 'A persona precisa ter no mínimo 10 caracteres.'),
    }),
    params: z.object({
        instanceId: z.string(),
        organizationId: z.string().optional(),
    }),
});

const createChildAgentFromTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'O nome do agente precisa ter no mínimo 3 caracteres.'),
        templateId: z.string(),
        customPersona: z.string().optional(),
    }),
    params: z.object({
        parentAgentId: z.string(),
    }),
});

const createCustomChildAgentSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'O nome do agente precisa ter no mínimo 3 caracteres.'),
        persona: z.string().min(10, 'A persona precisa ter no mínimo 10 caracteres.'),
        toolIds: z.array(z.string()).optional(),
    }),
    params: z.object({
        parentAgentId: z.string(),
    }),
});

const listChildAgentsSchema = z.object({
    params: z.object({
        parentAgentId: z.string(),
    }),
});

const exportAgentAnalyticsSchema = z.object({
    query: z.object({
        instanceId: z.string(),
        organizationId: z.string().optional(),
    }),
});

const getAgentByIdSchema = z.object({
    params: z.object({
        agentId: z.string(),
    }),
});

const listParentAgentsSchema = z.object({
    params: z.object({
        instanceId: z.string(),
    }),
});


module.exports = {
  updateAgentPersonaSchema,
  createParentAgentSchema,
  createChildAgentFromTemplateSchema,
  createCustomChildAgentSchema,
  listChildAgentsSchema,
  exportAgentAnalyticsSchema,
  getAgentByIdSchema,
  listParentAgentsSchema,
};