const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { registry } = require('../docs/openapi');
const { createAgentSchema, updateAgentPersonaSchema } = require('../schemas/agent.schema');
const { z } = require('zod');

registry.registerPath({
    method: 'post',
    path: '/agents',
    summary: 'Cria um novo agente para uma instância ou organização',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: createAgentSchema.shape.body,
                },
            },
        },
    },
    responses: {
        201: { description: 'Agente criado com sucesso' },
        404: { description: 'Instância ou Organização não encontrada' },
    },
});

exports.createAgent = async (req, res) => {
    const { name, flowId, persona, instanceId, organizationId } = req.body;

    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        if (organizationId) {
            const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
            if (!organization) {
                return res.status(404).json({ error: 'Organização não encontrada' });
            }
        }

        const agent = await prisma.agent.create({
            data: { name, flowId, persona, instanceId, organizationId },
        });

        res.status(201).json(agent);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao criar o agente.' });
    }
};

registry.registerPath({
    method: 'patch',
    path: '/agents/{agentId}/persona',
    summary: 'Atualiza a persona de um agente existente',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ agentId: z.string() }),
        body: {
            content: {
                'application/json': {
                    schema: updateAgentPersonaSchema.shape.body,
                },
            },
        },
    },
    responses: {
        200: { description: 'Persona do agente atualizada com sucesso' },
        404: { description: 'Agente não encontrado' },
        400: { description: 'Dados de entrada inválidos' },
    },
});

exports.updateAgentPersona = async (req, res) => {
    const { agentId } = req.params;
    const { persona } = req.body;

    try {
        const agent = await prisma.agent.update({
            where: { id: agentId },
            data: { persona },
        });
        res.status(200).json(agent);
    } catch (error) {
        if (error.code === 'P2025') { // Not Found error from Prisma
            return res.status(404).json({ error: 'Agente não encontrado.' });
        }
        res.status(500).json({ error: 'Falha ao atualizar a persona do agente.' });
    }
};
