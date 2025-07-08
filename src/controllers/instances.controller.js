const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsappService = require('../services/whatsapp.service');
const { registry } = require('../docs/openapi');
const { z } = require('zod');

registry.registerPath({
    method: 'post',
    path: '/new/instance',
    summary: 'Cria uma nova instância do WhatsApp',
    tags: ['Instances'],
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.object({ name: z.string() })
                }
            }
        }
    },
    responses: {
        201: { description: 'Instância criada com sucesso' },
        500: { description: 'Falha ao criar a instância' }
    }
});

exports.createInstance = async (req, res) => {
  const { name } = req.body;
  try {
    const instance = await prisma.instance.create({
      data: {
        name,
        clientId: `${req.user.userId}-${Date.now()}`,
        userId: req.user.userId,
      },
    });

    // Inicia a instância do WhatsApp em segundo plano
    whatsappService.startInstance(instance.clientId);

    res.status(201).json({
      message: 'Instância criada com sucesso. Aguarde o QR Code via WebSocket.',
      instance,
    });
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({ error: 'Falha ao criar a instância.' });
  }
};

registry.registerPath({
    method: 'get',
    path: '/user/instances',
    summary: 'Lista as instâncias do usuário autenticado',
    tags: ['Instances'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: { 
            description: 'Lista de instâncias',
            content: {
                'application/json': {
                    schema: z.array(z.object({
                        id: z.string(),
                        name: z.string(),
                        clientId: z.string(),
                        userId: z.string(),
                    }))
                }
            }
        }
    }
});

exports.listInstances = async (req, res) => {
    const instances = await prisma.instance.findMany({
      where: { userId: req.user.userId }
    });
    res.json(instances);
  };