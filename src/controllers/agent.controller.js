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

registry.registerPath({
    method: 'get',
    path: '/agents',
    summary: 'Lista todos os agentes de uma instância',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    request: {
        query: z.object({
            instanceId: z.string().openapi({ description: 'ID da instância para filtrar os agentes' }),
        }),
    },
    responses: {
        200: {
            description: 'Lista de agentes',
            content: {
                'application/json': {
                    schema: z.array(z.object({
                        id: z.string(),
                        name: z.string(),
                        flowId: z.string(),
                        persona: z.string().nullable(),
                        instanceId: z.string(),
                        organizationId: z.string().nullable(),
                    })),
                },
            },
        },
        404: { description: 'Instância não encontrada' },
    },
});

exports.listAgents = async (req, res) => {
    const { instanceId } = req.query;

    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        const agents = await prisma.agent.findMany({
            where: { instanceId },
        });

        res.status(200).json(agents);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao listar os agentes.' });
    }
};
