const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const whatsappService = require('../services/whatsapp.service'); 

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

exports.listInstances = async (req, res) => {
    const instances = await prisma.instance.findMany({
      where: { userId: req.user.userId }
    });
    res.json(instances);
  };

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

exports.deleteInstance = async (req, res) => {
    const { instanceId } = req.params;
    try {
        const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!instance || instance.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Instância não encontrada' });
        }

        await whatsappService.disconnectInstance(instance.clientId);
        await prisma.instance.delete({ where: { id: instanceId } });

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar instância:', error);
        res.status(500).json({ error: 'Falha ao deletar a instância.' });
    }
};