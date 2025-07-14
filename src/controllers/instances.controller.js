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
                        status: z.string(),
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

registry.registerPath({
    method: 'post',
    path: '/instances/{instanceId}/reconnect',
    summary: 'Reconecta uma instância do WhatsApp',
    tags: ['Instances'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ instanceId: z.string() }),
    },
    responses: {
        200: { description: 'Reconexão iniciada. Aguarde o QR Code se necessário.' },
        404: { description: 'Instância não encontrada' },
        500: { description: 'Falha ao reconectar a instância' }
    }
});

exports.reconnectInstance = async (req, res) => {
    const { instanceId } = req.params;
    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance || instance.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        await whatsappService.startInstance(instance.clientId);

        res.status(200).json({ message: 'Reconexão iniciada. Aguarde o QR Code se necessário.' });
    } catch (error) {
        console.error('Erro ao reconectar instância:', error);
        res.status(500).json({ error: 'Falha ao reconectar a instância.' });
    }
};

registry.registerPath({
    method: 'post',
    path: '/instances/{instanceId}/disconnect',
    summary: 'Desconecta uma instância do WhatsApp',
    tags: ['Instances'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ instanceId: z.string() }),
    },
    responses: {
        200: { description: 'Instância desconectada com sucesso' },
        404: { description: 'Instância não encontrada' },
        500: { description: 'Falha ao desconectar a instância' }
    }
});

exports.disconnectInstance = async (req, res) => {
    const { instanceId } = req.params;
    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance || instance.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        const disconnected = await whatsappService.disconnectInstance(instance.clientId);
        if (disconnected) {
            res.status(200).json({ message: 'Instância desconectada com sucesso' });
        } else {
            res.status(404).json({ error: 'Instância não estava ativa ou não foi encontrada' });
        }
    } catch (error) {
        console.error('Erro ao desconectar instância:', error);
        res.status(500).json({ error: 'Falha ao desconectar a instância.' });
    }
};

registry.registerPath({
    method: 'get',
    path: '/instances/{instanceId}/status',
    summary: 'Obtém o status de uma instância do WhatsApp',
    tags: ['Instances'],
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ instanceId: z.string() }),
    },
    responses: {
        200: {
            description: 'Status da instância',
            content: {
                'application/json': {
                    schema: z.object({
                        status: z.string(),
                        message: z.string().optional(),
                    }),
                },
            },
        },
        404: { description: 'Instância não encontrada' },
        500: { description: 'Falha ao obter o status da instância' },
    },
});

exports.getInstanceStatus = async (req, res) => {
    const { instanceId } = req.params;
    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance || instance.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        res.status(200).json({ status: instance.status });
    } catch (error) {
        console.error('Erro ao obter status da instância:', error);
        res.status(500).json({ error: 'Falha ao obter o status da instância.' });
    }
}; 