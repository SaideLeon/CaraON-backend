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
        params: z.object({ instanceId: z.string() }),
        body: {
            content: {
                'application/json': {
                    schema: createOrganizationSchema.shape.body,
                },
            },
        },
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
