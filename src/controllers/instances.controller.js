import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import * as whatsappService from '../services/whatsapp.service.js'; 
import * as ariacService from '../services/ariac.service.js';

const createInstance = async (req, res) => {
  const { name } = req.body;
  const { userId } = req.user; // Obtém o userId do token

  try {
    const instance = await prisma.instance.create({
      data: {
        name,
        clientId: `${userId}-${Date.now()}`,
        userId: userId,
      },
    });

    const hierarchyData = {
      user_id: userId,
      instance_id: instance.id,
      router_instructions: "Analise cada mensagem do usuário e escolha o agente mais adequado com base no objetivo da solicitação. Se a mensagem envolver análise de ações, preços de ações, notícias de empresas ou informações financeiras, encaminhe para o 'Analista Financeiro'. Se a mensagem envolver busca geral de informações, fatos, notícias não relacionadas a finanças ou pesquisa na web, encaminhe para o 'Pesquisador Web'. Caso o pedido seja ambíguo, use o bom senso para decidir qual agente trará mais valor ao usuário. Nunca use mais de um agente ao mesmo tempo para a mesma solicitação.",
      agents: [
        {
          name: "Analista Financeiro",
          role: "Especialista em análise de ações e dados financeiros.",
          model_provider: "GEMINI",
          model_id: "gemini-1.5-flash",
          tools: [
            {
              type: "YFINANCE",
              config: {
                stock_price: true,
                company_news: true
              }
            }
          ]
        },
        {
          name: "Pesquisador Web",
          role: "Especialista em buscar informações na web.",
          model_provider: "GEMINI",
          model_id: "gemini-1.5-flash",
          tools: [
            {
              type: "DUCKDUCKGO"
            }
          ]
        }
      ]
    };

    await ariacService.updateAgentHierarchy(hierarchyData);


    // Inicia a instância do WhatsApp em segundo plano
    whatsappService.startInstance(instance.clientId);

    res.status(201).json({
      message: 'Instância e roteador padrão criados com sucesso. Aguarde o QR Code via WebSocket.',
      instance,
    });
  } catch (error) {
    console.error('Erro ao criar instância e roteador padrão:', error);
    res.status(500).json({ error: 'Falha ao criar a instância.' });
  }
};

const listInstances = async (req, res) => {
  const instances = await prisma.instance.findMany({
    where: { userId: req.user.userId }
  });
  res.json(instances);
};

const reconnectInstance = async (req, res) => {
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

const disconnectInstance = async (req, res) => {
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

const getInstanceStatus = async (req, res) => {
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

const deleteInstance = async (req, res) => {
  const { instanceId } = req.validatedData.params;
  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Primeiro, desconecta o cliente para evitar que ele tente atualizar o status depois da deleção
    await whatsappService.disconnectInstance(instance.clientId, true); // Passa true para indicar que a instância está sendo deletada

    // Envolve a lógica de deleção em uma transação
    await prisma.$transaction(async (tx) => {
      // 1. Desvincula as relações de hierarquia e roteamento dos agentes
      await tx.agent.updateMany({
        where: { instanceId: instanceId },
        data: {
          parentAgentId: null,
          routerAgentId: null,
        },
      });

      // 2. Deleta todos os agentes associados à instância
      await tx.agent.deleteMany({
        where: { instanceId: instanceId },
      });

      // 3. Deleta a instância
      await tx.instance.delete({
        where: { id: instanceId },
      });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
    // Adiciona uma verificação para o caso de o erro ser o registro não encontrado, o que pode acontecer em uma race condition
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Instância não encontrada.' });
    }
    res.status(500).json({ error: 'Falha ao deletar a instância.' });
  }
};

export default {
  createInstance,
  listInstances,
  reconnectInstance,
  disconnectInstance,
  getInstanceStatus,
  deleteInstance,
};
