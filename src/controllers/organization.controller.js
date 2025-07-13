const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { registry } = require('../docs/openapi');
const { createOrganizationSchema } = require('../schemas/organization.schema');
const { z } = require('zod');

registry.registerPath({
    method: 'post',
    path: '/instances/{instanceId}/organizations',
    summary: 'Cria uma nova organização em uma instância',
    tags: ['Organizations'],
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: createOrganizationSchema.shape.body,
                },
            },
        },
        params: createOrganizationSchema.shape.params,
    },
    responses: {
        201: { description: 'Organização criada com sucesso' },
        404: { description: 'Instância não encontrada' },
    },
});

exports.createOrganization = async (req, res) => {
    const { instanceId } = req.params;
    const { name } = req.body;

    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        const organization = await prisma.organization.create({
            data: { name, instanceId },
        });

        res.status(201).json(organization);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao criar a organização.' });
    }
};

registry.registerPath({
    method: 'get',
    path: '/instances/{instanceId}/organizations',
    summary: 'Lista todas as organizações de uma instância',
    tags: ['Organizations'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ instanceId: z.string() }),
    },
    responses: {
        200: {
            description: 'Lista de organizações',
            content: {
                'application/json': {
                    schema: z.array(z.object({
                        id: z.string(),
                        name: z.string(),
                        instanceId: z.string(),
                    })),
                },
            },
        },
        404: { description: 'Instância não encontrada' },
    },
});

exports.listOrganizations = async (req, res) => {
    const { instanceId } = req.params;

    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        const organizations = await prisma.organization.findMany({
            where: { instanceId },
        });

        res.status(200).json(organizations);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao listar as organizações.' });
    }
};
