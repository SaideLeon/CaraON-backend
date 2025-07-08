const { z } = require('zod');

const createAgentSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome do agente precisa ter no mínimo 3 caracteres.').openapi({ description: 'Nome do agente' }),
    flowId: z.string().openapi({ description: 'ID do fluxo Genkit a ser associado' }),
    persona: z.string().optional().openapi({ description: 'Persona do agente' }),
    instanceId: z.string().openapi({ description: 'ID da instância' }),
    organizationId: z.string().optional().openapi({ description: 'ID da organização (opcional)' }),
  }).openapi({ description: 'Dados para criação de um agente' }),
});

const updateAgentPersonaSchema = z.object({
    body: z.object({
        persona: z.string().min(10, 'A persona precisa ter no mínimo 10 caracteres.').openapi({ description: 'Nova persona do agente' }),
    }).openapi({ description: 'Dados para atualização da persona do agente' }),
    params: z.object({
        agentId: z.string().openapi({ description: 'ID do agente' }),
    })
});

module.exports = {
  createAgentSchema,
  updateAgentPersonaSchema,
};
